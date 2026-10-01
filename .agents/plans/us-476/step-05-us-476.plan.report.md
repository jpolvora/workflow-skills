---
step: 5
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
verificationScore: 10
minVerifyScore: 9
acRefs: []
startedAt: "2026-10-01T01:20:00Z"
endedAt: "2026-10-01T01:14:44.897Z"
---
# Check-implementation report — us-476

**Score: 10 / 10** (min 9). AC ledger boundary `step5`: 70/70 earned units, no deficiencies, no errors, no invariant violations.

## AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `monitor_snapshot.cjs` child-terminal branch builds `ageNote = child terminal for <age>; last row transition <age> ago` on both info and warning messages (L912–L925) |
| AC2 | Implemented | `childTerminalAgeMs <= graceMs && runAdvanced` → `info` propagation-pending; `snapshot()` passes `graceMs` and exposes `updatedAt`/`stateMtimeMs` (L912–L925, L1873–L1886) |
| AC3 | Implemented | Beyond grace (or not advancing) → `warning` "beyond the grace window" (L926–L937) |
| AC4 | Implemented | `classifyMultiSpecWorkflow` terminal-run stale rows stay `warning` (L786–L797) |
| AC5 | Implemented | Newer active run claiming the slug stays `warning` (L939–L955) |
| AC6 | Implemented | Grace defaults to `TRANSCRIPT_LIMITS.stallWindowMs` (600000), overridable via `--stall-window` / `graceMs` (L882–L888, L1873–L1886) |
| AC7 | Implemented | Non-terminal child adds no finding; child finder requires a terminal same-slug child (L872–L881) |

## Negative scenarios

| NS | Verdict | Evidence |
|----|---------|----------|
| NS1 | Covered | `us-476 NS1 fresh child no warning` — fresh child + advancing run does not warn |
| NS2 | Covered | `us-476 NS2 old child still warns` — child closed 20m ago with no transition warns |
| NS3 | Covered | `us-476 NS3 terminal run still warns` — terminal run with a non-terminal row warns |

## Verification aliases

| Alias | Command | Exit |
|-------|---------|------|
| backendTest | `npm run test` | 0 (158/158 entries pass on v0.5.30) |

Direct evidence: `node test/test-ws-monitor-us476.js` → `test-ws-monitor-us476: ok`, exit 0.

## Notes

- Full suite ran after the version bump and integrity regeneration: `run-tests: all 158 entries passed`.
- Harness: `node test/test-harness-clean.js` → `Harness OK (upstream clean) — 0 findings`.
- Read-only invariant preserved: the only new filesystem call is `fs.statSync` on the batch state file.
