---
id: null
slug: workflow-bootstrap-feature-branch
title: "Ask for feature-branch strategy at workflow bootstrap"
source: local
specDate: 2026-08-12
---

# Specification — Ask for feature-branch strategy at workflow bootstrap

## Description

### Problem

When `ws-spec-to-pr` / `ws-spec-to-pr-lite` start a **new** run, shared bootstrap ([`ws-shared/setup.md`](../skills/ws-shared/setup.md)) records git identity (`state.branch`, `baselineCommit`, checkpoint) from whatever HEAD happens to be. There is no `user-gate` asking whether this run should:

1. create a **feature branch from the current HEAD**,
2. create a **feature branch from the project base** (`main` / `master` / configured `project.baseBranch`), or
3. **stay on the current branch** because the user is already on the branch they intend to work.

Agents then implement and ship on `develop`, `main`, or an accidental leftover branch. `ws-ship-pr` still treats `config.project.workingBranch` as the PR head, which diverges from a per-feature branch the user actually wanted.

### Solution

Add a **Feature branch gate** to shared bootstrap (both standard and lite). It runs only on a **new** workflow start (not resume), after `slug` / `{us-dir}` identity is known and **before** baseline, LOC snapshot, and the `before-step-0` checkpoint, so those artifacts land on the chosen branch.

Present a `user-gate` (native structured choice when available; markdown fallback otherwise) with the current HEAD name and resolved base shown in the prompt:

```text
Git branch for this workflow (HEAD: {currentBranch}; base: {baseBranch}):

1. Create feature branch from current HEAD (Recommended when HEAD is already the intended starting point)
2. Create feature branch from {baseBranch}
3. Stay on {currentBranch} (already on the branch I want)
```

Recommended option: **1** when HEAD is not a protected/long-lived branch; **2** when HEAD is `project.baseBranch` or another protected name (`main`, `master`, `develop`, plus configured `baseBranch` / `workingBranch`). Do not silently pick; the recommended flag is UX only.

### Branch naming

Default new-branch name: `feat/{slug}` (matches existing delivery convention, e.g. `feat/refine-ws-activity-report-human-timing`).

If `feat/{slug}` already exists locally or on `{gitRemote}`:

- Offer: **Check out existing `feat/{slug}`** / **Enter a different name** / **Stay on current** / **Cancel (HS-1)**.
- Do not overwrite or reset an existing feature branch.

`{baseBranch}` is `config.project.baseBranch` (auto-detect `main`/`master` when unset, same helper `ws-ship-pr` already uses). Do not hardcode the string `master`.

### Git actions after the choice

| Choice | Action |
|--------|--------|
| Create from current HEAD | `git checkout -b feat/{slug}` (or the chosen name) from current HEAD. Uncommitted files come along (normal git behavior). |
| Create from `{baseBranch}` | Fetch `{gitRemote}/{baseBranch}` when a remote exists; create `feat/{slug}` from that tip and check it out. |
| Stay on current | No checkout/create. Record HEAD as `state.branch`. |

If creating from `{baseBranch}` and the working tree is dirty in a way that would block checkout: **STOP**. Re-present: **Stash then continue** / **Switch to create-from-current instead** / **Cancel**. Never `reset --hard`, never discard uncommitted work.

If HEAD is detached: treat "stay" as invalid; require create-from-current (names a branch at HEAD) or create-from-base.

### State and ship

- Write `state.branch` to the chosen/created branch name (existing `state.md` field).
- Record `branchStrategy: from-current | from-base | stay` and `baseBranch` in state frontmatter (or an equivalent documented key) so resume and ship do not re-ask.
- Init banner already lists `branch` / `baseBranch`; keep those rows in sync with the gate result.
- **Workflow-mode** `ws-ship-pr` (standard Step 8 / lite Step 4) MUST use `state.branch` as PR **head**, not blindly `config.project.workingBranch`. Preflight "confirm active branch is workingBranch" becomes "confirm active branch is `state.branch`". Skip `git pull` when `git ls-remote --heads` does not show that head (first-push local `feat/{slug}`); do not trust `@{u}`. Standalone `/ship-pr` without a workflow state file is unchanged (`head` still defaults to `workingBranch`).
- Do **not** rewrite `config.project.workingBranch` for this run.

### When the gate is skipped

