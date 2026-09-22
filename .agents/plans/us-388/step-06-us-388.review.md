---
slug: us-388
step: 6
workflowId: us-388-20260922T080709Z
status: completed
verdict: APPROVE
rounds: 1
baseCommit: 57449348
headCommit: d2111cd1
startedAt: "2026-09-22T15:55:00Z"
endedAt: "2026-09-22T16:05:00Z"
---

# Code Review — us-388

## Diff under review

`git diff 57449348...HEAD` — 2 commits (`6aa19c83` product, `d2111cd1` review-fix).

## Checklist

| Area | Result |
|------|--------|
| Scope | Bounded to `ws-monitor` + `ws-spec-multi` + tests + release mechanics; no unrelated refactor |
| Contract names | `missing-child-state` matches the `multi-spec-*` family; `expectedChildArtifacts` reuses the `expectedArtifacts` shape |
| Overlap check | `missing-child-state` (absent child state) and `stale-parent-row` (closed child / newer claim) are mutually exclusive; verified by fixture |
| Read-only | Monitor and guard only stat/read; no writes, no push, no state mutation |
| Fail-closed | Guard exits non-zero naming absent artifacts; unsafe slug and unknown `--require` refused |
| Portability | No host product names; path tokens preserved; en-us bodies |
| Node-only | No `.py`; guard is CommonJS `.cjs` |
| Docs/site/integrity | README/FEATURES synced; site rebuilt; integrity regenerated + verified |

## Findings

### F1 — Path traversal via a malformed queue slug (fixed in `d2111cd1`)

`expectedChildArtifacts` joined `plansDir` with `item.slug` directly. A corrupt queue
row whose slug contained `..` or a path separator could make the read-only scan stat
outside the plans directory. **Fix:** `isSafePlanSlug` skips slugs with `..` or a
separator before any filesystem access, matching the existing queue-guard posture.

### Non-blocking notes

- N1 — Multi-spec `expectedArtifacts` is intentionally limited to the child-state
  expectation (the AC6 blind spot). The full per-child step set is enforced by the
  Phase 5 guard and the contract docs, not duplicated in the monitor.
- N2 — `missing-child-state` is warning-class, consistent with the rest of the
  `multi-spec-*` family.

## Verdict

**APPROVE.** No open blocking findings after the review-fix commit.
