---
name: ws-goal-fix-pr
description: PR thread convergence loop — orchestrates iterative fix-pr rounds until all open PR review threads are resolved and checks pass.
version: 0.4.41
disable-model-invocation: true
invocation_names:
  - goal-fix-pr
  - ws-goal-fix-pr
---

# ws-goal-fix-pr

> When this skill is loaded, output "ws-goal-fix-pr loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

Drive PR review threads to zero by wrapping [ws-fix-pr](../ws-fix-pr/SKILL.md) in a [ws-goal-loop](../ws-goal-loop/SKILL.md): auto-approve cooperative gates and re-check threads after every push until `activeThreads == 0`.

## Invocation

Standalone:

```
/ws-goal-fix-pr <PR-NUMBER> [dry-run] [max <n>] [wait <n>]
```

Workflow (Step 9 of ws-spec-to-pr / Step 5 of ws-spec-to-pr-lite): dispatched by the orchestrator after ship creates a PR (`stopBeforeFixPr: true`); receives `PR-NUMBER` and `max` from orchestrator state.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<PR-NUMBER>` | required | Target Pull Request number |
| `dry-run` | false | Simulate fixes/resolutions; no commits, pushes, or resolve calls |
| `max <n>` | 10 | Iteration ceiling (align with `ws-ship-pr` default) |
| `wait <n>` | 300 | Post-round / pre-check wait interval in seconds |

Before executing, restate the parsed parameters: PR number, success criterion, mode, `max`, `wait`, `dry-run`, and `providers.scm`.

## SCM resolution

Resolve `providers.scm` per [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) and call `list-threads` / `check-pr-status` on that provider per [`scm-provider-contract.md`](../ws-shared/runtime/scm-provider-contract.md). Never use raw `gh`/`az`; reject `scm: "local"`.

Success criterion: `len(activeThreads) == 0` from a `list-threads` call **AND** `check-pr-status` from the configured SCM provider reports all active code reviews and CI pipelines have completed (status is completed, not `pending`, `in_progress`, or `queued`).

- Dispatch **`check-pr-status <PR-NUMBER>`** to the configured SCM provider only (no raw `gh`/`az` in this skill). Classify failed checks: **diff-regression** vs **baseline** (reproduced on `project.baseBranch`) vs **infra-flake**. One flake rerun; do not count baseline as loop progress. Baseline failures do not block convergence when reproduced on default branch and recorded.
- If any code-review or CI action is still running, continue waiting in the heartbeat loop (`wait <n>`).

## Automation overrides (vs fix-pr defaults)

| fix-pr gate | ws-goal-fix-pr behavior |
|-------------|----------------------|
| Confirmation gate (plan-gate.md) | Auto-yes: save gate file and proceed |
| Commit + resolve + push gate | Auto: execute unless `dry-run` |
| Escalate threads | Stop iteration; block until user resolves ambiguity |
| CI Auto-Fix `in_progress` | Inform user; do not auto-block |

## Goal contract guards (AC7–AC8)

This loop applies the same revision-guarded / fail-closed / resume contract as [`ws-goal-loop`](../ws-goal-loop/SKILL.md) (contract + evals; no runtime loop engine).

| Guard | Contract |
|-------|----------|
| **Revision-guarded updates (AC7)** | The fix loop carries a `revision` that increments once per accepted round. Any update carrying a **stale revision** (does not match the current round) **conflicts loudly and is never silently overwritten**: stop and surface the conflict rather than applying a stale thread/round state. Never take last-wins on a conflicting revision. |
| **Blocked verdict (AC8)** | A **blocked** (escalated) verdict is allowed only after **>= 3 consecutive rounds** with the **same concrete reason**, never before. Record the concrete reason each round; a changed reason resets the consecutive-round counter. Fewer than 3 identical rounds → keep iterating, do not escalate-blocked. |
| **Resume re-arms objective (AC8)** | Resuming the fix loop (after pause/stop) **re-arms the objective** (re-state PR number + success criterion) and **re-initializes the blocked/counter round state**, continuing from the current PR state. |
| **Runtime storage (AC7–AC8)** | Use the same `$RUNTIME_DIR/revision` and `$RUNTIME_DIR/blocked-reason` contract as [`ws-goal-loop`](../ws-goal-loop/TEMPLATES.md): prefer `{us-dir}/.runtime` (`{plansDir}/{slug}/.runtime/`). Never OS temp. Never skill-folder `runs/` under `{skillsRoot}` or `{globalSkillsRoot}` (hybrid overwrite + SoT leak). Fix-round revision increments once per accepted round; blocked reason tracks consecutive identical failure reasons. |

## Loop liveness watchdog

Parent-side detection for a wedged loop session: a batch worker result is delivered but no follow-up model turn ever runs (observed once on PR #350 — loop log silent after batch-1 delivery, task recorded `completed` with no continuation; the resume loop then printed only the VerboseMode preview with zero tool calls).

- **Signals:** round-log freshness — no new `{reviewsDir}/PR-<N>-round-*.md` after a batch worker completes — plus a stalled read-only state poll (no `currentStep`/revision advance and a `dispatch` telemetry event with no matching `finish`, per the Parent contract in [`WORKER-TURN-RULES.md`](../ws-spec-to-pr/WORKER-TURN-RULES.md)). Host-side corroboration when the host exposes run introspection: session-log mtime silence after worker-result delivery while the roster still reports the session `running`.
- **Checks:** on a suspected wedge, run a fresh provider `list-threads` plus `check-pr-status` before deciding. Contradictory states (`running` vs `not_ready` vs not-active follow-up/cancel rejections) confirm the wedge — do not keep waiting on the wedged session.
- **Resume-takeover procedure:** dispatch a fresh loop carrying the full handoff brief (PR number, success criterion, completed rounds, remaining threads). If the resume also stalls, drive the remaining batches inline on the parent: fresh `list-threads` + `check-pr-status` per round, one fresh `fixPrPlan` → `fixPrExec` worker per batch, per-batch audit + telemetry, merge only on `activeThreads == 0` with green checks. Do not ping a fix worker mid-batch — a mid-batch ping terminated a worker turn early; use read-only state polls for progress.
- **State-path dispatch:** loop-path `update_state` calls always pass the state path, never a bare workflow id:

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs dispatch \
  {plansDir}/{slug}/{workflow-id}.state.md --step 9 --model {modelName} \
  --jsonl-out {plansDir}/{slug}/telemetry.jsonl
```

