# Exec Plan — Improve agentic code reviewers prompt

**Tasks**: `.agents/plans/improve-agentic-reviewers-prompt/step-03-improve-agentic-reviewers-prompt.tasks.md`
**execMode**: DAG (max 3 parallel)
**Date**: 2026-09-27

---

## Execution Order

### Wave 1 (sequential — 1 task)

| # | Task | Title | Files |
|---|------|-------|-------|
| 1 | T1 | Audit & design revised prompt structure | `.github/agentic-code-reviewers-prompt.md` (read), `.github/workflows/agentic-code-review.yml` (read) |

**Exit criteria**: Section keep/merge/drop table confirmed, path references verified, upstream-vs-local decision recorded, final outline ≤80 lines.

---

### Wave 2 (parallel — 2 tasks)

| # | Task | Title | Files | Depends On |
|---|------|-------|-------|------------|
| 2a | T2 | Write simplified prompt | `.github/agentic-code-reviewers-prompt.md` (write) | T1 |
| 2b | T3 | Add workflow coupling comment | `.github/workflows/agentic-code-review.yml` (edit) | T1 |

**Exit criteria**:
- T2: File ≤80 lines, all 8 high-signal gates present, §5 verbatim, en-us, current path tokens.
- T3: Comment added, no functional workflow changes.

---

### Wave 3 (sequential — 1 task)

| # | Task | Title | Files | Depends On |
|---|------|-------|-------|------------|
| 3 | T4 | Run validation suite | none (read-only) | T2, T3 |

**Exit criteria**: `npm run test` green, `check_harness_links.cjs` 0 critical, `review:dry` documented (or limitation stated), diff scope clean, line count ≤80, path grep clean.

---

## DAG Summary

```
Wave 1: [T1]
Wave 2: [T2, T3]  (parallel)
Wave 3: [T4]
```

**Total tasks**: 4
**Critical path**: T1 → T2 → T4 (3 waves)
**Parallel speedup**: T2 ∥ T3 saves 1 wave vs sequential
