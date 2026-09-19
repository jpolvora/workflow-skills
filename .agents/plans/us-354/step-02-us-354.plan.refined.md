---
slug: us-354
title: Worker turns ending prematurely mid-step force orch re-dispatch (preview no-op + ping termination)
status: completed
step: 2
workflowId: us-354-20260919T043606Z
startedAt: "2026-09-19T04:40:20.850Z"
endedAt: "2026-09-19T04:44:06.801Z"
acRefs: []
---
> Refinement deltas (Step 2 interview, round 1, blocking_open 0):
> - D1: `ws-monitor` tolerance verified by project sweep (`monitor_snapshot.cjs` type filters) — no monitor refactor; new test asserts unknown-type tolerance.
> - D2: Telemetry schema change stays additive-only (two enum members); `test-telemetry-observability.js` has no closed-enum lock.
> - D3: PROTOCOLS.md edit preserves test-locked VerboseMode substrings (`analyze THIS run`, `explicit \`true\``, ``Starting step {STEP}``, omitted-key silent) — quoter sweep asserts zero residual.
> - D4: Guard CLI uses key=value/file-path flags only (PowerShell JSON-strip trap); never inline JSON on the command line.
> - D5: All post-bootstrap state transitions via `update_state dispatch/finish`; plans-index rebuild/diff at close.
> - D6: `WORKER-TURN-RULES.md` is the single canonical copy shared with #353 (reference, do not duplicate).
> - D7: New test wired into `tests:harness-efficiency` beside step-baton tests.
---

## 0. Summary & Business Rules

