---
id: 288
slug: us-288
title: "Align hub routing with unpackaged spec-memo companions (not vendor ws-memo)"
workflowId: us-288-20260907T212200Z
refined: true
---

# Refined Plan — US-288

Interview (autoMode): accept spec option 2 (external companions). Do not vendor. Do not add Layer 5 SoT literals.

## Confirmed defaults

- `externalSkills` objects with `id`, `sourcePackage`, `sourceUrl`, `note`.
- Always-applied = packaged skills only (matches `DEFAULT_ALWAYS_APPLIED` plus existing packaged extras already in the shipped table except the two unpackaged ids). Keep `ws-spec-memo` if already in the table (packaged); do not add new Always-applied members.
- Keyword router may still name `ws-memo` / `ws-session-tracking` with an external/skip note.
- `scanInstalledSkillsOnDisk` filters `externalSkills` so bootstrap never writes them into `installed-skills.json`.
- `update` continues to leave untracked foreign folders as-is (no prune of whole skill dirs not in the copy set).

## Section 6

No framework-boundary product code. Verification is tests + harness mechanical gates + `rg` on catalog/autoload.

## Out of interview

Vendoring, Extra-package membership, host-specific UI.

## AC mapping

| AC | Plan section / files |
|----|----------------------|
| AC1 | skill-dependencies.json packages arrays |
| AC2 | skill-dependencies.json `externalSkills` |
| AC3 | autoload.md Always-applied + External companion |
| AC4 | configure_autoload.py DEFAULT + drop_external_companion_members |
| AC5 | CATALOG Layer vs task-router wording |
| AC6 | ws-shared/CATALOG.md membership link |
| AC7 | ws-check-harness PHASES.md / SKILL.md |
| AC8 | test/test-external-companion-skills.js |
| AC9 | bin/cli.js scan/write manifest filter |
| AC10 | portable wording; npm test; Phase 5a |
