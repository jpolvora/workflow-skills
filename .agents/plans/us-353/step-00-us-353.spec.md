---
id: 353
slug: us-353
title: Step 9 goal-fix loop wedged after batch worker result; resume no-op'd (preview-only)
source: github
specDate: 2026-09-19
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/353"
step: 0
workflowId: us-353
status: completed
startedAt: "2026-09-19T04:22:14.421Z"
endedAt: "2026-09-19T04:22:14.421Z"
acRefs: []
---
# Specification — Step 9 goal-fix loop wedged after batch worker result; resume no-op'd (preview-only)

## Description

Harden the Step 9 `ws-goal-fix-pr` session-owns-loop contract against a loop-session wedge observed during PR #350 fix-pr (workflow `step-baton-multi-agent-runs-20260918T232508Z`). After the first batch worker completed, its result was delivered to the loop session log, **no model turn ever ran to process it**, and the runtime recorded the loop task `completed` anyway. The parent could neither collect a result nor cancel the session (roster said `running`, `read_result` said `not_ready`, follow-up and cancel were rejected). A freshly dispatched resume loop then no-op'd (VerboseMode preview only, zero tool calls). The parent drove batches 2–7 inline to reach merge (`eee9fa49`).

Agentic scope is harness-side only: `ws-goal-fix-pr` loop liveness detection plus a documented resume-takeover procedure, the shared VerboseMode addendum fix (co-owned with us-354), `update_state dispatch` state-path usage examples, and bounded worker-result payloads delivered back to loop sessions. Architecture touchpoints: `ws-goal-fix-pr/SKILL.md` (loop contract, watchdog, takeover), `ws-spec-to-pr/PROTOCOLS.md` Base Prompt Prefix + `STEP-DISPATCH.md` (preview addendum), `workflow_state.cjs` dispatch examples, and the batch-result handoff path (summaries + artifact pointers instead of full transcripts). The runtime scheduler itself (missed wakeup on worker-result delivery) is outside this package; the spec makes the loop survivable and recoverable despite it.

## Acceptance Criteria

- AC1: `ws-goal-fix-pr` documents a parent-side loop liveness watchdog (round-log freshness and/or session-log mtime thresholds, wait/timeout values) with explicit resume-takeover steps — verified by reading the skill section and following it against the PR #350 timeline.
- AC2: The shared VerboseMode addendum states the turn must continue with tool calls in the same response and never end after the preview (single rule text shared with us-354, applied in `PROTOCOLS.md` Base Prompt Prefix and `STEP-DISPATCH.md`) — verified by grep for the rule sentence in both files.
- AC3: `update_state dispatch` examples show the state-path form (bare workflow-id fails with `state file not found`) — verified by running the documented example form against a fixture state file.
- AC4: Worker-result payloads delivered back to loop sessions are bounded (summary + artifact pointers, not multi-MB full transcripts) — verified by a size cap or pointer-based handoff in the batch-result path plus a regression test with an oversized result.
- AC5: The inline-takeover procedure used here (fresh `list-threads` + `check-pr-status` per round, one fresh `fixPrPlan`→`fixPrExec` worker per batch, per-batch audit + telemetry, merge on `activeThreads == 0` with green checks) is documented as the fallback loop — verified by executing the documented steps against a fixture PR state.
- AC6: `npm run test` is green with new fixtures pinning the wedge signals (result-delivered-but-no-model-turn, contradictory roster states) so a future contract edit that drops the watchdog fails the suite.

## Original Issue Context

# Step 9 goal-fix loop wedged after batch worker result; resume no-op'd (preview-only)

## Summary

During PR #350 fix-pr (workflow `step-baton-multi-agent-runs-20260918T232508Z`, `ws-goal-fix-pr` 0.4.38 session-owns-loop contract), the Step 9 loop session froze after its first batch worker completed: the worker result was delivered to the loop's session log, **no model turn ever ran to process it**, and the runtime recorded the loop task `completed` anyway. The parent could neither collect a result nor cancel the session (contradictory roster/API states). A freshly dispatched resume loop then no-op'd (VerboseMode preview only, zero tool calls). Batches 2–7 were driven inline by the parent to reach merge.

## Timeline (2026-09-19 UTC)