Harden the orchestrator-to-worker dispatch contract so a dispatched worker turn cannot end prematurely and silently force a full re-dispatch. Two failure modes from run `step-baton-multi-agent-runs-20260918T232508Z` (PR #350): (1) preview-only no-op — a Step 5 worker printed the VerboseMode preview then ended with 1 model turn / 0 tool calls and no report; (2) ping-as-terminal-message — a parent queue-mode status ping mid-batch became the worker's terminal output, leaving fixes uncommitted.

Business rules: the harness cannot change model-host turn-termination behavior — all fixes are prompt-contract, detection-signal, and recovery-path changes. Failure signals stay host-neutral (step-output envelope + telemetry JSONL, no host product names in shipped bodies). Continuation reuses intact worktree progress; no new worktree machinery. One shared rule text across all dispatch paths (coordinate with #353, do not land two divergent copies).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): liveness probe shape is plan-owned (chosen: documented never-ping-mid-batch contract + read-only state-file poll as the sanctioned progress signal); preview-only text counts as 0 tool calls; no new external input surface (fixed contract text).

Acceptance Criteria: AC1 structural turn rule on all three dispatch paths (grep-verified); AC2 zero-tool-call non-success signal (regression test with simulated preview-only turn); AC3 unwritten-artifact non-success signal (artifact check before finish); AC4 no mid-batch ping path in parent loop (code-verified); AC5 continuation reuses intact worktree (fixture/e2e test); AC6 regression coverage pins all three failure modes (`npm run test` green).

Out of scope: model-host runtime fixes; Tier 2/3 ladder changes; full suspend/resume-from-snapshot infrastructure.

## 2. Technical Design & Architecture

New canonical rule file (single source of truth for the turn rule text):

- `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md` — portable, host-neutral: FIRST response must contain BOTH the verbose preview AND at least 2 tool calls; a response with zero tool calls ends the turn as failed delivery; final message starts with DONE plus completed/failed step-output JSON; verify required artifacts on disk before finish; parent re-dispatches once on zero-tool-call turns; continuation contract (reuse intact worktree: `git status` first, verify → commit → resolve → push → report); never-ping-mid-batch parent contract + read-only state poll as the sanctioned progress signal.

Dispatch-path wiring (all three quote the same key sentences; regression test greps each source):

1. Standard `dispatch-agent`: `PROTOCOLS.md` § Base Prompt Prefix + VerboseMode addendum append the turn rule (addendum keeps its analyze-this-run shape; the rule forbids yielding after the preview and declares the OUTPUT FORMAT example is not a valid final message on its own).
2. Step-baton coordinator: `step_coordinator.cjs` `buildWorkerPrompt()` inlines the rule lines (JS constant asserted equal to the canonical file by test — no drift); worker contract gains "parent never pings mid-turn".
3. Inline-isolated: `host-dispatch.md` §5 dispatch protocol OUTPUT FORMAT + §7 worker contract + Tier 3 steps gain the rule.

Detection signals (new single-runtime Node helper, no dual-language mirror per MEMORY trap):

- `.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs` — exports `classifyTurn({toolCalls, requiredArtifacts, usDir, step, slug, pipeline})` → `{verdict: 'completed'|'failed', signal: null|'worker_zero_tool_calls'|'worker_missing_artifact', reason}`; CLI `--step-output <file> --us-dir <dir> --step <N> [--slug S]` parses the step-output JSON block (absent envelope or `toolCalls: 0` ⇒ zero-tool-call failure), checks `finishArtifactNames()` presence on disk, prints the verdict JSON, exit 0 completed / 2 failed.
- Coordinator post-exit: parse worker stdout for the step-output envelope, run the guard, emit explicit telemetry events on failure and route to the existing WORKER_NO_FINISH retry path (fail fast with named cause instead of generic missing-finish).
- Telemetry: extend `.agents/skills/ws-shared/runtime/telemetry.schema.json` `type` enum with `worker_zero_tool_calls` and `worker_missing_artifact`; native-dispatch workers self-report via failed step-output envelope per the turn rule.

AC4 evidence: coordinator spawns with `stdio: ['ignore', ...]` (no stdin channel exists to ping through) and the loop contains no message-send to a running worker; `host-dispatch.md` §7 documents never-ping-mid-batch as the contract and the read-only state-file revision/`currentStep`/handoff poll (`pollIntervalSeconds` external-advancement detection) as the sanctioned progress signal.

AC5 evidence: coordinator retry reuses the same repo cwd with no `git reset`/`clean` on retry paths (assert in test); continuation contract in the canonical rule file.

## 3. Step-by-Step Plan

1. Add `WORKER-TURN-RULES.md` canonical rule file (host-neutral prose, no internal spec numbers per MEMORY trap; generic failure-class wording).
2. Wire the rule into `PROTOCOLS.md` (Base Prompt Prefix + VerboseMode addendum), `step_coordinator.cjs` `buildWorkerPrompt()` (+ named-signal post-exit guard routing), and `host-dispatch.md` (§5 OUTPUT FORMAT, §7 worker contract/never-ping/progress signal, Tier 3).
3. Add `worker_turn_guard.cjs` (classifyTurn + CLI) reusing `finishArtifactNames` from `workflow_state.cjs` (require, no copy).
4. Extend `telemetry.schema.json` type enum with the two new signals; confirm `ws-monitor` tolerates unknown/new types (read-only consumer — check, do not refactor).
5. Add `test/test-worker-turn-guard.js`: AC1 grep-pins on all dispatch sources + canonical-file equality; AC2 simulated preview-only turn ⇒ failed/`worker_zero_tool_calls`; AC3 unwritten-artifact ⇒ failed/`worker_missing_artifact`; AC4 no ping/message-send path in coordinator + never-ping contract present; AC5 no reset/clean on coordinator retry paths + continuation contract present; AC6 full-suite green. Wire into `package.json` `tests:harness-efficiency` next to the step-baton tests.
6. Sweep quoters of restructured contract text (MEMORY trap: grep retired phrasing across skills tree; assert zero residual).
7. Regenerate + verify integrity (`npm run generate-integrity`, `npm run verify-integrity`) from a clean skill tree; run `node test/test-harness-clean.js` (0 findings); run full `npm run test`.

## 4. Permissions, Tenancy & i18n

N/A — harness prompt-contract change; no endpoints, no tenant data, no UI strings. No new external input surface (fixed contract text only).

## 5. Test Coverage

| AC | Test case (test/test-worker-turn-guard.js) | Type |
|----|---------------------------------------------|------|
| AC1 | `turnRuleOnAllDispatchPaths` — canonical key sentences present in PROTOCOLS.md, step_coordinator.cjs, host-dispatch.md; embedded constant equals canonical file | grep/pin |
| AC2 | `previewOnlyTurnFails` — envelope-less/preview-only stdout + `toolCalls: 0` ⇒ verdict failed, signal `worker_zero_tool_calls` | unit/simulated |
| AC3 | `unwrittenArtifactFails` — report missing on disk ⇒ verdict failed, signal `worker_missing_artifact`; artifact check runs before finish resolution | unit |
| AC4 | `noMidBatchPingPath` — coordinator has no message-send to running worker (stdin ignore) + never-ping contract in host-dispatch §7 | static |
| AC5 | `continuationReusesWorktree` — no reset/clean on retry paths + continuation contract; fixture: uncommitted progress present ⇒ resume checklist reuses it | static/fixture |
| AC6 | Full `npm run test` green with new fixtures | suite |
| NS1 | Preview-only (preview text, 0 tool calls) resolves failure, never completed | negative |
| NS2 | Mid-batch ping path absent ⇒ parent emits no ping while batch worker active | negative |
| NS3 | Step report unwritten ⇒ failure, not completed | negative |
| NS4 | Continuation picks up intact worktree progress rather than starting empty | negative/fixture |

Sabotage verification: `run_sabotage.py` path (mutation unset) per ws-plan-write bugfix guidance — regression-guard class: dropping any guard sentence must fail the suite (covered by AC1 pin test).

## 6. Stack & Security Invariants Verification Plan

Stack: Node 22 skill package (`typescript-node` profile: no floating promises in touched `.cjs`; cleanup in termination handlers). Touched boundaries:

- Async safety: `worker_turn_guard.cjs` is fully synchronous (no promises at all); coordinator post-exit guard call is sync file/stdout parsing before the existing async flow resumes — run `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` on touched scripts.
- Input validation & DTO boundary: guard CLI parses flags as key=value/file paths only (no inline JSON per cross-platform contract); step-output envelope parse is try/catch with absent-envelope ⇒ failure (fail closed, never completed-by-default).
- Authorization/cleanup: no new auth surface; no subscriptions/streams.
- Config: no new config keys (uses existing `pollIntervalSeconds`, `verboseMode`); schema change is additive enum members only.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skill SoT under `.agents/skills/`, tests under `test/`).
- [ ] No host product names in shipped bodies (portable aliases only).
- [ ] No internal spec/issue numbers in portable prose (MEMORY trap).
- [ ] Stack & security invariants verified (scan clean on touched `.cjs`).
- [ ] Test cases cover all ACs + 4 negative scenarios.
- [ ] Quoter sweep after contract restructure (zero residual hits).
- [ ] Integrity regenerated + verified; harness-clean 0 findings.
- [ ] i18n N/A; migrations N/A.

## 8. Open Questions

1. Probe shape: never-ping-mid-batch contract + read-only state poll (chosen default) vs a new messaging probe — decided for the former; no external dependency, no blocker.
2. `ws-monitor` tolerance of new telemetry types — verification-only check during implementation, not a refactor.
