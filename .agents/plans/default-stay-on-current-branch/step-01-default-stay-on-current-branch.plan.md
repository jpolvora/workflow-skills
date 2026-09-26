# Step 1 Plan — default-stay-on-current-branch (0134)

- workflowId: us-0134-20260926T150800Z
- slug: default-stay-on-current-branch
- spec: .agents/specs/0134-default-stay-on-current-branch.spec.md
- flowMode: standard (classifier: 8 steps / 10 files est; executed inline per batch stay-on-develop override)
- modelsPreset: muse

## Scope (DoR file list)

1. `.agents/skills/ws-shared/runtime/config.schema.json` — add `defaults.branchStrategy` enum (AC1)
2. `.agents/skills/ws-shared/templates/config.json.example` — seed `stay` (AC2)
3. `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` — enum row in Defaults (AC3)
4. `.agents/skills/ws-shared/runtime/setup.md` — resolve strategy, stay-without-gate, prompt override, detached guard (AC4-AC8)
5. `test/test-powershell-config-editor.js` — add `branchStrategy` to Test 8 coreDefaults (makes Negative 3 fail closed)

## Steps

1. Schema: insert `branchStrategy` after `verboseMode` in defaults properties.
2. Example: insert `"branchStrategy": "stay"` + comment after `verboseMode`.
3. PS1: insert enum row after `verboseMode` row in `defaults` page section.
4. Test: extend `coreDefaults` array.
5. setup.md: step 2 flag parsing gains `prompt-branch` alias; §5b gains strategy resolution before gate:
   - resolve `defaults.branchStrategy`, default `stay`; `--prompt-branch` forces prompt for the run
   - `stay` + attached HEAD → record `branchStrategy: stay`, `state.branch`, log `branch-gate | default-stay | stay | {branch} | ISO`, skip gate
   - `prompt` (or flag) → three-choice gate; option 3 marked (Recommended) when configured strategy is `stay`
   - detached HEAD → reject stay, require named branch
   - `from-current` / `from-base` → run existing create flow without gate (same git actions as options 1/2)
6. Verify: `node test/test-powershell-config-editor.js`, authoring validate of the spec, JSON parse of schema/example.
7. Commit on develop; sync index.PRD; record shipped.

## Stack & Security Invariants Verification Plan

- Node-only, no new files under skills scripts; PS1 edit is the sanctioned GUI editor.
- No secrets, no network, no new dependencies.
- Integrity regeneration required (hashed skill content changed): `npm run generate-integrity` + `verify-integrity` at batch end (once, to avoid per-spec churn) — AC16-style gates run per spec only on focused tests per user override.
