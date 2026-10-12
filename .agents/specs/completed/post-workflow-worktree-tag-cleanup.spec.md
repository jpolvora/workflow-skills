---
id: null
slug: post-workflow-worktree-tag-cleanup
title: "Post-workflow worktree and tag cleanup"
source: local
specDate: 2026-08-01
---

# Specification — Post-workflow worktree and tag cleanup

## Description

After a workflows pipeline run ends (finished, concluded, or delivered), the harness must check and clean up git resources created for that run so the repo is not left with unused, orphaned, or broken `uswf/` checkpoint tags, worktrees, or related local branches.

Today, Step 8 optional artifact cleanup (`protocols/artifact-cleanup.md`) can remove tags/worktrees only when the user explicitly chooses "delete temps," and only for `status: completed`. Agents and interrupted sessions often leave stale worktrees and tags behind. This enhancement makes **git runtime cleanup** a required end-of-workflow obligation for both standard (`ws-spec-to-pr`) and lite (`ws-spec-to-pr-lite`) orchestrators, with verification that no dirty leftovers remain for that workflow id.

Scope is limited to resources namespaced to the concluding `workflow-id` under the `uswf/` convention. Plan-dir markdown artifacts (spec, plan, result, state) stay under the existing optional temp-file cleanup policy unless the user also chooses full artifact delete.

## Acceptance Criteria

- AC1: When a workflow reaches a terminal delivered/concluded state (`status: completed`, or equivalent lite end-of-run after ship/fix-pr convergence), the orchestrator runs a post-workflow git cleanup pass for that `workflow-id` before the session claims the workflow fully ended.
- AC2: The cleanup pass removes local checkpoint tags matching `uswf/{workflow-id}/*` (never push or delete remote tags).
- AC3: The cleanup pass removes git worktrees associated with `uswf/{workflow-id}` (including force-remove of broken/orphan worktree registrations) and deletes local branches matching `uswf/{workflow-id}/*` when safe to do so.
- AC4: After cleanup, verification reports zero remaining worktrees, tags, and local branches for `uswf/{workflow-id}`; any remainder is surfaced as a WARN with the exact leftover names (not silent success).
- AC5: Cleanup is skipped while `status: active` / Pause workflow, and in `dryRun` mode only logs intended tag/worktree/branch removals without mutating git.
- AC6: Cleanup never targets worktrees, tags, or branches outside the concluding `uswf/{workflow-id}` namespace (no repo-wide `git clean`, no unrelated user worktrees).
- AC7: Both `ws-spec-to-pr` and `ws-spec-to-pr-lite` document and invoke the same cleanup contract (shared protocol or shared script); `ws-multi-spec` applies it per concluded child workflow id.
- AC8: Git runtime cleanup (tags/worktrees/branches) runs by default on successful end-of-workflow even when the user chooses **Keep all artifacts** for plan-dir temp files; optional "delete temps" continues to control plan-dir temp markdown only.
- AC9: If a worktree path is dirty with uncommitted changes belonging to the concluding workflow, cleanup either force-removes after logging the dirty paths, or STOPs with a user-gate listing leftovers; it must not leave a half-registered broken worktree.
- AC10: Harness docs (`artifact-cleanup` protocol, orch SKILL/PROTOCOLS, and FAQ troubleshooting) describe the mandatory git cleanup vs optional plan-dir temp delete split, with en-us portable wording (no host product names).
- AC11: Cleanup never deletes protected local branches: `main`, `master`, and `develop` when present (exact name match), plus `config.json` → `project.baseBranch` and `project.workingBranch` when set. These must be skipped even if a bug or mis-invocation would otherwise list them for deletion. The primary repository worktree is never removed.

## Notes

- **Out of scope:** Deleting preserved plan artifacts (`step-00` spec, refined plan, `step-08` result, state file policies beyond existing rules); remote branch deletion for the feature PR branch; rewriting `validate_state.py` checkpoint requirements for active runs.
- **Builds on:** Existing `src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md` Step 8 optional cleanup; extend rather than invent a parallel `uswf/` naming scheme.
- **Config touchpoints:** `plans.useWorktrees`, `plans.worktreesDir`; cleanup must succeed (no-op) when worktrees were never used.
- **Implementation deferred:** Spec only; plan/implement later via pipeline when scheduled.
