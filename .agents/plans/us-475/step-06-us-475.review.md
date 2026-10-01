---
step: 6
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Code review — executable foreign-commit guard
startedAt: "2026-09-30T20:36:00Z"
endedAt: "2026-09-30T20:40:00Z"
---
# Code review — us-475

Diff reviewed: `git diff bf53ad8e...HEAD` (9 files, +591/−11). Product commit `266ad05c`
plus the integrity commit `c8bbc05d`.

## Phase 1 — correctness & contract

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| R1 | Warning | `PROTOCOL.md` Phase 4 read "record the dispatch baseline … on every subsequent dispatch run check-advance", which lets the record step run before the check and makes the comparison always quiet. | Fixed: the bullet now mandates **check → (pause) → record → dispatch** order, so the check compares the *previous* dispatch's baseline before the current push is re-recorded. |
| R2 | Suggestion | `record-baseline` labelled the store with the run dir basename when the .state.md had no `runId` field. | Fixed before commit: prefers `frontmatter.runId` then `frontmatter.workflowId`. |

## Phase 2 — adversarial pass (no new criticals)

- Git-read-only: the guard's only `spawnSync('git', …)` argv verbs are `rev-parse` and `log`;
  asserted by `testGuardIsGitReadOnly`.
- Path safety: staging/injection free — argv arrays, no shell; slug validated upstream.
- Fail-closed: advance (exit 1), mismatch (exit 1), missing baseline (exit 2); quiet path exit 0.
- Scope: only the run-dir baseline sidecar is written; no `{plansDir}` commit, no product mutation.
- Edge: a `from` that is not an ancestor (force-push/rebase) makes `git log` return empty; the guard
  still reports `advanced: true` with the generic "tip moved" message — it pauses, never proceeds.

## Verdict

**Clean** after R1 fix (R2 fixed pre-commit). No Critical / Warning findings remain open.
