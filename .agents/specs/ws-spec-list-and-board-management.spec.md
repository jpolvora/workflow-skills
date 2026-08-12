---
id: null
slug: ws-spec-list-and-board-management
title: "Dual-Board Spec and Plan Inventory Management via ws-spec-list"
source: local
specDate: 2026-08-01
status: completed
---

# Specification — Dual-Board Spec and Plan Inventory Management via ws-spec-list

## Description

### Problem
In workflow skills, human-facing feature specifications (`{specsDir}/` / `.agents/specs/`) were previously confused or merged with transient workflow plan runs (`{plansDir}/` / `.agents/plans/`), making it difficult to inspect, filter, or manage active specs and plans independently.

### Solution
1. Introduce the `ws-spec-list` skill providing an interactive dual-board listing:
   - **Spec Board:** Discovers and lists `*.spec.md` files from `{specsDir}`.
   - **Plan Board:** Discovers and lists `*.state.md` files and execution runs from `{plansDir}`.
2. Support flag filtering (`--specs`, `--plans`, `--active`, `--status <status>`, `--unlinked`).
3. Provide an interactive action matrix via `user-gate` allowing users to start, continue, finish, cancel, archive, or remove specs/plans cleanly without cross-deleting resources unintentionally.
4. Align documentation across `AGENTS.md` and `README.md` to maintain strict path separation between `{specsDir}` and `{plansDir}`.

## Acceptance Criteria

- [x] AC1: `ws-spec-list` skill is implemented with dual boards separating human-facing `{specsDir}` specifications from `{plansDir}` workflow runs.
- [x] AC2: Filter flags (`--specs`, `--plans`, `--active`, `--status`, `--unlinked`) correctly scope the displayed boards.
- [x] AC3: Action matrix provides safe confirmation gates before executing destructive actions (cancel, archive, remove).
- [x] AC4: Skill dependencies and harness documentation (`AGENTS.md`, `README.md`) register `ws-spec-list` as an available utility skill.

## Notes

- Commits: `bfab2ca`, `6052801`
- Repo: jpolvora/workflow-skills
