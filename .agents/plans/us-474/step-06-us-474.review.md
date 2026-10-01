---
step: 6
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
acRefs: []
findings:
  critical: 0
  warning: 1
  suggestion: 2
  info: 0
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T19:51:08.673Z"
---
# Code review — us-474

Snapshot: committed diff `f49dce76` (`feat(us-474): deterministic spec-index sync filing + close verification`) plus the review-fix commit. Scope: 3 new `.cjs` helpers, 1 test suite, 4 doc/wiring edits. Adversarial two-phase review.

## Phase 1 — findings

| # | Severity | File | Finding |
|---|----------|------|---------|
| W1 | Warning | `.agents/skills/ws-spec-index/scripts/sync_index.cjs` | Ordering: the index was marked done (`[x]` + Done log) **before** the organizer filed the spec. If filing then failed, the sync reported `outstanding` but still left the index `[x]` pointing at a `pending/` ref — the exact index/tree disagreement the spec targets (requiring the close-verification backstop to catch it). |
| S1 | Suggestion | `sync_index.cjs` | `readEvidence` infers a commit from any 7–40 hex run in the result file, which can match benign hex-looking words. Low risk; step 8 normally passes `--delivery-commit` explicitly. |
| S2 | Suggestion | `sync_index.cjs` | The HUB-scripts resolver block is duplicated from peer scripts; acceptable given the existing allowlisted pattern, but a shared helper would reduce repetition. |

## Phase 1 fix

W1 fixed: `sync_index.cjs` now **files first** and only marks the index done after the organizer succeeds; a failed filing returns `outstanding` with the index untouched (`updated: []`, no ref mutation). Test `testSyncReportsOutstandingWhenFilingFails` now asserts the index is byte-unchanged on failure.

S1/S2 are non-blocking suggestions; no product change.

## Phase 2 — re-review

Re-ran `node test/test-spec-index-filing.js` (pass) and `node test/test-harness-clean.js` (0 findings). No Critical/Warning remaining.

**Verdict: clean — advance.**
