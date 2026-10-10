---
id: null
slug: skill-loaded-banner-instruction
title: "Skill Loading Banner Instruction in Primary SKILL.md Files"
source: local
specDate: 2026-07-31
---

# Specification — Skill Loading Banner Instruction in Primary SKILL.md Files

## Description

To increase operational visibility and confirm skill activation during agent executions, every main skill file (`.agents/skills/{ws-skillName}/SKILL.md`) will contain a standard instruction requiring the agent to print `"{ws-skillName} loaded."` upon being loaded or read.

This directive is restricted strictly to the primary entry-point `SKILL.md` of each skill. Supplementary markdown documents (e.g., `FORMAT.md`, `INTERVIEW.md`, `PROTOCOLS.md`, `PREPARE-CHECKLIST.md`, `docs/*.md`, `references/*.md`) must not include this instruction banner.

## Acceptance Criteria

- AC1: Every primary skill file (`.agents/skills/{ws-skillName}/SKILL.md`) in the workspace includes a clear instruction directive requiring the agent to print `"{ws-skillName} loaded."` immediately upon loading/reading the skill.
- AC2: Secondary/auxiliary markdown files within skill subdirectories (such as `FORMAT.md`, `INTERVIEW.md`, `PROTOCOLS.md`, `PREPARE-CHECKLIST.md`, `docs/*.md`, or `references/*.md`) DO NOT contain the `"{ws-skillName} loaded."` banner directive.
- AC3: The skill authoring guide (`ws-write-a-skill`) and validation tools (`ws-check-harness`, `ws-check-workflows`) are updated to require and validate the `"{ws-skillName} loaded."` directive for primary `SKILL.md` files.
- AC4: The complete skill suite continues to pass all integrity checks (`npm run verify-integrity`, `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`, and `npm run test`).

## Notes

- Banner format: The banner output string must follow the exact syntax `"{ws-skillName} loaded."` (e.g., `ws-spec-write loaded.`, `ws-plan-write loaded.`, `ws-implement-tasks loaded.`).
- Placement: The directive should be placed near the top of each primary `SKILL.md` file (directly below the title heading or header section) to ensure early output upon skill activation.
- Progressive disclosure: Auxiliary files loaded later by the main skill will not output banner strings, preserving clean log outputs.
