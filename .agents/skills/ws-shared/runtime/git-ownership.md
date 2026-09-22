# Git Ownership Contract — Parallel Writers on One Worktree

Shared by `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-multi`,
`ws-fix-pr` / `ws-goal-fix-pr`, `ws-ship-pr`, and the workflow git helpers.
This file is the single canonical source for the forbidden-verb list and the
baseline-advancement recipe; other docs link here instead of restating them.

A session owns exactly the repository-relative paths it edited (`files_touched`
/ surgical path sets). Every other path — including another writer's
uncommitted edits — is foreign and must stay byte-identical.

## 1. Commit only own work

Stage explicit paths from `files_touched`, minus `{plansDir}/**`, secrets,
gitignored paths, and `preExistingDirty` paths this session did not edit:

```bash
git add -- <paths>
git add -u -- <deleted-paths>
git commit -m "..."
```

The following staging forms are forbidden in every workflow commit recipe:
`git add -A`, `git add .`, bare `git add -u`, bare `git add -u --`, and
directory-wide adds (for example staging a whole source, web, or tests folder).
An empty staged set means skip the commit; never widen the path set to fill it.

## 2. Never undo foreign work

These verbs are forbidden in every workflow recipe and helper — each is listed
here with no call site anywhere in the shipped workflow surface:

- `git reset --hard`
- `git checkout -- .`
- `git restore .`
- `git clean -fd`
- whole-tree `git stash` / `git stash push` / `git stash pop` (saving all, then
  restoring, counts as whole-tree even when wrapped in a helper)
- force-push of a shared branch (`git push --force`, `git push -f`)

Not whole-tree verbs (explicitly allowed in their scoped form): per-path
`git restore --staged -- <path>` / `git restore -- <path>`, scoped
`git reset --mixed <tag>` to a workflow checkpoint tag, `git checkout -b` /
`git checkout <branch>`, `uswf/*`-namespaced tag/branch/worktree cleanup in
`cleanup_workflow_git.cjs`, and `git apply --cached` hunk staging.

## 3. Advance the baseline instead of resetting

`baselineCommit` (plus its source ref `baselineSourceRef`) in workflow state is
the commit the run integrates against. When the base branch moves ahead during
a run, refresh the recorded value to the new tip and re-integrate the session's
own commits forward — never reset back to the original baseline:

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/refresh_baseline.cjs --state {us-dir}/{workflow-id}.state.json --base-ref origin/{baseBranch}
git fetch {gitRemote} {baseBranch}
git rebase {newTip}
```

Use merge-forward instead of rebase only where the host forbids rebase. Before
either, intersect `git diff --name-only HEAD..FETCH_HEAD` with
`preExistingDirty` plus every path this session did not edit: a non-empty
intersection means another writer is mid-flight — STOP, report the overlapping
paths, and mutate nothing. Refreshing with no new upstream commits is
idempotent (no state churn, no commit).

## 4. Tolerate a dirty tree from other writers

A run must not refuse to proceed merely because the worktree is dirty, and must
not clean it. Record foreign dirty paths in `preExistingDirty` at bootstrap;
leave them on disk and loadable through every step; never stage, stash,
revert, or clean them. Verify with `git status --porcelain -- <foreign>` and
`git diff --stat -- <foreign>` before and after the run's own commit/push.

## Scope

Local git ownership only: same-worktree / same-repo concurrent writers. Out of
scope: multi-machine orchestration, automatic conflict resolution, branch
protection or merge policy, retroactive repair, new provider intents, and
worktree-isolation redesign.
