---
id: null
slug: workflow-cleanup-and-branch-protection
title: "Mandatory Workflow Git Cleanup and Protected Branch Safeguards"
source: local
specDate: 2026-08-01
---

# Specification — Mandatory Workflow Git Cleanup and Protected Branch Safeguards

## Description

### Problem
When orchestrators (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-multi-spec`) complete execution, they frequently leave behind temporary checkpoint tags (`uswf-*`) and worktree directories. Furthermore, unconstrained git cleanup procedures risk accidentally deleting core repository base branches (`main`, `master`, `develop`).

### Solution
1. Introduce a unified `cleanup_workflow_git.py` script and mandate Phase A git cleanup across all workflow orchestrators upon completion or termination.
2. Implement explicit protected branch safeguards in cleanup routines, preventing deletion of primary branches (`main`, `master`, `develop`) as well as user-configured base and working branches.
3. Automatically detach worktrees and delete transient `uswf-*` tags without impacting active source branches.

## Acceptance Criteria

- [x] AC1: `cleanup_workflow_git.py` is invoked mandatorily at workflow exit across standard, lite, and multi-spec pipelines to prune temporary `uswf-*` tags and worktrees.
- [x] AC2: A strict protected-branch deny list prevents cleanup routines from removing `main`, `master`, `develop`, or configured base/working branches.
- [x] AC3: Workflow completion telemetry logs clean removal of temporary git artifacts without throwing unhandled cleanup exceptions.
- [x] AC4: Verification test suite validates that base branches remain untouched during phase cleanup.

## Notes

- Commits: `0dae660`, `d8d87ec`
- Repo: jpolvora/workflow-skills
