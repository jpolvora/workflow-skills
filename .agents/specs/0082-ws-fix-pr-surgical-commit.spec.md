---
id: null
slug: ws-fix-pr-surgical-commit
title: "ws-fix-pr surgical commit without full-tree stash"
source: local
specDate: 2026-09-14
status: completed
---

# Specification — ws-fix-pr surgical commit without full-tree stash

## Description

Operators often keep **uncommitted local harness edits** in the same worktree as the PR branch: extra agent instructions, host/session notes, skill-body experiments, or other workflow helpers that make `/fix-pr` safer or faster **for that machine**. Those files must stay on disk for the whole run. They must **not** be committed with the thread-fix.

`ws-fix-pr` outer preflight currently **refuses dirty worktrees** (`SKILL.md` step 1, `scripts/COOPERATIVE_FIX.md` order of operations, evals dirty-worktree assertion). Agents then **stash the entire tree**, run plan/fix/push, and **stash pop**. That is the defect:

- Stash **hides** the local harness for the duration of the run, so the agent loses the very instructions the operator needed.
- Stash/pop is extra git mutation and can fail or mix hunks with the product fix.
- A clean-tree rule is not required for a **safe** fix: safety is **path-scoped stage + commit**, not an empty porcelain.

The contract (same idea as G2-code / `commit-code`):

1. Snapshot `preExistingDirty` at preflight (tracked, staged leftovers, untracked). Continue on a dirty tree.
2. Keep those paths **present and unstashed** through `fixPrPlan` and `fixPrExec` so local harness instructions remain loadable.
3. Edit only what the threads and in-scope proactive hits require (product / PR files).
4. Stage and commit **only those surgical fix paths**. Never `git add -A`, `git add .`, or directory-wide adds. Never put local harness WIP in the fix commit.
5. **Do not** `git stash` / `stash push` / `stash pop` the whole worktree (or “save everything then restore”) before or after the batch.
6. After commit, leftover porcelain still includes `preExistingDirty` paths that were not part of this batch’s fix.

Before `git pull origin <sourceRefName>`, run `git fetch origin <sourceRefName>`, compare `git diff --name-only HEAD..FETCH_HEAD` with normalized `preExistingDirty` paths, and pull only when the intersection is empty. If the intersection is non-empty, STOP and report the overlapping paths; do not risk a conflicted pull or stash-all (that would again drop local harness).

Align `ws-fix-pr` commit wording with hub `preExistingDirty` / `commit-code`. Do not rewrite the whole G2-code section.

## Acceptance Criteria

- AC1: `ws-fix-pr/SKILL.md` outer preflight no longer says to refuse dirty worktrees or require a clean worktree before `fixPrPlan`.
- AC2: Outer preflight requires capturing `preExistingDirty` from `git status` (tracked modifications, staged leftovers, and untracked files) before the first product edit, then proceeding with plan/execute on that tree.
- AC3: `SKILL.md` states that uncommitted local harness / workflow helper files in `preExistingDirty` stay on disk for the whole batch so the operator’s local instructions remain available, and they are not staged into the fix commit.
- AC4: `SKILL.md` step 5 (verify / resolve / push) states that commit stages only surgical fix paths for this batch (thread files plus recorded `proactiveFixed` / same-class hits), excluding `preExistingDirty` paths that were not edited for this batch, `{plansDir}/**`, secrets, and gitignored files.
- AC5: `SKILL.md` and `scripts/COOPERATIVE_FIX.md` explicitly forbid `git stash` / `git stash push` / `git stash pop` of the whole worktree (or equivalent save-all / restore) **before or after** the batch as a dirty-tree workaround.
- AC6: `scripts/COOPERATIVE_FIX.md` order of operations line 0 matches the new preflight (sync + `preExistingDirty` snapshot + `validate-auth`; no refuse-dirty; no stash sandwich).
- AC7: `evals/evals.json` assertion that currently requires dirty-worktree preflight is rewritten to require surgical staging and preservation of pre-existing dirty (including local harness) files on disk through the run.
- AC8: After a successful non-`dry-run` commit, the commit’s name list contains only this batch’s fix paths; paths listed in `preExistingDirty` that were not part of the fix remain dirty in the worktree.
- AC9: When a thread fix must edit a path that is already in `preExistingDirty`, the agent edits only the defect-class hunks needed for the thread, stages that path for the fix commit, and does not stage unrelated dirty files (including other harness WIP) that were not required.
- AC10: `dry-run` still suppresses commit and push; it does not stash, revert, or otherwise hide pre-existing dirty files.
- AC11: No new helper script is required; the change is skill/docs/evals prose plus any test that greps the forbidden “refuse dirty worktrees” / stash-workaround wording.