A bare workflow id fails with `state file not found`.

## Steps

1. **Initialize**: restate parameters (above) and resolve `providers.scm`.
   - Done when: PR number, mode, and provider are confirmed.

2. **Initial convergence check**: call `list-threads` and check active SCM CI/code-review run status, then apply [`ws-goal-loop`](../ws-goal-loop/SKILL.md)'s configured convergence helper. If a fresh read has `activeThreads == 0` and every required check concluded successfully, exit without arming a heartbeat. Running checks poll at `defaults.convergence.minPollSec`; queued or absent runs poll at `maxPollSec`; record observed state and chosen interval in every round log.
   - Done when: `activeThreads` is confirmed either still 0 and actions completed (stop, converged) or > 0 / actions in progress (proceed to Act or wait).

3. **Act round**: on the standard dispatch path, dispatch one fresh worker per round batch through the portable `dispatch-agent` alias; the worker must invoke [ws-fix-pr](../ws-fix-pr/SKILL.md) once for `<PR-NUMBER>` with overrides active. All active threads fetched in this round form one batch and run one ordered `fixPrPlan` → `fixPrExec` pair inside that worker, never one pair per thread. `fixPrPlan` must write the complete matching `plan-gate.md` before product or remote mutation; `fixPrExec` must validate and follow it, append any amendment before a deviating edit, and run the cooperative **proactive class sweep** per [`COOPERATIVE_FIX.md`](../ws-fix-pr/scripts/COOPERATIVE_FIX.md) (multi-source discovery, size gate, `defectClass` / `sourcesConsulted` / `proactiveFixed` / `proactiveSkipped`). **Forbidden:** resolve or push before both substeps have evidence, or while same-class surgical hits remain unfixed without recorded skips. Commit as `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`, resolve via provider `resolve-thread`, and `git push origin HEAD` (skip push when `dry-run`). The skill session owns the loop inline and never authors plan gates or product fixes itself when dispatch is available (see Round-batch dispatch). Internal roles emit dispatch telemetry only and never finish outer Step 9.
   - Done when: the gate proves a complete `fixPrPlan` for the round batch, `fixPrExec` records proactive pass evidence and amendments/skips, approved threads are fixed or resolved with proactive report fields, and the branch is pushed unless `dry-run`.

4. **Verify**: run `config.json.verification` commands plus a `ws-code-review` diff check. Three consecutive verification failures stop the loop and escalate. On the standard dispatch path, batch verification evidence is produced inside the dispatched worker; the session applies this loop-level check to the worker-reported outcome. On the Lite / inline posture and the Tier 3 path (no batch worker) the session produces that evidence inline and applies this check itself.
   - Done when: verification passed, or the loop has stopped and escalated.

