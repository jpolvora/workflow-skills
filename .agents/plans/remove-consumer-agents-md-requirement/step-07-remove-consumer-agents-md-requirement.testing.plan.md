# Testing Plan — Remove Consumer Requirement for .agents/AGENTS.md

## Scope
Validate installer, configuration wizard, and harness audits in consumer projects missing `.agents/AGENTS.md`.

## Test Commands
- `npm run test` (executes `test-install.js`, `test-quality-gates.js`, `test-memory-formatting.js`)
- `node bin/generate-skill-integrity.js --check`
- `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`
