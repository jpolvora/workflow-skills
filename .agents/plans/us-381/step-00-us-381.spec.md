---
id: 381
slug: us-381
title: enhance ps1 config gui
source: github
specDate: 2026-09-21
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/381"
step: 0
workflowId: us-381
status: completed
startedAt: "2026-09-21T13:09:49.695Z"
endedAt: "2026-09-21T13:09:49.695Z"
acRefs: []
---
# Specification — enhance ps1 config gui

## Description

Enhance the desktop config GUI editor (`{skillsRoot}/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`, PowerShell 5.1 compatible Windows Forms, launched via `Edit-Config.bat`) that edits the consumer `{sharedDir}/config.json`. The GUI must stay aligned to `config.schema.json` plus `config.json.example` across all 22 top-level keys (toolsFile, memory flags, pathTokens, project, stack, domain, providers, issueTrackers, verification, dagThresholds, defaults, plans, reviews, preview, tracking, monitor, rules, specMemo, invariants, fable, ws-goal-fix-pr) with correct section groupings, control bindings, types, validation ranges, and descriptions.

Goals: improve visual style (layout, hierarchy, grouping, spacing, tab order, readability, validation messaging, status feedback) and options plus features (load, save, validate, backup, reset, dirty tracking, diagnostic mode) while preserving PowerShell 5.1 compatibility and the schema-sync contract verified by `test/test-powershell-config-editor.js`.

Architecture touchpoints: upstream SoT ps1 plus launcher plus test plus schema and example; consumer config file only. No managed skill-body rewrites beyond the GUI and its test plus docs.

## Acceptance Criteria

- AC1: The GUI renders all 22 top-level schema keys with correct section groupings and schema-matched controls (boolean to checkbox, enum to dropdown, integer to numeric with min and max, string to textbox, arrays to list editor) plus descriptions from the schema or example.
- AC2: Visual style is consistent and readable (section headers, grouping, spacing, tab order, fonts, validation error highlighting, status or summary feedback) with no clipped controls at 96 DPI and 125 percent scaling.
- AC3: Load, save, validate, backup (`config.json.bak`), reset to defaults or example, dirty indicator, unsaved-changes prompt, and diagnostic mode all work from the GUI and launcher.
- AC4: Out-of-range, wrong-type, missing-required, and unknown-key inputs are rejected with field-level messages; valid configs save and invalid configs block save.
- AC5: Every schema and example key, value, default, type, range, description, and section change is reflected in the GUI; `node test/test-powershell-config-editor.js` exits 0 with `Validation PASSED` and descriptions-loaded markers.
- AC6: The script parses under PowerShell 5.1 with no PS7-only syntax; the launcher runs on Windows and the test covers the syntax plus diagnostic checks.
- AC7: No secrets, tokens, PATs, or personal data appear in GUI logs, diagnostics, or tests beyond the config file itself; the configured secrets review is clean.
- AC8: Docs that name the GUI (README, AGENTS.md, CATALOG.md, site cards as applicable) are updated; `npm run generate-integrity` plus `npm run verify-integrity` exit 0 and `ws-check-harness` exits 0.

## Original Issue Context

enhance visual style and options/features aligned to config.json & schema

Source: https://github.com/jpolvora/workflow-skills/issues/381 (state open, labels none, assignees none, comments none).

### Prior Work Sweep

Provider sweep on 2026-09-21 (`sweep_prior_work.cjs --issue 381 --keywords ps1 config gui powershell editor`): status ok, zero commits, six merged PRs, no exact open PR for #381, no duplicate-risk open work. Merged hits: #184 (release 0.3.0), #305 (Release v0.4.11 Desktop config GUI editor with PowerShell 5.1 compatibility and schema sync, most relevant), #339 (preview gate), #319 (ws-wiki), #350 (step baton), #377 (harness hardening round 2). Closest in-tree relatives: `Edit-WorkflowSkillsConfig.ps1` (88,261 bytes), `Edit-Config.bat`, `config.schema.json`, `config.json.example`, `test/test-powershell-config-editor.js`, `ws-configure-project`.

### Design Intent