- 00:45 Step 9 dispatched (`ws-goal-fix-pr`, PR 350, max 10, wait 300, live mode).
- ~00:47–01:06 Batch-1 worker ran fine: 5/5 threads fixed, pushed `d5465769`, wrote `PR-350-round-1.md`, persisted 3 traps.
- 01:06:36 Loop session log goes silent. Batch-1 worker result delivered (log seq 1034). **Last `model_completed` is seq 1029 — before the result.** Task-`completed` event recorded at seq 1035 with no loop-authored continuation (no verify, no round log, no report).
- 01:06–01:25 Parent waits time out; ping unanswered; follow-up rejected (`safe-point follow-up child run is not active`); cancel fails (`event log storage failed: session run adapter expected run stream, got session`); roster still `running`; `read_result` → `not_ready`.
- ~01:25 Resume loop dispatched with full handoff brief → returns after 1 model turn having printed only the VerboseMode preview (42 log lines, 0 tool calls).
- Parent drove batches 2–7 inline with one fresh worker per batch; PR merged `eee9fa49`.

## Evidence

- Loop session log: `subagent/01a0b720-3d22-7082-a6c8-98966b1363f7/session.jsonl` (1034 lines, 32 model turns, **zero error/budget/cancel events**)
- Loop agent: `01a0b720-3cfc-73a1-99a3-936b22b9add3`, task `01a0b720-3cf8-70d3-ba11-39b54dc74542`
- Batch-1 worker log: `subagent/01a0b725-6cea-7842-8bae-81fd3413a00b/session.jsonl` (~4.8 MB — large delivered result)
- Batch-1 output: commit `d5465769`, `.agents/codereviews/PR-350-round-1.md`
- Resume session: `01a0b742-9393-70b2-b6c7-546ac5d9bca9` (`subagent/01a0b742-93ad-7310-9168-600d060a308d/session.jsonl`, 42 lines / 1 turn / 0 tools)
- Loop log dir: `.agents/plans/step-baton-multi-agent-runs/runs/pr-350/` (`round-0.md` only from loop sessions; parent-written `round-{2..7}-{act,done}.md` + `final.md` after takeover)

## Impact

- v0.4.38 session-owns-loop design concentrates a reschedule-or-die risk in one long-lived session: every batch handoff requires the runtime to schedule a follow-up model turn on worker-result delivery. us-347's loop survived 4 handoffs; this run died on the first.
- Parent-side tooling gave contradictory states (running vs not-ready vs not-active), so no clean collect/kill path existed.
- The preview-only no-op recurred despite an explicit "complete in this turn" structural rule (4th instance across runs: Step 5 verify, us-347 Step 6/9, this resume).

## Suspected causes (to investigate)

1. **Runtime scheduling:** worker result delivered to session stream but no model turn scheduled; task auto-completed on silence. Possibly related to delivered-result size (multi-MB worker log) or a missed wakeup.
2. **Parent API inconsistency:** roster `running` + `read_result not_ready` + follow-up/cancel rejections suggest the run handle rotated or the completion event never propagated to the owner registry.
3. **Model behavior:** VerboseMode "print preview before any tool call" repeatedly induces turn-yield right after the preview, now even with an explicit structural mandate to continue.

## Follow-ups (skill/harness side)

- [ ] VerboseMode addendum: append "then immediately continue with tool calls in the same response; never end the turn after the preview" (`ws-spec-to-pr/PROTOCOLS.md` → Base Prompt Prefix + `STEP-DISPATCH.md`).
- [ ] Loop liveness watchdog: document parent-side detection (round-log freshness / session-log mtime) and resume-takeover procedure in `ws-goal-fix-pr` (what the parent did manually here).
- [ ] `update_state dispatch` usage: bare workflow-id fails with `state file not found` (loop hit this, self-corrected to the state path). Show the state-path form in examples.
- [ ] Consider bounding worker-result payloads delivered back to loop sessions (summaries + artifact pointers instead of full transcripts).

## Workaround (used here)

Parent ran the loop inline: fresh `list-threads` + `check-pr-status` per round, one fresh `fixPrPlan`→`fixPrExec` worker per batch, per-batch audit + telemetry, merge on `activeThreads == 0` with green checks. Do **not** ping a fix worker mid-batch — one ping reply terminated a worker turn early (batch 3 needed a continuation worker).

## Environment

