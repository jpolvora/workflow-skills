---
slug: us-412-413-liveness-checkpoints
title: "Testing plan (Step 7) — mid-step checkpoints, turn-boundary pause state, and monitor stall detection"
step: 7
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
status: completed
startedAt: "2026-09-24T04:31:48Z"
sourceSpec: .agents/plans/us-412-413-liveness-checkpoints/step-00-us-412-413-liveness-checkpoints.spec.md
sourcePlan: .agents/plans/us-412-413-liveness-checkpoints/step-02-us-412-413-liveness-checkpoints.plan.refined.md
productCommit: ad134fcede771d87ae058dad7f7081f782aace81
acRefs: []
---
# Testing plan (Step 7) — `us-412-413-liveness-checkpoints`

Pre-PR validation battery for the two defect classes: orchestrator mid-step checkpoints / turn-boundary pause (#413) and monitor discovery-budget / shared-correlation / pause-aware stall (#412).

## 1. Verification commands (from `config.json.verification`)

| Alias | Config key | Command | Role |
|-------|-----------|---------|------|
| `backendTest` | `verification.backendTest` | `npm run test` | Primary unit/regression gate (runs `node test/run-tests.cjs`, 128 registered suites). |
| — | `verification.backendBuild` | _(empty — no app build)_ | N/A. |
| — | `verification.frontendTest` / `frontendBuild` | _(empty)_ | N/A — no frontend. |
| — | `verification.mutationTest` | _(empty)_ | Mutation skipped (see §5). |

Coverage command exists (`npm run coverage`, c8 thresholds lines 80 / branches 68) but is not a configured `verification` alias; it is **not** part of the Step 7 gate. Base build is N/A (pure Node script/skill package; no compile step).

## 2. Changed files under test (Step 4 touch set)

| File | Change class | Covered by |
|------|--------------|-----------|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | new `checkpoint`/`pause-turn` writers; `finish` clears markers; `validateSnapshot` record checks | T1–T9 |
| `.agents/skills/ws-shared/runtime/telemetry.schema.json` | enum + `progress`/`nextAction` fields | T4 |
| `.agents/skills/ws-shared/runtime/workflow-state.schema.json` | `stepCheckpoints`/`turnPause` properties | T5, T7 |
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | discovery budget + shared window + pause/stall + `--until-terminal` | M1–M7, M9 |
| `.agents/skills/ws-spec-to-pr/SKILL.md`, `PROTOCOLS.md` | pause/resume contract prose | D1 |
| `.agents/skills/ws-monitor/SKILL.md`, `ws-shared/runtime/observer-instructions.md` | pause-vs-stall + shared window prose | M8 |
| `test/test-liveness-checkpoints.js` (new), `test/test-ws-monitor-liveness.js` (new), `test/test-suites.json` | regression suites + registration | `npm run test` |
| `README.md`, `FEATURES.md` | human docs | D2 |

Compatibility anchors that must stay green unchanged: `test-ws-monitor-us356.js` (stall / `scan-capped` / capped), `test-ws-monitor-us385/us388/us395.js`, `test-update-state-yaml.js`, `test-workflow-state-contract.js`, `test-observer-us365.js`, `test-state-observability.js`, `test-telemetry-observability.js`, `test-doc-sync.js`, `test-harness-clean.js`.

## 3. Coverage gaps vs changed files

- **No dedicated line-coverage gate** for the new writers beyond the behavioural suites; c8 coverage is available but not configured as a gate. The new operations are exercised end-to-end through the real CLI wrapper (`update_state.cjs` → `workflow_state.cjs`) and the real monitor script (`monitor_snapshot.cjs`), so the tested path is the production path.
- **`monitor_snapshot.cjs` unit vs e2e:** M2 additionally calls the exported `scanTranscriptRoots`/`resolveTranscriptSource` directly, so both the CLI report and the unit correlation are asserted.
- **Known open review findings (carried from Step 5/6, informational, non-blocking):** AC11 `intra-root-enumeration-stop` (Suggestion) and AC19 `release-bump-deferred` (Suggestion, Step 8 ship obligation). Neither is a test defect; both are recorded in the report for the ship gate.
- **Out of scope:** no browser/UI surface exists (`frontend: none`), so UI/E2E and accessibility-contrast checks are N/A.

## 4. AC checklist mapped to observable outcomes

| AC | Observable outcome | Test |
|----|--------------------|------|
| AC1 | `checkpoint` CLI exits 0; `stepCheckpoints["4"]` persists substep/units/remaining/updatedAt | T1, T8 |
| AC2 | one `checkpoint` telemetry event + `revision` +1 | T1 |
| AC3 | `pause-turn` CLI persists `turnPause {step,reason,at,nextAction}` | T2 |
| AC4 | one `turn_paused` telemetry event + `revision` +1 | T2 |
| AC5 | `finish` clears the pause marker and step checkpoint; other-step records survive | T3, T9 |
| AC6 | telemetry schema accepts both event types; rejects wrong-typed fields | T4 |
| AC7 | state schema declares fields; `validate_state.cjs` exits 0 with records present | T5 |
| AC8 | `SKILL.md` + `PROTOCOLS.md` state autoMode does not chain host turns; turn-boundary documented | D1 |
| AC9 | `pause-turn` records `nextAction` (explicit and derived) | T2 |
| AC10 | `filesScanned >= 1` despite 61 unrelated roots / >200 files | M1 |
| AC11 | per-root budget/priority reads correlated session; honest `capped` | M1, M9 |
| AC12 | scan filter and resolve share one window; scanned match resolves `available` | M2 |
| AC13 | `scan-capped` only when the matching file was not read; vocabulary unchanged | M3 |
| AC14 | `worker-session-stall` fires for idle `available` session on active workflow | M4 |
| AC15 | pause suppresses stall and reports `worker-session-paused`; resumes after clear | M5 |
| AC16 | `--until-terminal` usage errors + exit on terminal workflow | M6, M7 |
| AC17 | monitor docs cover pause-vs-stall and shared correlation window | M8 |
| AC18 | both suites registered and `npm run test` exits 0 | `npm run test` |
| AC19 | README + FEATURES describe operations, pause semantics, `--until-terminal` | D2 |

Negative scenarios NS1–NS6 are bound to M1, M2, M5, M6, T6, T7 respectively (all observed green).

## 5. Mutation testing

- `verification.mutationTest` is **empty/unset** and `defaults.skipMutationTesting` is **true**.
- Per skill § Mutation config skip rules, mutation is **skipped** for this run.
- **Status: skipped.** Reason: `defaults.skipMutationTesting: true` and empty `verification.mutationTest`. No mutation engine is vendored.

## 6. Regression sabotage (mutation skipped)

Because mutation is skipped, Step 8 requires regression sabotage against the newly added regression assertions. Primary inversion targets (per plan § Sabotage verification): M1/M2/M5 and T2/T3.

- **Helper:** `node .agents/skills/ws-testing/scripts/run_sabotage.cjs --test "npm run test" --paths <product files> --invert-patch <patch> --repo-root L:\source\workflow-skills`.
- **Declared paths (fixed code inverted):**
  - `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` — invert the `finish` marker-clearing condition so a terminating `finish` no longer clears `turnPause`/`stepCheckpoints` (drives T3/T9 red).
  - `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` — invert the pause-suppression condition so a paused workflow falls through to the stall branch and a non-paused one reports a pause (drives M4/M5 red).
- **Expected:** `npm run test` non-zero with inverted code; every declared path changes bytes; restoration byte-identical to the pre-invert snapshot on `--paths`.
- **Restore failure → abort Step 7.**

## 7. Defect-threshold pass/fail metrics

| Metric | Threshold | Result |
|--------|-----------|--------|
| `npm run test` exit code | 0 | observed |
| Registered suites passing | 128/128 | observed |
| New regression suites | both green | observed |
| Compatibility anchors (`test-ws-monitor-us356.js`, `test-workflow-state-contract.js`, …) | green | observed |
| Regression sabotage | helper exit 0 (`test-failed-as-expected`, `restored: true`) | observed |
| Mutation | skipped (policy) | observed |

Final pass verdict only when `npm run test` is green **and** neither Mutation nor Regression Sabotage is `failed`.
