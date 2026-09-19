---
id: 353
slug: us-353
title: Harden Step 9 goal-fix loop against batch-handoff wedge and preview-only no-op
source: github
specDate: 2026-09-19
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/353"
step: 0
workflowId: us-353-20260919T043606Z
status: completed
startedAt: "2026-09-19T04:22:14.421Z"
endedAt: "2026-09-19T04:22:14.421Z"
acRefs: []
---
# Specification — Harden Step 9 goal-fix loop against batch-handoff wedge and preview-only no-op

## Description

The `ws-goal-fix-pr` session-owns-loop contract (introduced for us-347, v0.4.38) concentrates a reschedule-or-die risk in one long-lived loop session: every batch handoff requires the runtime to schedule a follow-up model turn when the batch worker result is delivered. During PR #350 fix-pr (workflow `step-baton-multi-agent-runs-20260918T232508Z`), the loop session froze after its first batch worker completed — the worker result was delivered to the session log, no model turn ever ran to process it, and the runtime recorded the loop task `completed` anyway. A freshly dispatched resume loop then no-op'd (VerboseMode preview only, zero tool calls). The parent drove batches 2–7 inline to reach merge.

This spec covers only the skill/harness-side follow-ups from issue #353. The host runtime scheduler itself (missed wakeup, contradictory roster/API states) is external to this package and out of scope; this work makes the harness resilient to it:

1. VerboseMode addendum: the Base Prompt Prefix (`ws-spec-to-pr/PROTOCOLS.md`) and `STEP-DISPATCH.md` must order the executing model to continue with tool calls in the same response and never end the turn after the preview.
2. Loop liveness watchdog: `ws-goal-fix-pr` must document parent-side wedge detection (round-log freshness / session-log mtime) and the resume-takeover procedure the parent executed manually.
3. `update_state dispatch` usage examples must show the state-path form (bare workflow-id fails with `state file not found`).
4. Worker-result payloads delivered back to loop sessions must be bounded (summaries plus artifact pointers instead of full transcripts) in the dispatch contract, so a multi-MB delivered result cannot wedge the follow-up turn.

Touched layers: skill docs under `.agents/skills/ws-goal-fix-pr/` and `.agents/skills/ws-spec-to-pr/` (`PROTOCOLS.md`, `STEP-DISPATCH.md`), plus the dispatch-contract tests that lock those wordings. No runtime, installer, or site behavior changes.

## Acceptance Criteria

- AC1: `ws-spec-to-pr/PROTOCOLS.md` Base Prompt Prefix and `STEP-DISPATCH.md` each state that after printing the VerboseMode start-of-step preview the model must immediately continue with tool calls in the same response and never end the turn after the preview.
- AC2: `ws-goal-fix-pr/SKILL.md` (or its referenced protocol file) documents a loop liveness watchdog: what signals the parent checks (round-log freshness, session-log mtime / log silence after worker-result delivery), the thresholds or checks used, and the resume-takeover procedure (fresh loop dispatch with handoff brief, fallback to parent-driven inline batches).
- AC3: All `update_state dispatch` examples reachable from the `ws-goal-fix-pr` loop path show the state-path form; no example shows a bare workflow-id invocation that fails with `state file not found`.
- AC4: The `ws-goal-fix-pr` batch-worker dispatch contract bounds the result payload delivered back to the loop session (worker writes full output to an artifact and returns a summary plus artifact pointers); the contract states a size or shape limit and where the full transcript lives.
- AC5: New or changed contract wordings are locked by dispatch/contract tests (existing `ws-goal-fix-pr` dispatch test extended or new assertions), and `npm run test` passes.
- AC6: `validate_spec.cjs --mode=authoring` passes on this spec and every changed skill doc stays en-us with no host product names and no hardcoded consumer paths.

## Original Issue Context

Source: https://github.com/jpolvora/workflow-skills/issues/353 (verbatim title and body preserved for traceability).

Title: Step 9 goal-fix loop wedged after batch worker result; resume no-op'd (preview-only)

Summary: During PR #350 fix-pr (workflow `step-baton-multi-agent-runs-20260918T232508Z`, `ws-goal-fix-pr` 0.4.38 session-owns-loop contract), the Step 9 loop session froze after its first batch worker completed: the worker result was delivered to the loop's session log, no model turn ever ran to process it, and the runtime recorded the loop task `completed` anyway. The parent could neither collect a result nor cancel the session (contradictory roster/API states). A freshly dispatched resume loop then no-op'd (VerboseMode preview only, zero tool calls). Batches 2–7 were driven inline by the parent to reach merge.

Timeline (2026-09-19 UTC):

