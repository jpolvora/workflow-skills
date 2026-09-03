# `ws-spec-multi` — Usage Examples

## 1. Blank-List Scan with Smart Flow Detection

```bash
/spec-multi
/ws-spec-multi
```

Scans pending/unfinished specs under `{specsDir}` (`plans.specsDir`, default `.agents/specs`): index `[ ]` / `[~]` and untracked files, omitting `[x]` / Done-log / already-merged items. Prompts a multi-select gate, creates `{plansDir}/ws-spec-multi/ms-20260725T220000Z.state.md` with auto-detected `baseBranch: develop`, syncs feature branches with `baseBranch` before worker dispatch, evaluates each spec's complexity (lite vs standard), and dispatches workers sequentially. Explicit `*.spec.md` args still queue those paths even if already shipped.

## 2. Explicit Spec List

```bash
/ws-spec-multi {specsDir}/13-runner.spec.md {specsDir}/14-editor.spec.md
```

Initializes run queue with specified spec paths (expand `{specsDir}` first), records `baseBranch`, auto-detects optimal flow (`lite` or `standard` per spec), syncs feature branches with `baseBranch`, and processes them sequentially.

## 3. Resume Existing Run

```bash
/ws-spec-multi {plansDir}/ws-spec-multi/ms-20260725T220000Z.state.md
```

Loads existing state file, reads recorded `baseBranch`, syncs feature branch for the next spec with `baseBranch` (`git merge {baseBranch}` or `git rebase {baseBranch}`), and resumes from the first pending or failed item without re-running shipped items.

## 4. Failure Recovery Gate

When a worker fails:
```text
Worker for '14-editor' [flowMode: standard] failed.
Options:
1. Resume (Recommended) — Re-sync feature branch with baseBranch and retry worker for 14-editor
2. Skip — Mark skipped and continue to next spec
3. Abort run — Pause execution and exit
```