## Original Issue Context

### Prior Work Sweep

- Keyword / git: `ws-fix-pr/SKILL.md` step 1 “refuse dirty worktrees”; `COOPERATIVE_FIX.md` “refuse dirty worktree”; evals id 8 “dirty-worktree preflight”.
- Operator failure class: clean-tree preflight forced stash-before / stash-after, which removed local uncommitted harness instructions during `/fix-pr` and risked committing them if agents used `git add -A` instead.
- Related G2-code contract: `{sharedDir}/runtime/gates.md` staging drops `preExistingDirty`; `{sharedDir}/runtime/tools.md` `commit-code`; MEMORY trap `g2-code-slug-files-touched-only`.
- Feature-branch bootstrap stash (`setup.md` stash-then-continue) is a **different** gate (create-from-base). Out of scope here.
- Parallel-worker stash of **other workers’ hashed paths** (MEMORY shared-worktree integrity) is not the default fix-pr flow and must not be copied into `ws-fix-pr` as “stash everything.”
- `git log -S "refuse dirty"` on `ws-fix-pr/SKILL.md`: present since pipeline rename / SoT move.

### Design Intent

`refuse dirty worktrees` was meant to keep pull/push from mixing WIP into the PR. The observed harm is **not** “WIP might exist”; it is **stash sandwich + clean-tree stop** against an operator who needs **local harness WIP to remain in the tree** and **out of git history**. Product intent: keep pull/auth and surgical `git add -- <fix-paths>`; drop clean-tree refuse; forbid stash-before/after so local harness stays available and uncommitted.

## Notes

- Integrity regen is in scope only if hashed `SKILL.md` / `COOPERATIVE_FIX.md` / evals change as part of implementation (upstream ship checklist).
- `ws-goal-fix-pr` has no duplicate dirty-tree sentence; it inherits via `ws-fix-pr`. Update goal skill only if it later copies the old refuse-dirty line.
- Language of skill bodies remains en-us.
- “Local harness” here means any operator-owned uncommitted files that improve the local agent session (hub, pointers, skill copies, notes). The skill does not special-case filenames; it uses `preExistingDirty`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing G2-code / Step 8 plan-file commit rules | Already drop `preExistingDirty`; this spec only aligns fix-pr |
| Feature-branch dirty STOP stash / create-from-current | Owned by `setup.md`, not fix-pr |
| Auto-Fix CI runner (`AUTO_FIX.md` CI sequence) | Independent runtime; no dirty IDE worktree |
| New stash helper or path-scoped stash script | Stash-all is the problem; surgical add is enough |
| Shipping or documenting a private host harness as packaged SoT | Local WIP stays local and uncommitted |
| Force-push, amend of already-pushed commits, `git reset --hard` | Unchanged safety rules |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Pull conflict vs dirty overlap | STOP and report; no stash-all | Stash would hide local harness again | y |
| Auth / rate limits / concurrency / data lifecycle / retry | N/A because this is a local git staging contract for an existing skill, not a networked API | Skill already owns SCM intents | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `ws-fix-pr` SKILL, cooperative order-of-ops, evals (plus grep test if needed) | Diff vs this spec ACs |
| Atomic criteria | AC1–AC11 each have a pass/fail file or porcelain check | Reviewer checklist |
| Failure modes | Pull blocked by overlapping dirty files → STOP, no stash-all; local harness never hidden mid-run | AC3, AC5, Description |
| Observation telemetry | `git status` before/after; `git show --name-only` on the fix commit | Validation Notes |
| Open blockers | None | N/A |
| Stack invariants | No new Node async/path APIs; do not `exec` untrusted paths; surgical git add only | Code review of any test grep |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `git status --porcelain` at preflight vs after commit (pre-existing harness paths remain dirty unless they were the thread fix).
- `git show --name-only --pretty="" HEAD` after commit lists only surgical fix paths.
- `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec (authoring).
- Grep: no remaining `refuse dirty worktree` or stash-sandwich recipe in `ws-fix-pr` skill docs.

### Negative & Failing Test Scenarios

- NS1: Agent runs `git stash push` of the whole tree because porcelain is dirty (including local harness) → **fail** (forbidden; hides operator instructions).
- NS2: Agent `git add -A` or `git add .` so local harness WIP rides the fix commit → **fail**.
- NS3: Preflight still blocks with “worktree is dirty” and never starts `fixPrPlan` → **fail** AC1/AC2.
- NS4: Stash after push “to restore harness” even if the run used stash-before → **fail** AC5 (no stash sandwich).
- NS5: Path-injection / `child_process.exec` with concatenated untrusted paths in any new test helper → **fail** stack injection invariant (do not add such helpers).