Modification, not greenfield. `git log --oneline -5 -- .agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` shows iterative fixes (`28c32421 fix(#377)`, `ae3806d6`, `af29a6f6`, `ac55d68f`, `5c9ac054`), confirming the GUI is intentionally PowerShell 5.1 Windows Forms with a schema-sync contract, not an accidental prototype. Enhancement preserves 5.1 compatibility and the test-verified sync gate.

## Notes

- Control mapping follows schema types; nested objects become grouped sections and arrays become add, edit, and remove list editors.
- DPI checks are manual with screenshots or notes; automated test covers parsing, diagnostics, backup, and sync markers.
- GUI text stays en-us; consumer config values may use any language.
- Schema gaps found during GUI work are reported; schema shape changes beyond GUI alignment need a separate spec unless trivial.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web-based or cross-platform native GUI | Desktop ps1 is the shipped editor; other hosts use CLI plus docs |
| Editing non-config files | GUI owns `{sharedDir}/config.json` only |
| Schema redesign | GUI aligns to schema; shape changes are separate scope |
| Auto commit or push of config edits | User commits explicitly; import and GUI never run git writes |
| Background watch or auto-reload daemon | Manual load plus save only |
| Embeddings or AI-assisted config suggestions | Deterministic schema-driven editing suffices |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Editor files | `Edit-WorkflowSkillsConfig.ps1` plus `Edit-Config.bat` under `{skillsRoot}/ws-shared/runtime/scripts/` | Current shipped paths | y |
| PowerShell baseline | 5.1 compatible, no PS7-only syntax | Shipped contract from #305 | y |
| Schema coverage | All 22 top-level keys plus nested sections | Full alignment per issue | y |
| Visual baseline | 96 DPI and 125 percent scaling with no clipped controls | Checkable manual gate | y |
| Validation behavior | Field-level messages plus save block on invalid | Matches test markers | y |
| Auth, rate limits, concurrency, data expiry, idempotency, external-dependency failure, state transitions | N/A because the editor is a local single-writer desktop form with no network API, no shared service, no TTL data, and foreground runs only | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Ps1 plus launcher plus test plus docs for GUI alignment only | Diff lists those paths only |
| Atomic criteria | AC1–AC8 each pass or fail | Authoring validate plus command checks |
| Failure modes | Invalid configs block save with messages; backup written on save; diagnostic never writes config | AC3, AC4 plus negative scenarios |
| Observation telemetry | Diagnostic markers plus backup file plus test output plus manual DPI notes | Validation notes commands |
| Stack invariants | typescript-node Node-subset enforced on test-script changes (awaited promises, validated inputs, contained paths, closed handles); PowerShell 5.1 parse enforced on ps1; strict-type checks N/A (no `tsc` gate) | `test-powershell-config-editor.js` plus `scan_stack_invariants.cjs` plus negative scenarios |
| Open blockers | None | Implementable from this spec |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0112-us-381.spec.md` exits 0; `node test/test-powershell-config-editor.js` exits 0 with `Validation PASSED` and descriptions-loaded markers plus `config.json.bak` creation; PowerShell 5.1 parse check exits 0; `npm run generate-integrity` plus `npm run verify-integrity` exit 0; `ws-check-harness` exits 0.
- Manual: GUI screenshots or notes at 96 DPI and 125 percent scaling showing no clipped controls, section headers, validation highlighting, and status feedback.
- Docs: README, AGENTS.md, CATALOG.md, and site cards updated where the GUI is named.

### Negative & Failing Test Scenarios

- Top-level schema key missing from the GUI or bound to the wrong control type (must fail AC1).
- Clipped controls, missing section headers, or validation errors without field highlighting (must fail AC2).
- Save without backup, missing dirty indicator, or diagnostic mode writing config (must fail AC3).
- Invalid config saves or valid config blocked without a message (must fail AC4).
- `test-powershell-config-editor.js` fails or diagnostic markers are missing (must fail AC5).
- PS7-only syntax parses on PS7 but fails the 5.1 parse check (must fail AC6).
- Secret, token, PAT, or personal identifier appears in logs, diagnostics, or tests (must fail AC7).
- GUI docs stale or integrity or harness fails after GUI edits (must fail AC8).
