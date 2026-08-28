---
id: null
slug: skill-authoring-and-config-gate-rules
title: "Skill Authoring Guidelines and Global Skill Config Verification Gate"
source: local
specDate: 2026-08-07
status: completed
---

# Specification — Skill Authoring Guidelines and Global Skill Config Verification Gate

## Description

### Problem
As skill libraries expand, inconsistencies emerge in skill structure, instruction size, progressive disclosure, and dependency handling. Additionally, executing config-dependent skills installed globally (`$HOME/.agents/skills`) without a local project hub (`ws-shared/config.json`) leads to runtime errors or missing project settings.

### Solution
1. Introduce mandatory `SKILL_AUTHORING.md` guidelines defining 3-tier progressive disclosure, meta-instruction architecture, tool-first validation, and zero-sediment pruning.
2. Enforce a global execution config check rule: config-dependent skills invoked from global paths must check for `$PWD/.agents/skills/ws-shared/config.json` and prompt the user via `user-gate` to run `ws-configure-project` if missing.
3. Update `ws-check-workflows` to include `STEP-DISPATCH.md` when parsing standard workflow step dispatches.
4. Keep harness documentation (`AGENTS.md`, `README.md`), skill integrity manifests (`skill-integrity.json`), and package skill counts (36 Workflows skills) synchronized.

## Acceptance Criteria

- [x] AC1: `SKILL_AUTHORING.md` is established in the repo root and referenced cleanly across agent index files.
- [x] AC2: Config-dependent skills executed globally prompt via `user-gate` to run `ws-configure-project` when `$PWD/.agents/skills/ws-shared/config.json` is missing.
- [x] AC3: `ws-check-workflows` correctly includes `STEP-DISPATCH.md` when validating standard workflow FSM steps.
- [x] AC4: Package integrity manifest (`bin/skill-integrity.json`) and Workflows skill count (36 skills) match the repository tree cleanly.

## Notes

- Commits: `dc911b1`, `72c8302`, `b9ba837`, `a424a96`, `d65f49c`
- Repo: jpolvora/workflow-skills
