---
step: 1
slug: pre-ship-doc-sync
workflowId: pre-ship-doc-sync-20260928T034600Z
status: completed
startedAt: "2026-09-28T03:46:00Z"
endedAt: "2026-09-28T03:50:00Z"
acRefs: []
---
# pre-ship-doc-sync — Implementation Plan

## Goal

Add `defaults.requirePreShipDocSync` (boolean, default true; absent/invalid → true) and gate the pre-ship doc-sync trio in standard Step 8 and lite Step 4 close before the ship phase.

## Scope

- `.agents/skills/ws-shared/runtime/config.schema.json`
- `.agents/skills/ws-shared/templates/config.json.example`
- `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`
- `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs`
- `.agents/skills/ws-shared/runtime/config-resolution.md`
- `.agents/skills/ws-shared/runtime/gates.md`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- `.agents/skills/ws-wiki/SKILL.md`
- `AGENTS.md`, `README.md`, `FEATURES.md`, site/wiki docs
- `test/test-pre-ship-doc-sync.js`, `test/test-suites.json`

## Verification

- `node test/test-pre-ship-doc-sync.js`
- `node test/test-powershell-config-editor.js`
- `npm run verify-integrity`
