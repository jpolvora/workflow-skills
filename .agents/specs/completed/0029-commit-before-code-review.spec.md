---
id: null
slug: commit-before-code-review
title: "Commit workflow product files after verify and after code-review fixes"
source: local
specDate: 2026-08-15
---

# Specification — Commit workflow product files after verify and after code-review fixes

## Description

### Problem

In `ws-spec-to-pr`, the first **required** product commit is too late (typically Step 8 ship). G2-code at Step 4 / 6-fix / 7 is optional ("Commit" under More options), so implementation often stays uncommitted through verify and local review.

`ws-code-review` diffs with `git diff --name-status {base}...HEAD`. That range is **committed work only**. Uncommitted implementer files are invisible, so the reviewer cannot audit a stable snapshot vs `config.project.baseBranch` (`main` / `master`). Implementer work and review fixes also collapse into one late commit, which hides who introduced a pattern.

### Required order (standard)

```text
Step 4 implement → Step 5 verify → G2-code (verified implementation)
  → Step 6 code-review (committed diff vs base)
  → fix loop if needed → G2-code (review fixes, if any)
  → Step 7 testing → Step 8 ship (delivery artifacts unchanged)
```

1. After Step 5 (check-implementation) **succeeds or is approved to continue**, commit workflow product files **before** dispatching Step 6.
2. Step 6 reviews **only** the committed range vs the resolved base branch.
3. After the Step 6 fix → re-review loop, if those fixes changed product files, commit again as a **separate** commit.
4. Two commits (when both apply) keep implementer output and reviewer fixes auditable.

### Dual-mode (lite)

Lite has no Step 5. Same contract at the equivalent boundary: after Step 2 implement (build/tests already in the lite implement exit criteria) **before** Step 3 `ws-code-review`; then a second G2-code after review fixes if any. Shared `ws-code-review` must not assume full vs lite step numbers.

### Staging (both orch)

Stage **only** paths the workflow created, updated, or deleted (`files_touched` from implement / verify / review-fix), plus any git-tracked deletes of those same paths.

- Path-scoped `git add` / `git add -u` on that list only.
- Never `git add -A`, `git add .`, or directory-wide `git add src/ web/ tests/`.
- Never stage `{plansDir}/**` (HS-2a). `invariants.commitPlanFilesOnlyAtStep8` stays true.
- Never stage secrets, gitignored junk, or files the workflow did not touch (leave pre-existing dirty work unstaged).
- Empty commit is forbidden: if the stage set is empty (already committed, or no product files), skip G2-code, log, and continue. Do not invent files.

### Review contract

- `{base}` = `config.project.baseBranch` (auto-detect `main`/`master` when unset). Do not hardcode `master`.
- Review uses `git diff {base}...HEAD` (committed). Do not review the dirty working tree as the primary diff.
- If uncommitted **workflow product** files remain when Step 6 / lite Step 3 would start → **STOP** (fail closed). Offer: run the post-verify (or post-implement, lite) G2-code / Pause. Do not dispatch review.
- `ws-code-review` still does **not** run `git commit`. The orchestrator owns G2-code.

### Gates

| Mode | After verify (standard) / after implement (lite) | After review-fix |
|------|--------------------------------------------------|------------------|
| Interactive | Explicit G2-code `user-gate`. Recommended: commit then advance to review. Declining while workflow product files are uncommitted → do not dispatch review (HS-1 if cancelled). | Explicit G2-code when the fix loop produced product file changes. Recommended: commit then advance. Skip if no remaining uncommitted workflow product files. |
| `autoMode` | Auto-select commit (index 0) when the stage set is non-empty; skip when empty. | Same. |
| `dryRun` | Simulate the commit (message, path list); no `git commit`. | Same. |

HS-2 still applies: no implicit commit without the G2-code gate (or auto-gate in `autoMode`). Record each real commit in `state.commits[]` (`sha`, step, message).

### Commit messages

- Post-verify (standard) / post-implement (lite): identify `{slug}` and that this is the **verified implementation** (not delivery artifacts, not review fixes).
- Post-review-fix: identify `{slug}` and that this is **code-review fixes**. One commit covering all fix rounds (max 3), not one commit per round.

