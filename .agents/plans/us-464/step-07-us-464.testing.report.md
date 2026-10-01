---
step: 7
slug: us-464
workflowId: us-464-20260930T220628Z
status: completed
acRefs: []
startedAt: "2026-09-30T22:06:28Z"
endedAt: "2026-09-30T22:30:44.400Z"
---
# Testing report — us-464

## Surface

`probe_test_surface.cjs` → `hasTestSurface: true`, alias `backendTest` = `npm run test`.
Mutation testing is not configured (`verification.mutationTest` empty, `skipMutationTesting: true`) → skipped.

## Executed

| Battery | Command | Result |
|---------|---------|--------|
| Full suite | `npm run test` | exit 0 — **156/156 entries passed** (mode=local; hub config byte-identity verified) |
| New regression suite | `node test/test-ws-monitor-us464.js` | exit 0 — `test-ws-monitor-us464: ok` |
| WS-monitor neighbors | `test-ws-monitor.js`, `-us356`, `-us388`, `-us395`, `-us385`, `-liveness`, `-us412-418`, `-watch-profile` | all exit 0 |

## Coverage of ACs

| AC | Test evidence | Result |
|----|---------------|--------|
| AC1 | `testSlugSelectsCanonicalRunIdRun`, `testSlugSelectsCanonicalLayout` | pass |
| AC2 | `testSlugIndependentOfFolderName` | pass |
| AC3 | `testSlugSelectsCanonicalLayout` | pass |
| AC4 | `testSlugSelectsSlugNamedFolder` | pass |
| AC5 | `testSlugSelectsLegacyFlatFile` | pass |
| AC6 | `testWorkflowIdBypassesSlugFilter` | pass |
| AC7 | `testUnmatchedSlugReturnsZero` | pass |

Negative scenarios NS1–NS3 are exercised by the same suite (canonical drop, unmatched-set,
slug-named + legacy retention).

## Verdict

Green. No failures, no fixes required.