- 00:45 Step 9 dispatched (`ws-goal-fix-pr`, PR 350, max 10, wait 300, live mode).
- ~00:47–01:06 Batch-1 worker ran fine: 5/5 threads fixed, pushed `d5465769`, wrote `PR-350-round-1.md`, persisted 3 traps.
- 01:06:36 Loop session log goes silent. Batch-1 worker result delivered (log seq 1034). Last `model_completed` is seq 1029 — before the result. Task-`completed` event recorded at seq 1035 with no loop-authored continuation (no verify, no round log, no report).
- 01:06–01:25 Parent waits time out; ping unanswered; follow-up rejected (`safe-point follow-up child run is not active`); cancel fails (`event log storage failed: session run adapter expected run stream, got session`); roster still `running`; `read_result` → `not_ready`.
- ~01:25 Resume loop dispatched with full handoff brief → returns after 1 model turn having printed only the VerboseMode preview (42 log lines, 0 tool calls).
- Parent drove batches 2–7 inline with one fresh worker per batch; PR merged `eee9fa49`.

Evidence:

- Loop session log: `subagent/01a0b720-3d22-7082-a6c8-98966b1363f7/session.jsonl` (1034 lines, 32 model turns, zero error/budget/cancel events)
- Loop agent: `01a0b720-3cfc-73a1-99a3-936b22b9add3`, task `01a0b720-3cf8-70d3-ba11-39b54dc74542`
- Batch-1 worker log: `subagent/01a0b725-6cea-7842-8bae-81fd3413a00b/session.jsonl` (~4.8 MB — large delivered result)
- Batch-1 output: commit `d5465769`, `.agents/codereviews/PR-350-round-1.md`
- Resume session: `01a0b742-9393-70b2-b6c7-546ac5d9bca9` (`subagent/01a0b742-93ad-7310-9168-600d060a308d/session.jsonl`, 42 lines / 1 turn / 0 tools)
- Loop log dir: `.agents/plans/step-baton-multi-agent-runs/runs/pr-350/` (`round-0.md` only from loop sessions; parent-written `round-{2..7}-{act,done}.md` + `final.md` after takeover)

Impact:

- v0.4.38 session-owns-loop design concentrates a reschedule-or-die risk in one long-lived session: every batch handoff requires the runtime to schedule a follow-up model turn on worker-result delivery. us-347's loop survived 4 handoffs; this run died on the first.
- Parent-side tooling gave contradictory states (running vs not-ready vs not-active), so no clean collect/kill path existed.
- The preview-only no-op recurred despite an explicit "complete in this turn" structural rule (4th instance across runs: Step 5 verify, us-347 Step 6/9, this resume).

Suspected causes (to investigate):

1. Runtime scheduling: worker result delivered to session stream but no model turn scheduled; task auto-completed on silence. Possibly related to delivered-result size (multi-MB worker log) or a missed wakeup.
2. Parent API inconsistency: roster `running` + `read_result not_ready` + follow-up/cancel rejections suggest the run handle rotated or the completion event never propagated to the owner registry.
3. Model behavior: VerboseMode "print preview before any tool call" repeatedly induces turn-yield right after the preview, now even with an explicit structural mandate to continue.

Follow-ups (skill/harness side):

- VerboseMode addendum: append "then immediately continue with tool calls in the same response; never end the turn after the preview" (`ws-spec-to-pr/PROTOCOLS.md` Base Prompt Prefix + `STEP-DISPATCH.md`).
- Loop liveness watchdog: document parent-side detection (round-log freshness / session-log mtime) and resume-takeover procedure in `ws-goal-fix-pr` (what the parent did manually here).
- `update_state dispatch` usage: bare workflow-id fails with `state file not found` (loop hit this, self-corrected to the state path). Show the state-path form in examples.
- Consider bounding worker-result payloads delivered back to loop sessions (summaries + artifact pointers instead of full transcripts).

Workaround (used here): Parent ran the loop inline: fresh `list-threads` + `check-pr-status` per round, one fresh `fixPrPlan→fixPrExec` worker per batch, per-batch audit + telemetry, merge on `activeThreads == 0` with green checks. Do not ping a fix worker mid-batch — one ping reply terminated a worker turn early (batch 3 needed a continuation worker).

Environment: Package 0.4.37 → 0.4.38 (bump inside this run), `ws-goal-fix-pr` 0.4.38, `ws-spec-to-pr` 0.4.37. Providers: active `local`, scm `github`; Tier 1 `subagent_spawn`; models `muse-spark`. PR: #350 (develop → main), 7 batches, 19/19 threads closed, merged `eee9fa49`.

### Prior Work Sweep

