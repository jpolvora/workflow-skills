# Delivery Result — US-127: Add Smart Multi-Spec Orchestrator (`ws-multi-spec`)

## Summary
Evolved batch orchestrator into **`ws-multi-spec`** with smart complexity and flow auto-detection (`spec-to-pr` vs `spec-to-pr-lite`).

## Changes Made
- Created `.agents/skills/ws-multi-spec/` containing:
  - `SKILL.md` (frontmatter: `name: ws-multi-spec`, version `0.0.84`)
  - `PROTOCOL.md` (master loop FSM with Smart Flow Auto-Detection phase)
  - `STATE.md` (state schema with `flowMode` tracking)
  - `EXAMPLES.md` and `evals/evals.json`
- Removed retired `ws-long-runner` skill folder.
- Updated `check_workflows.py` (`.agents/skills/check-workflows/scripts/check_workflows.py`) to simulate and validate `ws-multi-spec`.
- Added featured big card for `ws-multi-spec` in `docs/index.html` section `#workflows`.
- Registered `ws-multi-spec` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`.
- Updated skill routing tables and indexes in `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, and `README.md`.
- Bumped package patch version to `0.0.84` and regenerated integrity manifest `bin/skill-integrity.json`.

## Verification Results
- `npm run verify-integrity`: ✅ PASS
- `python .agents/skills/check-workflows/scripts/check_workflows.py`: ✅ PASS (3/3 workflows simulated, 0 issues)
- `npm run tests -- --local`: ✅ PASS (34/34 skills installed & verified)