### Unchanged

- Step 8 G2-delivery (`defaults.deliveryCommitArtifacts`) and G3 push/PR.
- Step 7 testing G2-code when tests/fixes produce additional product files (third class of product commit; after review-fix).
- Optional universal "Commit" under More options at other boundaries (does not replace the required post-verify / post-review-fix save points).
- No push required for local review (HEAD on `state.branch` is enough).
- `dryRun` still makes no real commits.

### Surfaces to update

| Surface | Change |
|---------|--------|
| `ws-spec-to-pr` `PROTOCOLS.md` / `STEP-DISPATCH.md` / `SKILL.md` | G2-code required after Step 5 before Step 6; required after Step 6 fix when files remain; staging = workflow `files_touched`, not `src/`/`web/`/`tests/` directories. |
| `ws-spec-to-pr-lite` `SKILL.md` | Same after Step 2 before Step 3, and after Step 3 fixes. |
| `ws-shared/gates.md` | G2-code row + auto-gate defaults for the new required save points. |
| `ws-shared/tools.md` `commit-code` | Stage explicit workflow paths; never blanket `src/ web/ tests/`. |
| `ws-code-review` | Require committed `{base}...HEAD`; fail closed if workflow product files are still uncommitted; keep "skill does not commit". |
| `ws-check-workflows` (and FAQ / orch docs as needed) | Simulations and G2-code timing match the new order. |

### Out of scope

- Committing `{plansDir}` before Step 8.
- Changing delivery-artifact include toggles or Step 8 ship UX.
- Pushing or opening a PR before Step 8 / lite Step 4.
- Per-round review-fix commits (v1 is one implementer commit + one reviewer commit).
- A config flag to restore "review uncommitted work" (this order is the pipeline default).

## Acceptance Criteria

- AC1: Standard orch runs G2-code of workflow product files after Step 5 succeeds or is approved to continue, and does not dispatch Step 6 until that commit exists or the stage set is empty (already committed / nothing to commit).
- AC2: Lite orch runs the same G2-code after Step 2 implement and before Step 3 `ws-code-review`.
- AC3: `ws-code-review` (standard Step 6 / lite Step 3) reviews `git diff {base}...HEAD` against `config.project.baseBranch` (or auto-detected `main`/`master`); it does not treat the dirty working tree as the review snapshot.
- AC4: If uncommitted workflow product files exist at review start, orch STOP (fail closed) and does not dispatch `ws-code-review`.
- AC5: After the review fix → re-review loop, if workflow product files changed, orch creates a **second** G2-code commit (one commit for all fix rounds); if the review is clean with no extra product files, no second commit.
- AC6: Each G2-code stages only workflow-touched created/updated/deleted product paths; never `git add -A` / `git add .`; never `{plansDir}/**`; never unrelated dirty files; never an empty commit.
- AC7: The two commit messages (when both exist) are distinct: verified implementation vs code-review fixes, both including `{slug}`; `state.commits[]` records both SHAs.
- AC8: `autoMode` auto-commits those G2-code points when the stage set is non-empty; `dryRun` simulates and does not call `git commit`.
- AC9: `invariants.commitPlanFilesOnlyAtStep8` and Step 8 G2-delivery / G3 ship behavior are unchanged.
- AC10: `tools.md` `commit-code`, `gates.md` G2-code, `PROTOCOLS.md` / `STEP-DISPATCH.md`, lite orch, `ws-code-review`, and `ws-check-workflows` describe the new timing and path-scoped staging (no leftover "src/web/tests only" or "first commit at Step 8" as the product-save rule).

## Notes

- Optional Step 4 G2-code under More options may still run; it does not replace AC1. If Step 4 already committed the full `files_touched` set, AC1 is a skip (no empty commit).
- Score &lt; 7 refine/replan/respec happens **before** the post-verify commit. The first required product commit is the verified (or user-approved) implementation, not a failed check.
- MEMORY: never `git add -A` when staging workflow or merge work; path-scope only.