- Open PR for the same tracker id (issue #353) in `jpolvora/workflow-skills`: none — `gh pr list --state open` returns empty; no same-issue PR exists, so no stop/reuse gate. Proceed.
- `git log --grep` sweep: session-owns-loop contract introduced by `7440d018 feat(us-347): ws-goal-fix-pr orchestrator dispatch` (merged via #349); goal-fix pre-merge gate fixes `53843c20`, `6a8b6d23`; carve-out assertion trap `2026-09-18-carveout-needs-same-batch-assertions.md`; whole-file-sweep ownership trap `2026-09-18-restated-ownership-whole-file-sweep.md`; preview-only turn trap `2026-09-18-subagent-turn-continuation.md`; worker-turn guard coercion trap `2026-09-19-guard-null-zero-coercion.md`. Related work continues; no duplicate PR for this spec.
- `gh search issues 353` hits are other repositories (global search scope) — no related upstream work item; continue.

### Design Intent

The session-owns-loop design (us-347, commit `7440d018`) is an intentional architecture choice, not an accidental gap: one long-lived loop session owns batch sequencing. The wedge was a host-runtime scheduling failure (missed follow-up turn + contradictory roster/API states), external to this package. This spec hardens the harness around that failure mode (prompt addendum, watchdog docs, example fixes, payload bounding) without redesigning loop ownership.

## Notes

- Runtime-scheduler and parent-API fixes belong to the host, not this package; any wording that implies host behavior changes must be framed as parent-side procedure, not as a guarantee.
- The "do not ping a fix worker mid-batch" lesson from the workaround should be preserved wherever the watchdog/takeover procedure is documented.
- Memory traps to honor during implementation: `2026-09-18-subagent-turn-continuation` (never end turn after preview), `2026-09-18-restated-ownership-whole-file-sweep` (restate changed ownership in every section that states it), `2026-09-18-carveout-needs-same-batch-assertions` (lock new contract branches with same-batch assertions), `2026-09-19-guard-null-zero-coercion` (strict `toolCalls === 0` checks).
- Stack: `node-skills-package` — `typescript-node.md` invariants apply to touched scripts/tests (no floating promises, no unchecked `any`, boundary input validation, path containment, resource cleanup).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Host runtime scheduler / roster API fixes | External to this package; cannot be changed from skill docs |
| Redesigning session-owns-loop ownership | Intentional us-347 architecture; this spec hardens around it |
| Site / installer / config-schema changes | No new config keys or install behavior implied by the follow-ups |
| Version bump or changelog edits | Owned by the ship/release process, not this spec |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Payload bound can be enforced by contract prose + tests | Worker returns summary + artifact pointers; full transcript stays in artifact files | Loop sessions cannot enforce byte limits on delivery; convention plus tests is the available lever | y |
| Watchdog thresholds are documentary guidance | Time/mtime freshness checks described without hard real-time guarantees | Host timing varies; hard thresholds would be untestable | y |
| typescript-node invariants cover touched JS tests | Apply stack rule pack to new/changed scripts | Package scripts run under Node 22 per stack definition | y |
| Implicit dimensions not present (auth, idempotency, concurrency, TTL, external deps, state transitions) | N/A because skill-doc hardening has no service surface, callers, retries, or persisted state transitions | No absent-dimension ACs invented | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `ws-goal-fix-pr` + `ws-spec-to-pr` protocol/dispatch docs and their contract tests change | `git status --short` shows no files outside those trees |
| Atomic criteria | Each AC maps to a reviewable doc/test diff | Step 5 traces each AC to changed lines |
| Failure modes covered | Preview-only recurrence, silent wedge, bare-id dispatch failure, oversized payload each have an AC | Negative scenarios list below |
| Observation telemetry | Test command, invariant scan, and authoring validation named | Run `npm run test`, `scan_stack_invariants.cjs --stack typescript-node`, `validate_spec.cjs --mode=authoring` |
| typescript-node invariants | No floating promises, no unchecked `any`, validated inputs, contained paths in touched scripts | `scan_stack_invariants.cjs --stack typescript-node` exits 0 |
| Zero open blockers | No same-issue open PR; spec validated | Prior Work Sweep above + authoring validation exit 0 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0098-us-353.spec.md` exits 0
- `node .agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs --input .agents/specs/0098-us-353.spec.md --source github` writes `.agents/plans/us-353/step-00-us-353.spec.md`
- `npm run test` passes (includes extended `ws-goal-fix-pr` dispatch/contract assertions)
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` exits 0 on touched scripts
- Step 5 verify score >= 9; Step 6 review fix → re-review; Step 7 testing report

### Negative & Failing Test Scenarios

- Preview-only regression: a dispatch prompt fixture containing the preview line without the continuation mandate fails the contract test (red before AC1, green after).
- Silent wedge undetected: a watchdog-procedure doc test or review checklist missing round-log/session-log freshness checks is flagged in Step 5 verification.
- Bare workflow-id dispatch: any `update_state dispatch` example without a state path fails grep-based contract assertion (red before AC3, green after).
- Oversized worker result: a batch-worker handoff fixture returning a full transcript instead of summary + pointers fails the payload-shape assertion (red before AC4, green after).
- Stack invariant violation: an async test helper with a floating promise fails the invariant scan before merge.
