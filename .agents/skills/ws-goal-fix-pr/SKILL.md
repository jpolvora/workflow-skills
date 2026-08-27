---
name: ws-goal-fix-pr
description: PR thread convergence loop — orchestrates iterative fix-pr rounds until all open PR review threads are resolved and checks pass.
version: 0.3.42
disable-model-invocation: true
invocation_names:
  - goal-fix-pr
  - ws-goal-fix-pr
---

# ws-goal-fix-pr

> When this skill is loaded, output "ws-goal-fix-pr loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

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

Resolve per [config-resolution.md](../ws-shared/config-resolution.md).

| `providers.scm` | Provider skill | Intent used here |
|-----------------|----------------|-------------------|
| `github` | [ws-github-provider](../ws-github-provider/SKILL.md) | `list-threads`, `check-pr-status` |
| `azure-devops` | [ws-azure-devops-provider](../ws-azure-devops-provider/SKILL.md) | `list-threads`, `check-pr-status` |

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

## Steps

1. **Initialize**: restate parameters (above) and resolve `providers.scm`.
   - Done when: PR number, mode, and provider are confirmed.

2. **Initial convergence check**: call `list-threads` and check active SCM CI/code-review run status, then apply [`ws-goal-loop`](../ws-goal-loop/SKILL.md)'s configured convergence helper. If a fresh read has `activeThreads == 0` and every required check concluded successfully, exit without arming a heartbeat. Running checks poll at `defaults.convergence.minPollSec`; queued or absent runs poll at `maxPollSec`; record observed state and chosen interval in every round log.
   - Done when: `activeThreads` is confirmed either still 0 and actions completed (stop, converged) or > 0 / actions in progress (proceed to Act or wait).

3. **Act round**: invoke [ws-fix-pr](../ws-fix-pr/SKILL.md) once for `<PR-NUMBER>` with overrides active. All active threads fetched in this round form one batch and run one ordered `fixPrPlan` → `fixPrExec` pair, never one pair per thread. `fixPrPlan` must write the complete matching `plan-gate.md` before product or remote mutation; `fixPrExec` must validate and follow it, append any amendment before a deviating edit, and run the cooperative **proactive class sweep** per [`COOPERATIVE_FIX.md`](../ws-fix-pr/scripts/COOPERATIVE_FIX.md) (multi-source discovery, size gate, `defectClass` / `sourcesConsulted` / `proactiveFixed` / `proactiveSkipped`). **Forbidden:** resolve or push before both substeps have evidence, or while same-class surgical hits remain unfixed without recorded skips. Commit as `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`, resolve via provider `resolve-thread`, and `git push origin HEAD` (skip push when `dry-run`). Internal roles emit dispatch telemetry only and never finish outer Step 9.
   - Done when: the gate proves a complete `fixPrPlan` for the round batch, `fixPrExec` records proactive pass evidence and amendments/skips, approved threads are fixed or resolved with proactive report fields, and the branch is pushed unless `dry-run`.

4. **Verify**: run `config.json.verification` commands plus a `ws-code-review` diff check. Three consecutive verification failures stop the loop and escalate.
   - Done when: verification passed, or the loop has stopped and escalated.

5. **Post-round learning**: Follow [`ws-self-learning`](../ws-self-learning/SKILL.md) § Post fix-pr round. For accepted reviewer/CI defects this round (score 6–10 threads and `check-pr-status` **diff-regression** failures that we fixed): write a MEMORY trap unless a Medium+ entry already covers the class; compile. Skip writes in `dry-run`. Round report must include `Learning:` titles. **Forbidden:** `Learning: N/A` when this round fixed a valid reviewer/CI defect that was not already in MEMORY.
   - Done when: trap written and compiled, or `Learning: N/A (no new reviewer-CI trap)` is justified (no accepted defects, or duplicate MEMORY hit).

6. **Re-check & loop**: wait `<wait>` seconds, re-check SCM review/CI run completion and re-collect `activeThreads`, repeating from step 3 until `activeThreads == 0` with all checks completed, `max` is reached, escalation occurs, or the user aborts.
   - Done when: one of the stop conditions above is met.

7. **Pre-merge verification gate**: When the Step 6 stop condition is convergence (`activeThreads == 0`), call `list-threads` one final time and confirm the payload's `activeThreads` array is empty. Both providers report only unresolved threads (`fetch_threads.cjs` filters by `isResolved`; `fix_pr_azure_context.py` filters by `status`), so an empty array is the evidence that every thread is resolved. This is a **hard gate** — do not hand off to the caller until this verification passes with evidence; if `activeThreads` is non-empty, return to step 3. If the stop condition was `max` reached, escalation, or user abort, skip this gate and proceed to step 8 (final report) so the caller decides.
   - Done when: `list-threads` payload shows `activeThreads: []` (no unresolved threads), or the loop exited via `max`/escalation/abort and the final report records the remaining threads.

8. **Final report**: always output: iterations executed and stop condition; threads handled per round (fixed / resolved / escalated); `Learning:` titles per round; links to round reports (`{reviewsDir}/PR-<N>-round-*.md`; `{reviewsDir}` ← `config.reviews.dir`); commit hashes and push confirmation; final `activeThreads` count with evidence from step 7; PR URL; and the merge handoff note (this skill never merges: the caller merges only after `activeThreads == 0` and required checks are green).
   - Done when: the report is presented to the user.

## Subagent contract

- Re-collect provider threads and required-check state before every decision.
- Use the configured adaptive interval and record observed state plus chosen wait.
- Exit immediately on a fresh clean result; do not arm a redundant heartbeat.
- Keep fixes, resolutions, commits, and pushes inside the explicitly authorized loop.
- Require one complete plan gate and one execute/proactive evidence set for each Act-round batch before resolve or push; never call `finish --step 9` from an internal role.
- After every Act round, record accepted reviewer/CI defects via `ws-self-learning` (and pattern files when those flags are on).
- Return rounds, stop condition, final active-thread evidence, remaining blockers, and `Learning:` titles.

