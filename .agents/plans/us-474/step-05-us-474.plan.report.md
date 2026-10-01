---
step: 5
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
verificationScore: 10
acRefs: []
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T19:49:19.840Z"
---
# Check-implementation report — us-474

**Score: 10/10** (earned 70/70; `knownDefect: false`, `missingEvidence: false`, no errors) at boundary `step5`.

Evaluated implementation vs `step-00-us-474.spec.md` (no refined spec). Verification alias `backendTest` (`npm run test`) observed exit 0 — all 154 test entries passed, including the new `test/test-spec-index-filing.js`.

## AC scoring

| AC | Verdict | Evidence | Test |
|----|---------|----------|------|
| AC1 sync files spec + sidecars to `completed/` | Implemented | `.agents/skills/ws-spec-index/scripts/sync_index.cjs:L238-L320`, `.agents/skills/ws-spec-organizer/scripts/organize_specs.cjs:L540-L555` | `testSyncFilesSpecAndSidecarsToCompleted` |
| AC2 index `spec:` refs rewritten in same operation | Implemented | `sync_index.cjs:L185-L236` (delegates to organizer apply that rewrites refs) | `testSyncFilesSpecAndSidecarsToCompleted` |
| AC3 filing failure reported outstanding | Implemented | `sync_index.cjs:L296-L335` | `testSyncReportsOutstandingWhenFilingFails` |
| AC4 close verification fails closed on pending spec | Implemented | `verify_close_filing.cjs:L105-L135`, `STEP-DISPATCH.md:L125` | `testCloseVerifyFailsClosedOnPendingSpec` |
| AC5 error names the stale `pending/` path | Implemented | `verify_close_filing.cjs:L138-L146` | `testCloseVerifyFailsClosedOnPendingSpec` |
| AC6 harness flags index `[x]` row pointing under `pending/` | Implemented | `check_spec_filing.cjs:L101-L150`, `PHASES.md:L492`, `test/test-harness-clean.js` | `testHarnessFlagsDoneRowWithPendingRef` |
| AC7 no re-file/gate when file and index agree | Implemented | `sync_index.cjs:L296-L328` (quiet path) | `testSyncQuietWhenAlreadyFiled` |

## Negative scenarios

| NS | Covered by |
|----|------------|
| NS1 index `[x]` + pending spec → close fails closed naming path | `testCloseVerifyFailsClosedOnPendingSpec` |
| NS2 harness flags `pending/` `spec:` ref | `testHarnessFlagsDoneRowWithPendingRef` |
| NS3 already-`completed/` spec → no churn | `testSyncQuietWhenAlreadyFiled` / `testRejectsUnsafeSlug` |

## Harness

`node test/test-harness-clean.js` gates: all Phase 5a gates green, including the new `check_spec_filing.cjs`; the repo board is clean (0 findings). Integrity regenerated after the new scripts.

## Notes

- `organize_specs.cjs` remains the single filing authority (moves `.context.md` / `.assets/` and rewrites refs atomically).
- The deterministic sync helper replaces the previously agent-only close step, so index status and tree location cannot disagree silently.