5. **Post-round learning**: Follow [`ws-self-learning`](../ws-self-learning/SKILL.md) § Post fix-pr round. For accepted reviewer/CI defects this round (score 6–10 threads and `check-pr-status` **diff-regression** failures that we fixed): write a MEMORY trap unless a Medium+ entry already covers the class; compile. Skip writes in `dry-run`. Round report must include `Learning:` titles. **Forbidden:** `Learning: N/A` when this round fixed a valid reviewer/CI defect that was not already in MEMORY. On the standard dispatch path, the batch worker owns the per-round MEMORY write inside its scope; the session records the worker-reported `Learning:` titles in the round log without duplicating the write. On the Lite / inline posture and the Tier 3 path (no batch worker) the session itself owns that per-round write under the same rule.
   - Done when: trap written and compiled, or `Learning: N/A (no new reviewer-CI trap)` is justified (no accepted defects, or duplicate MEMORY hit).

6. **Re-check & loop**: wait `<wait>` seconds, re-check SCM review/CI run completion and re-collect `activeThreads`, repeating from step 3 until `activeThreads == 0` with all checks completed, `max` is reached, escalation occurs, or the user aborts.
   - Done when: one of the stop conditions above is met.

7. **Pre-merge verification gate**: When the Step 6 stop condition is convergence (`activeThreads == 0`), call `list-threads` one final time and confirm the payload's `activeThreads` array is empty. Both providers report only unresolved threads (`fetch_threads.cjs` filters by `isResolved`; `fix_pr_azure_context.py` filters by `status`), so an empty array is the evidence that every thread is resolved. This is a **hard gate** — do not hand off to the caller until this verification passes with evidence; if `activeThreads` is non-empty, return to step 3. If the stop condition was `max` reached, escalation, or user abort, skip this gate and proceed to step 8 (final report) so the caller decides.
   - Done when: `list-threads` payload shows `activeThreads: []` (no unresolved threads), or the loop exited via `max`/escalation/abort and the final report records the remaining threads.

8. **Final report**: always output: iterations executed and stop condition; threads handled per round (fixed / resolved / escalated); `Learning:` titles per round; links to round reports (`{reviewsDir}/PR-<N>-round-*.md`; `{reviewsDir}` ← `config.reviews.dir`); commit hashes and push confirmation; final `activeThreads` count with evidence from step 7; PR URL; and the merge handoff note (this skill never merges: the caller merges only after `activeThreads == 0` and required checks are green).
   - Done when: the report is presented to the user.

## Round-batch dispatch

The skill session is the orchestrator: it runs initialize, convergence check, heartbeat wait, re-check, pre-merge gate, and final report inline, and never authors plan gates or product fixes itself when dispatch is available.

- **Fresh worker per round batch:** one fresh worker per round batch runs the ordered `fixPrPlan` → `fixPrExec` pair inside that worker; that worker is never reused for another round or substep instance. Dispatch through the portable `dispatch-agent` alias with discrete context pointers only (PR number, batch thread ids, gate path, round number) — never full transcripts. **Bounded handoff:** the worker writes its full output to the round artifact (`{reviewsDir}/PR-<N>-round-*.md`) and returns a summary plus artifact pointers only — never the full transcript — so an oversized delivered result cannot wedge the loop's follow-up turn.
- **Lite / inline posture:** when the caller is `ws-spec-to-pr-lite` Step 5 (or any inline-only run), do not dispatch a batch worker and ignore both role model keys; run the ordered `fixPrPlan` → `fixPrExec` pair inline on the captured session model with identical gate/learning contracts and no internal role telemetry, matching [`ws-fix-pr`](../ws-fix-pr/SKILL.md) § Internal model roles and the lite inline contract.
- **Ownership split:** on the standard dispatch path, the batch worker owns everything inside the `ws-fix-pr` batch scope (plan gate, fixes, proactive evidence, verify, round report, resolve, push). The session owns the goal-loop steps plus the final report, and never duplicates the worker's per-round `Learning:` write — it records the worker-reported `Learning:` titles in the round log. On the Lite / inline posture and the Tier 3 path (no batch worker) the session owns the batch scope itself under identical gate/learning contracts.
- **Model routing:** capture the active session model once before the first round batch and resolve both role models from that stable fallback. The [ws-fix-pr](../ws-fix-pr/SKILL.md) "Internal model roles" table is the normative chain; [STEP-DISPATCH](../ws-spec-to-pr/STEP-DISPATCH.md) prose is an abbreviated pointer only:
  - `fixPrPlan`: `stepModels.fixPrPlan` → active preset `steps.fixPrPlan` → top-level `reviewerModel` → preset `reviewerModel` → captured session model.
  - `fixPrExec`: `stepModels.fixPrExec` → active preset `steps.fixPrExec` → top-level `executionModel` → preset `executionModel` → captured session model.
  Neither role consults numeric `"9"` (that value selects only the outer Step 9 skill). `"current"` resolves immediately to the captured session model; empty values fall through. If `dispatch-agent` rejects or cannot use a configured model, retry that role under the captured session model and record `configuredModel` vs actual without aborting the batch.
