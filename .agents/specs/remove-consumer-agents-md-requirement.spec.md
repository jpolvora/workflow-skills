---
id: null
slug: remove-consumer-agents-md-requirement
title: "Remove Consumer Requirement for .agents/AGENTS.md and Consolidate Consumer Context into ws-shared/"
source: local
specDate: 2026-08-07
status: completed
---

# Specification — Remove Consumer Requirement for .agents/AGENTS.md and Consolidate Consumer Context into ws-shared/

## Description

### Problem
Consumer projects installing or using workflow skills cannot be required to maintain or commit a repository-root `.agents/AGENTS.md` file. Monolithic or nested `.agents/AGENTS.md` files are not part of the consumer contract and must not be enforced, expected, or checked as a requirement in consumer repositories.

### Root Cause
Legacy harness checks or skill references occasionally assumed `.agents/AGENTS.md` existed for routing or capability discovery. In consumer projects, skill installation only populates `.agents/skills/` and the consumer hub `.agents/skills/ws-shared/`.

### Solution
1. Remove any requirement or validation check expecting `.agents/AGENTS.md` in consumer repositories across all skills (`ws-check-harness`, `ws-configure-project`, `ws-spec-list`, orchestrators) and installer scripts.
2. Consolidate all mandatory consumer agent instructions, routing tables, skill indexes, capability vocabulary, and configuration contracts into the consumer hub file `ws-shared/AGENTS.md` (`.agents/skills/ws-shared/AGENTS.md` or `$HOME/.agents/skills/ws-shared/AGENTS.md`).
3. Update `ws-check-harness` audit rules so consumer mode audits `ws-shared/AGENTS.md` as the authoritative hub and treats packaged `.agents/AGENTS.md` as out of contract (not required). Optional **repo-root** `AGENTS.md` remains consumer-owned (thin pointer / autoload override via `ws-configure-project --section autoload`); absence remains OK.
4. Ensure `test-install.js` explicitly verifies that fresh consumer installs succeed and operate fully without `.agents/AGENTS.md` present and without the installer writing root `AGENTS.md`.

## Acceptance Criteria

- [x] AC1: No skill, orchestrator, script, or installer tool requires or errors on the absence of `.agents/AGENTS.md` in consumer repositories.
- [x] AC2: `ws-shared/AGENTS.md` serves as the complete, self-contained source of truth for consumer hub routing, skill indexes, capability vocabulary (`ws-shared/tools.md`), and config contracts (`ws-shared/config.json`).
- [x] AC3: `ws-check-harness` audits distinguish between upstream repo checks (root `AGENTS.md` + dual-hub drift vs `{sharedDir}/AGENTS.md`; no packaged `.agents/AGENTS.md` requirement) and consumer repo checks (audit `ws-shared/AGENTS.md`; missing root `AGENTS.md` is OK; `.agents/AGENTS.md` is not required).
- [x] AC4: `ws-configure-project` and installer scripts verify that all necessary consumer hub files (`config.json`, `STACK.md`, `MEMORY.md`, `AGENTS.md`) reside cleanly under `ws-shared/`.
- [x] AC5: Automated test suite (`npm run test`) includes explicit assertions confirming success in consumer trees missing `.agents/AGENTS.md` and confirming the installer does not create or overwrite consumer root `AGENTS.md`.

## Notes

- Scope: Consumer repository contracts and harness checkers
- Target Directory: `.agents/skills/ws-shared/`
- Repo: jpolvora/workflow-skills
- Related: optional root `AGENTS.md` generation is owned by `shared-autoload-md` / `configure_autoload.py` (consumer override), not this spec’s removed `.agents/AGENTS.md` path.
