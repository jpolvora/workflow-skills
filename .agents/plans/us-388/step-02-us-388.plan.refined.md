---
slug: us-388
step: 2
workflowId: us-388-20260922T080709Z
status: refined
refinedAt: "2026-09-22T15:12:00Z"
---

# Refined Plan — us-388

## Deltas after interview

1. **Enforcement point fixed:** the guard runs at child exit (Phase 4b/5), not as a
   new state writer. `verify_child_artifacts.cjs` is read-only and fail-closed.
2. **Monitor expectation source fixed:** derive multi-spec expectations from the
   queue rows (`expectedChildArtifacts`) rather than adding a parallel detector.
3. **Scope confirmed:** no schema redesign, no artifact-naming change, no writer
   ownership change. AC1/AC2/AC3/AC7 are verified by prior work, not re-implemented.
4. **Overlap ruled out:** `missing-child-state` and `stale-parent-row` are distinct
   predicates; no code path emits both for one row.
5. **Safety added:** unsafe queue slugs (traversal / separators) are skipped before
   any filesystem access.

## Files (final)

See `step-01-us-388.plan.md` § 4 plus the review-fix commit `d2111cd1`.