- **Dispatch telemetry:** on the standard dispatch path, every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events to `telemetry.jsonl` carrying the actual model and the configured model per role. Lite/inline runs emit none (see Lite / inline posture). Internal roles emit telemetry only and never call `finish --step 9`; the outer caller owns the single outer finish.
- **Tier 3 fallback:** on hosts where `dispatch-agent` cannot dispatch (no bound subagent tool and no CLI/background runner — Tiers 1-2 unavailable per the [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md) ladder), run Tier 3 inline-isolated execution per [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md) (adopt the step persona, context pointers only, log `inline-isolated-step`) with identical gate/learning contracts, and still converge. The fallback is documented behavior, never a silent change.
- **`dry-run`:** simulate without mutation under both the dispatch path and the Tier 3 path — zero commits, zero pushes, and zero `resolve-thread` calls.

## Subagent contract

- The skill session owns the goal loop inline (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report); every Act round batch runs in a fresh worker via `dispatch-agent` (standard dispatch path; lite/inline runs execute the pair inline per `Round-batch dispatch`), and the session never authors plan gates or product fixes itself when dispatch is available.
- Re-collect provider threads and required-check state before every decision.
- Use the configured adaptive interval and record observed state plus chosen wait.
- Exit immediately on a fresh clean result; do not arm a redundant heartbeat.
- Keep fixes, resolutions, commits, and pushes inside the explicitly authorized loop.
- Require one complete plan gate and one execute/proactive evidence set for each Act-round batch before resolve or push; never call `finish --step 9` from an internal role.
- Collect each batch worker's returned summary plus artifact pointers (bounded handoff — full output stays in the round artifact); on a suspected wedge run the Loop liveness watchdog (round-log freshness / session-log mtime checks, then resume-takeover; do not ping a fix worker mid-batch).
- After every Act round, on the standard dispatch path collect the worker-reported `Learning:` titles into the round log; the batch worker owns the per-round `ws-self-learning` write (and pattern files when those flags are on), and the session never duplicates it. On the Lite / inline posture and the Tier 3 path (no batch worker) the session owns that per-round write itself under the same rule. `Learning: N/A` stays forbidden when the round fixed a valid reviewer/CI defect.
- Return rounds, stop condition, final active-thread evidence, remaining blockers, and `Learning:` titles.
- Handoff: recorded under `state.handoffs` — see [`PROTOCOLS.md`](../ws-spec-to-pr/PROTOCOLS.md) § Base Prompt Prefix.

## Fix-loop execution mode (`ws-goal-fix-pr.useSubAgents`, default inline)

One config key selects the execution site of every Act-round batch on the fix
path. Read `ws-goal-fix-pr.useSubAgents` from `{sharedDir}/config.json`
(machine helper: `resolveFixPrDispatchMode` in
`{skillsRoot}/ws-shared/runtime/scripts/workflow_state.cjs`); fix semantics are
identical in both modes — only the execution site changes.

| `useSubAgents` | Mode | Behavior |
|----------------|------|----------|
| absent or `false` (default) | **Inline legacy loop** | Run the ordered `fixPrPlan` → `fixPrExec` pair inline on the captured session model with identical gate/learning contracts and no internal role telemetry. Zero subagent dispatches per fix-loop run. |
| `true` (explicit opt-in) | **Subagent dispatch** | Dispatch one fresh worker per round batch via `dispatch-agent` per § Round-batch dispatch above, with identical gate/learning contracts. |

Rules: this single key gates the whole fix path — `ws-fix-pr` standalone
batches and `ws-ship-pr` Step 6 pre-ship convergence read the same key through
the same resolver, so there is exactly one default and no mode skew. Any
non-boolean value fails closed to inline. This section seeds the
one-parent-config-section-per-skill convention for skill-specific options.

