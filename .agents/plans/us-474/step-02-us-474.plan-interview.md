---
step: 2
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
shared_understanding: confirmed
acRefs: []
title: Plan interview — deterministic spec-index sync filing
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T19:31:39.248Z"
---
# Plan interview — us-474

AutoMode model-inferred sweep. `check_memory_conflict.cjs` returned `force_interview: false`, `memory_missing: true` (no MEMORY traps matched the touched paths). Project-context sweep found the filing authority (`organize_specs.cjs`), the index signal readers, and the existing `[x]`-beats-`issueState` fixture (`test-spec-organizer.js` case 12) already exercising the target bug class.

## Interview registry

| id | class | section | gap | resolution | resolutionSource | status | dependsOn |
|----|-------|---------|-----|------------|------------------|--------|-----------|
| G1 | non-blocking | §2.1 | Where the index-sync filing logic lives | New `sync_index.cjs` in `ws-spec-index/scripts`, delegating filing to `organize_specs.cjs --slug --status completed --apply`; ref rewrite comes from the organizer's own atomic apply | project (organize_specs.cjs rewrites `spec:` refs in `applyRenames`) | closed | — |
| G2 | non-blocking | §2.2 | Close-verification home | Standalone `verify_close_filing.cjs` in `ws-spec-index`; invoked by Step 8 close prose rather than embedding in `ws-ship-pr/scripts/verify.cjs` | model-inferred | closed | G1 |
| G3 | non-blocking | §2.3 | Harness check placement | Dedicated `check_spec_filing.cjs` gate at Phase 5a plus a `test-harness-clean.js` row; distinct finding class from link checks | model-inferred | closed | — |
| G4 | blocking | §3 | Sync must not silently succeed when filing fails | On organizer non-zero/exception, `sync_index.cjs` returns `status:"outstanding"`, `filingOutstanding:true`, names the stale `pending/` path, exits non-zero | project (Spec AC3 + organizer fail-closed on dirty overlap) | closed | G1 |
| G5 | non-blocking | §3 | Done-log idempotency | Check for an existing row for the slug before append; re-run adds no duplicate | model-inferred | closed | G1 |
| G6 | non-blocking | §6 | Untrusted `--slug` / path containment | Reuse `isSafeSlug` + `resolveUnder` patterns from `track_index.cjs`; spawnSync arg arrays, no shell strings | project (track_index.cjs) | closed | G1 |
| G7 | blocking | §5 | Named red-test baseline for the negative scenarios | NS tests `testCloseVerifyFailsClosedOnPendingSpec`, `testSyncReportsOutstandingWhenFilingFails`, `testHarnessFlagsDoneRowWithPendingRef` defined before implementation | project (spec Negative & Failing Test Scenarios) | closed | — |
| G8 | non-blocking | §3 | Quiet path (already filed) must add no churn | Already under `completed/` → organizer returns zero renames; sync records no move and no duplicate Done-log row (AC7) | project (spec AC7) | closed | G1 |

## Shared understanding

Confirmed. `blocking_open: 0`. No acceptance-criteria sentence is overridden; spec AC1–AC7 stay authoritative.
