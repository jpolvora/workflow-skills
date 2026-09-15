---
step: 8
slug: installer-antigravity-gemini-skills-json
workflowId: installer-antigravity-gemini-skills-json
status: completed
startedAt: "2026-09-15T03:30:00Z"
endedAt: "2026-09-15T04:04:00Z"
acRefs:
  - AC1
  - AC2
  - AC3
  - AC4
  - AC5
  - AC6
  - AC7
  - AC8
---
# Step 08 — Delivery result (installer-antigravity-gemini-skills-json)

## Summary

Migrated the Gemini CLI and Antigravity IDE global host target (`gemini`) from directory-level symlinks/junctions/copies under `$HOME/.gemini/config/skills/` to the official declarative JSON configuration mechanism via `$HOME/.gemini/config/skills.json`.

Introduced helper functions in `bin/install-rules.js` (`getGeminiSkillsJsonPath`, `readGeminiSkillsJson`, `upsertGeminiSkillsJsonEntry`, `removeGeminiSkillsJsonEntry`, `cleanupLegacyGeminiSkills`) with safe handling for malformed JSON, corrupt recovery (`.bak.<timestamp>` backup), and preservation of custom user entries and `inherits` blocks. Updated `bin/cli.js` install, update, and uninstall workflows, swept legacy `ws-*` directory junctions, preserved user custom skills, updated auto-detection, updated documentation in `README.md` and `docs/index.html`, and added comprehensive tests in `test/test-install.js`.

## Files delivered

- `bin/install-rules.js` — helper functions for `skills.json` lifecycle and secondary target path resolution
- `bin/cli.js` — integration into secondary target install, update, uninstall workflows and `--help`
- `test/test-install.js` — unit and integration tests covering corrupt recovery, legacy directory cleanup, custom entry preservation, and multi-target CLI lifecycles
- `README.md` — documentation for declarative `skills.json` vs folder projections
- `docs/index.html` — documentation in the Antigravity tab for declarative `skills.json`
- `bin/skill-integrity.json` — synchronized hash manifest

## Commits

- `c4b28dca` `docs: add specification and PRD for declarative Antigravity and Gemini skills.json configuration`
- `51d3acb5` `feat(installer): configure antigravity and gemini skills declaratively via skills.json` (G2-code)

## Verification

- `npm test`: full test suite passed exit 0 across all installation, canonicity, update, uninstall, and integrity phases
- `node test/test-install.js --local`: exit 0
- `node test/test-doc-sync.js`: ok
- `npm run verify-integrity`: OK, matches tree
- Review: 0 Critical, 0 Warning findings across git diff `main...HEAD`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 28m 53s (1733s agent execution) |
| Steps executed | 5 (steps 0–4 completed in lite workflow) |
| Total tokens | 0 (estimated: false) |
| Lines added | +1967 |
| Lines removed | -32 |
| Net LOC delta | +1935 |
| Baseline LOC | N/A (this repo uses `bin/`, `docs/`, `test/`; no `src/`/`web/`/`tests/`) |
| Final LOC | N/A (diff vs `c4b28dca`: 19 files, +1967 / -32) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | Gemini 3.8 Flash | 14s | 0 | 2 created |
| 1 | Planning | Gemini 3.8 Flash | 87s | 0 | 1 created |
| 2 | Implementation | Gemini 3.8 Flash | 1351s | 0 | 5 product files |
| 3 | Review | Gemini 3.8 Flash | 76s | 0 | 1 review report |
| 4 | Ship | Gemini 3.8 Flash | 205s | 0 | 1 delivery result |

Gate wait excluded. Sum of `telemetry.steps[].elapsedSec` (reporting telemetry only). No harness benchmark (forbidden in this workflow).
