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

Not whole-tree verbs (explicitly allowed in their scoped form): scoped `git worktree add --detach <dir> HEAD` / `git worktree remove --force <dir>` for one fresh-verify scratch dir per injection call (created and removed inside the call; primary tree untouched), per-path
`git restore --staged -- <path>` / `git restore -- <path>`, scoped
`git reset --mixed <tag>` to a workflow checkpoint tag, `git checkout -b` /
`git checkout <branch>`, `uswf/*`-namespaced tag/branch/worktree cleanup in
`cleanup_workflow_git.cjs`, and `git apply --cached` hunk staging.

## 2b. Scratch worktrees stay scoped and temporary (fresh-verify)

`ws-fresh-verify` fault injection runs on a scratch worktree under `{worktrees-dir}/fresh-verify/` (one directory per injection call). The call creates the worktree, inverts bytes there, runs the configured test alias, restores snapshot bytes, verifies byte-identity, and removes the worktree — on every path including failures. The primary branch content is byte-identical before and after injection; `git worktree list` shows no leftover. Never run injection on the primary worktree.

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

## 5. Workflow compatibility matrix

Authoritative enumeration of every installed `ws-*` skill by concurrency
class. Every orchestrator follows this table; a skill absent from it fails
`test-git-ownership-contract.js` (add the row when shipping a new skill).

- `git-mutating`: runs or directs git write verbs (stage, commit, push,
  branch, checkout, merge, rebase, mv, apply, tag, worktree). Rule: commit
  only own paths (§1), never undo foreign work (§2), advance the baseline
  instead of resetting (§3).
- `shared-artifact-writing`: writes multi-writer artifacts (`index.PRD`,
  `*.spec.md` boards, wiki pages, `MEMORY.md` / `memory/`, changelog,
  shared plans roots). Rule: update only owned rows/sections, preserve
  foreign edits, keep re-runs idempotent.
- `read-only`: neither of the above. Owned outputs (`{plansDir}/{slug}/`
  run files, per-round review reports, generated analyses) and product
  code written as the session's own `files_touched` stay in this class.
  Rule: read shared state freely; never write outside owned outputs.

| Skill | Classes | Notes |
|-------|---------|-------|
| `ws-activity-report` | read-only | reads git log; report is an owned output |
| `ws-benchmarks` | read-only | benchmark reports are owned outputs |
| `ws-changelog` | shared-artifact-writing | appends changelog entries; exact-block dedupe |
| `ws-check-harness` | read-only | gates read the tree; detection strings are not call sites |
| `ws-check-workflows` | read-only | gates read the tree; detection strings are not call sites |
| `ws-classify-complexity` | read-only | classify file is an owned output |
| `ws-cleanup` | shared-artifact-writing | deletes disposable artifacts under shared plans roots; no git verbs |
| `ws-code-review` | read-only | reads diffs; review is an owned output |
| `ws-configure-project` | read-only | setup-time hub writes; git use is read-only detection |
| `ws-doctor` | read-only | diagnostics read the tree |
| `ws-fable-domain` | read-only | investigation only |
| `ws-fable-judge` | read-only | audit report is an owned output |
| `ws-fable-method` | read-only | investigation loop; edits are the session's own work |
| `ws-fix-pr` | git-mutating | batch fix commits + push; path-scoped staging |
| `ws-fresh-verify` | git-mutating | scratch worktree lifecycle + invert patches; byte-identical restore, always removed |
| `ws-goal-fix-pr` | git-mutating | convergence loop over fix-pr batches |
| `ws-goal-loop` | read-only | convergence primitive; no direct writes |
| `ws-implement-tasks` | read-only | product code written is the session's own `files_touched` |
| `ws-kanvas` | read-only | reads specs; board output is owned |
| `ws-megabrain` | read-only | dispatches readers; no git or shared writes |
| `ws-monitor` | read-only | read-only snapshots |
| `ws-patterns-generator` | read-only | generated patterns are owned outputs |
| `ws-plan-interview` | read-only | interview is an owned output |
| `ws-plan-to-tasks` | read-only | task files are owned outputs |
| `ws-plan-update` | read-only | deltas are owned outputs |
| `ws-plan-verify` | read-only | verification is an owned output |
| `ws-plan-write` | read-only | plan is an owned output |
| `ws-pre-daily` | read-only | reads git history; digest is an owned output |
| `ws-preview` | read-only | dry-run only |
| `ws-run-benchmark` | read-only | benchmark runs; results are owned outputs |
| `ws-secrets-leak-review` | read-only | reads staged diffs; never mutates |
| `ws-self-learning` | shared-artifact-writing | `memory/*.md` sources + generated `MEMORY.md` |
| `ws-senior-developer` | read-only | review discipline; no direct writes |
| `ws-shared` | git-mutating | canonical git recipes live here (setup/gates/tools) |
| `ws-ship-pr` | git-mutating | push + PR creation; no unowned staging |
| `ws-show-harness` | read-only | displays harness state |
| `ws-spec-archive` | shared-artifact-writing | moves plan artifacts; Archive table rows are owned |
| `ws-spec-explain` | read-only | reads specs |
| `ws-spec-format` | read-only | validates specs |
| `ws-spec-from-provider` | shared-artifact-writing | writes specs fetched from providers |
| `ws-spec-index` | shared-artifact-writing | `index.PRD` owned-row track/sync; append-only moves |
| `ws-spec-list` | read-only | lists and resumes; no artifact writes |
| `ws-spec-manager` | shared-artifact-writing | bulk spec operations |
| `ws-spec-memo` | shared-artifact-writing | vault import writes local memory; config is setup-owned |
| `ws-spec-multi` | git-mutating, shared-artifact-writing | base-branch sync + run state; children own their commits |
| `ws-spec-organizer` | git-mutating, shared-artifact-writing | `git mv` filing + `index.PRD` ref rewrites |
| `ws-spec-provider-azure-devops` | shared-artifact-writing | writes specs + workflow copies + attachments |
| `ws-spec-provider-github` | shared-artifact-writing | writes specs + workflow copies + attachments |
| `ws-spec-provider-local` | shared-artifact-writing | registers specs + workflow copies |
| `ws-spec-to-issue` | read-only | creates a remote tracker item; no local artifact and no git verbs |
| `ws-spec-to-pr` | git-mutating | commits, branches, tags, worktrees, baseline rebase |
| `ws-spec-to-pr-distributed` | git-mutating | distributed orchestrator; each step's own commit/push is path-scoped per §1-§3 |
| `ws-spec-to-pr-lite` | git-mutating | product commits, branches, tags |
| `ws-spec-translate-to-human` | read-only | companion output is owned |
| `ws-spec-update` | shared-artifact-writing | edits specs of record |
| `ws-spec-write` | shared-artifact-writing | writes specs of record |
| `ws-task-lifecycle` | read-only | lifecycle tracking; no artifact writes |
| `ws-tdah` | read-only | reply shape; no writes |
| `ws-testing` | git-mutating | sabotage uses `git apply` transiently, always reverted |
| `ws-version` | read-only | prints install scope and version; no writes |
| `ws-wiki` | shared-artifact-writing | wiki pages + watermarks; section-scoped sync |
| `ws-write-a-skill` | read-only | authors new skills; no shared writes itself |