- Package 0.4.37 → 0.4.38 (bump inside this run), `ws-goal-fix-pr` 0.4.38, `ws-spec-to-pr` 0.4.37
- Providers: active `local`, scm `github`; Tier 1 `subagent_spawn`; models `muse-spark`
- PR: #350 (develop → main), 7 batches, 19/19 threads closed, merged `eee9fa49`

### Prior Work Sweep

- Provider `sweep-prior-work` for issue 353 (keywords: goal-fix, loop, wedge, resume, no-op, batch, worker): no related PRs, no commits — no duplicate risk.
- Related open issue us-354 covers two more premature-turn failures in the same run (preview no-op + ping termination); the VerboseMode addendum change is shared — land one rule text for both specs.
- Local MEMORY hit `[2026-09-18] subagent dispatch turn-continuation after verbose preview` prescribes the structural turn rule this spec reuses for the resume-loop no-op.

### Design Intent

- The v0.4.38 session-owns-loop contract (one long-lived loop session driving all batches) is intentional; the wedge (result delivered, no model turn scheduled, task auto-completed) is an accidental runtime-scheduling gap the harness must survive, not a reason to revert the contract.
- The inline-takeover workaround (parent driving batches 2–7 with fresh workers per batch) is proven manual procedure from this run; documenting it as the fallback loop preserves intent rather than inventing new machinery.
- `update_state dispatch` failing on bare workflow-id is existing tool behavior (state-path form is the supported invocation); the spec only fixes the examples, not the tool.

## Notes

- Do not ping a fix worker mid-batch (observed terminal effect in this run — see us-354 Instance 2); the watchdog must use read-only freshness signals, never status pings into active workers.
- Keep all new contract prose host-neutral (no host product names in shipped skill bodies).
- The ~4.8 MB delivered worker log is the concrete payload-bounding case; pointers to `PR-350-round-1.md` plus commit `d5465769` carried everything the loop needed.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Model-host scheduler wakeup fixes | Runtime scheduling is outside this package; harden detection and recovery only |
| Changing the session-owns-loop architecture back to parent-driven batches | The v0.4.38 contract stays; this spec adds watchdog + fallback, not a redesign |
| Batch worker dispatch model/routing changes | Batch execution itself worked (19/19 threads closed); only loop supervision changes |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Watchdog signal (round-log freshness vs session-log mtime) | Plan picks the cheapest reliable signal; freshness of `round-{n}.md` preferred | Round logs are loop-authored proof of life; mtime is a fallback | n |
| Payload bound size for worker results | Plan sets the cap (summary + pointers above N KB) | 4.8 MB full-transcript delivery is the failure exhibit | n |
| Failure and partial-failure handling | N/A because loop state persists per-round logs; takeover resumes from last round log | Proven by batches 2–7 inline recovery | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `ws-goal-fix-pr`, dispatch addendum, state examples, result handoff only | Plan file list matches AC touchpoints |
| Atomic acceptance criteria | AC1–AC6 each independently testable | `validate_spec.cjs --mode=authoring` passes |
| Failure modes covered | Wedge (no model turn), contradictory roster states, resume no-op, oversized payload | Negative scenarios list all four |
| Observation telemetry | Watchdog signals and takeover events are named telemetry/step artifacts | Telemetry section names the signals |
| Async safety (typescript-node invariant) | No floating promises in touched `.cjs` watchdog/handoff scripts | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` |
| Zero open blockers | Watchdog signal and payload cap are plan-owned decisions | Assumptions table shows plan-owned defaults |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `round-{n}.md` freshness (or session-log mtime) as the loop proof-of-life signal with named timeout thresholds.
- Takeover event logged to step telemetry JSONL when the parent switches to inline batches.
- `zero-tool-call-failure` on resume-loop no-op (shared with us-354).
- Oversized worker-result payload triggers pointer-based handoff; `npm run test` green.

### Negative & Failing Test Scenarios

- Worker result delivered with no follow-up model turn must raise the watchdog within the documented timeout instead of wedging silently — red before, green after.
- Contradictory roster states (`running` + `not_ready` + rejected cancel) must resolve to the takeover path, never to an unkillable wait.
- Resume loop printing only the VerboseMode preview must fail fast with zero-tool-call signal.
- A multi-MB worker result must be delivered as summary + artifact pointers, with the full log reachable via path, not inline.
