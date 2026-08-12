---
id: null
slug: src-sot-and-hybrid-global-install
title: "Source-of-Truth Refactoring to src/ and Hybrid Global/Local Installation Scopes"
source: local
specDate: 2026-08-01
status: completed
---

# Specification — Source-of-Truth Refactoring to src/ and Hybrid Global/Local Installation Scopes

## Description

### Problem
Previously, skill authoring and execution relied on `.agents/skills` as the ambiguous location for both source skills and local testing. Furthermore, installation models did not cleanly distinguish between machine-global skill installations (`$HOME/.agents/skills`) and project-local hub configurations (`$PWD/.agents/skills/ws-shared`).

### Solution
1. Establish `src/` (`src/skills/ws-*`) as the sole canonical Source of Truth (SoT) for authoring, packaging, and installing skills.
2. Support hybrid global mode where skill bodies execute from `$HOME/.agents/skills` while project settings resolve from `$PWD/.agents/skills/ws-shared/config.json`.
3. Enforce strict config resolution precedence where project-local configuration overrides global defaults.
4. Add fallback mechanisms in test runners (`test-install.js`) and script runners (`self_learning.py`) to resolve scripts from `src/skills` when `.agents/skills` is gitignored or missing in development.

## Acceptance Criteria

- [x] AC1: `src/` is established as the canonical Source of Truth for all skill bodies and templates; `.agents/skills` in the development repo is used solely for local harness execution and testing.
- [x] AC2: Hybrid execution mode is fully supported, resolving skill binaries from global/local paths and project config from `$PWD/.agents/skills/ws-shared/config.json`.
- [x] AC3: Installer (`cli.js`) updates and documents installation scopes (`--global` vs project-local) and preserves consumer-owned `ws-shared` data (`config.json`, `STACK.md`, `MEMORY.md`).
- [x] AC4: Test suites (`test-install.js`) and helper scripts (`self_learning.py`) fallback gracefully to `src/skills/` when executing in dev environments.

## Notes

- Commits: `8c117b1`, `7e41d0d`, `bfab2ca`, `854e482`, `aec72f5`, `3638138`, `40afb00`
- Repo: jpolvora/workflow-skills