| Situation | Behavior |
|-----------|----------|
| Resume of `active` / `paused` workflow | Skip. Use existing `state.branch`. If HEAD ≠ `state.branch`, STOP and offer checkout of `state.branch` / cancel. |
| `autoMode` | No prompt. Default: **stay on current** (no git mutation) except when detached (`HEAD`): create `feat/{slug}` from HEAD (`from-current`); never persist the literal `HEAD`. Log `branch-gate \| auto \| stay\|from-current\|checkout-existing \| {branch} \| ISO`. |
| `dryRun` | Show the gate (or auto default) and the git commands that **would** run; do not create or switch branches. |
| `ws-multi-spec` worker | Same as any new orch bootstrap (per-spec gate, or stay-on-current in `autoMode`). No batch-level override in v1. |

### Out of scope (v1)

- Changing protected-branch cleanup (`cleanup_workflow_git.py`) beyond not deleting the new `feat/{slug}` while it is checked out (existing protected-list rules already skip HEAD).
- Auto-push of the new branch at bootstrap (push remains ship-time).
- Worktree creation (`plans.useWorktrees`); this gate is branch-direct on the primary worktree.
- Renaming `config.project.workingBranch` globally, or forcing every consumer onto GitHub Flow vs git-flow.
- Asking again at Step 8 / lite Step 4 (ship uses the recorded `state.branch`).

## Acceptance Criteria

- AC1: On a **new** `ws-spec-to-pr` or `ws-spec-to-pr-lite` start (after identity, before baseline/checkpoint), the orchestrator presents a `user-gate` with exactly the three choices: create feature branch from current HEAD, create feature branch from `{baseBranch}`, stay on current branch; recommended option is marked; cancel is HS-1 (STOP, re-present, never infer yes).
- AC2: `{baseBranch}` is resolved from `config.project.baseBranch` (auto-detect `main`/`master` when unset). The gate copy never hardcodes only `master`.
- AC3: Choosing create-from-current creates and checks out `feat/{slug}` (or a user-supplied alternate) from HEAD and writes that name to `state.branch` before baseline/checkpoint.
- AC4: Choosing create-from-base creates and checks out `feat/{slug}` from `{gitRemote}/{baseBranch}` (or local `{baseBranch}` when no remote) and writes that name to `state.branch` before baseline/checkpoint. Dirty-tree conflict STOP with stash / create-from-current / cancel; no `reset --hard`.
- AC5: Choosing stay-on-current performs no branch create/switch; `state.branch` equals the pre-gate HEAD name. Detached HEAD cannot use stay.
- AC6: If `feat/{slug}` already exists, the agent does not reset it; it offers checkout-existing / different name / stay / cancel.
- AC7: Resume skips the feature-branch gate and keeps `state.branch`. If HEAD differs from `state.branch`, STOP with checkout-recorded / cancel (no silent switch).
- AC8: `autoMode` skips the prompt and stays on current HEAD except when detached (`HEAD`): then create `feat/{slug}` from HEAD (`from-current`) and never persist the literal `HEAD`. The choice is logged. `dryRun` does not mutate git refs.
- AC9: Workflow-mode `ws-ship-pr` uses `state.branch` as PR head and preflight current-branch check. Skip `git pull` when `git ls-remote --heads {gitRemote} {shipHead}` does not show the ref (first-push `feat/{slug}`). Do not treat `@{u}` as proof the head exists on the remote (create-from-base can auto-track `{baseBranch}`). Standalone `/ship-pr` without workflow state still defaults head to `config.project.workingBranch`. Config `workingBranch` is not rewritten.
- AC10: Shared bootstrap docs (`ws-shared/setup.md`) and the init banner `branch` / `baseBranch` rows describe this gate; both standard and lite orchs share the same behavior (no orch-specific fork of the gate).
- AC11: Protected/long-lived names (`main`, `master`, `develop`, configured base/working) remain valid **stay** targets with an explicit warning in the gate copy that ship will use that branch as PR head; the agent still does not create a feature branch unless the user picks option 1 or 2.

## Notes

- **Assumption:** User phrasing "master" means the configured/detected base branch, not a literal `master` checkout on every repo.
- **Assumption:** Default feature-branch prefix `feat/{slug}` matches this repo's recent delivery branches; a later config key for the prefix is not required in v1.
- **Depends on:** existing `state.branch` in `ws-spec-to-pr/PROTOCOLS.md`; `user-gate` in `ws-shared/gates.md`; `detect-base-branch.sh` in `ws-ship-pr`.
- **Related:** `workflow-cleanup-and-branch-protection.spec.md` (cleanup must not delete the active feature branch / protected names).
- **Next:** register via `ws-local-spec-provider` when starting a workflow; classify with `ws-classify-complexity`.
