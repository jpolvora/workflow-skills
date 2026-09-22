---
slug: us-395
step: 5
workflowId: us-395-20260922T080709Z
status: completed
verificationScore: 10
minVerifyScore: 9
startedAt: "2026-09-22T13:45:00Z"
endedAt: "2026-09-22T14:10:00Z"
acRefs: []
---
# Check-Implementation Report — us-395

## Score: 10 / 10 (bar: 9)

## AC coverage

| AC | Implemented in | Evidence | Verdict |
|----|----------------|----------|---------|
| AC1 | `ws-shared/runtime/scripts/workflow_state.cjs` terminal-shape close | `test-terminal-close-us395.js`: close step finished `skipped` with all steps terminal closes; no telemetry file existed before the finish | PASS |
| AC2 | `ws-monitor/scripts/monitor_snapshot.cjs` derived terminal status | `test-ws-monitor-us395.js`: terminal-shaped run reports `completed`, `activeCount` 0 | PASS |
| AC3 | `ws-spec-multi/PROTOCOL.md` + `STATE.md` retirement; monitor lineage | eval id 4; `test-ws-monitor-us395.js` older-superseded-run case | PASS |
| AC4 | `ws-spec-multi/STATE.md` in-place/frozen count (extends #393) | `test-ws-monitor-us395.js` one-row-per-item table parse | PASS |
| AC5 | `ws-spec-multi/PROTOCOL.md` Phase 4b/5 handoff + parent `updatedAt` | `test-ws-monitor-us395.js` completed-child / in_progress parent row | PASS |
| AC6 | `stale-parent-row` finding | `test-ws-monitor-us395.js`: terminal run + phantom rows; child-terminal; shared-lineage | PASS |
| AC7 | `terminal-run-active` finding | `test-ws-monitor-us395.js` + live `us-243` specimen | PASS |
| AC8 | writer idempotency guard | `test-terminal-close-us395.js`: re-apply keeps status/`endedAt` | PASS |
| AC9 | suite + harness | `npm run test` 0 (117/117); `test-harness-clean.js` 0 findings; monitor fixture covers both codes | PASS |

## Live-specimen observation (read-only)

`node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --repo-root . --json` (exit 0):

- Case 1 `us-243-20260826T052032Z`: `terminal-run-active`; reported status derived `completed` (not counted active).
- Case 2 `ms-20260919T231639Z`: `stale-parent-row` (newer active run `ms-20260919T232556Z` claims the same `in_progress` slug).
- Case 3 `ms-20260922T022801Z`: `stale-parent-row` (completed run retains 2 phantom `pending` rows).
- No terminal-shaped run reported `active`.

## Negative scenarios

| NS | Result |
|----|--------|
| NS1 all-terminal run stays active | Prevented: writer closes; monitor derives terminal + flags (AC1/AC2/AC7) |
| NS2 telemetry-gated close | Not gated: close is terminal-coverage based (AC1) |
| NS3 two active runs on one item | Retirement documented; monitor flags the superseded run (AC3) |
| NS4 stale `pending` duplicates | In-place rows + phantom-row finding (AC4/AC6) |
| NS5 frozen parent handoff | Handoff propagation documented; monitor flags (AC5) |
| NS6 no completed-child finding | `stale-parent-row` emitted (AC6) |
| NS7 no terminal-active finding | `terminal-run-active` emitted (AC7) |
| NS8 non-idempotent re-apply | Idempotent guard verified (AC8) |
| NS9 suite/harness red | Green (AC9) |

## Verification commands (observed)

| Command | Exit |
|---------|------|
| `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | 0 |
| `node --check .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | 0 |
| `node test/test-ws-monitor-us395.js` | 0 |
| `node test/test-terminal-close-us395.js` | 0 |
| `node test/test-ws-monitor.js` / `-us385` / `-us356` | 0 |
| `node test/test-workflow-state-contract.js` | 0 |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | 0 (0 violations) |
| `node test/test-harness-clean.js` | 0 (0 findings) |
| `npm run test` | 0 (117/117) |
| `npm run verify-integrity` | 0 |
| monitor snapshot on live specimens | 0 |

No `scoreAndRefine` needed (score ≥ bar). No uncovered ACs.
