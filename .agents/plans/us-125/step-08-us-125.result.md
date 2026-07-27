# Delivery Result — US-125: Add ws-long-runner skill (sequential multi-spec orchestrator)

## Summary
Added `ws-long-runner` skill to the `workflows` package in `workflow-skills`.

## Changes Made
- Created `.agents/skills/ws-long-runner/` containing:
  - `SKILL.md` (frontmatter: `name: ws-long-runner`, version `0.0.1`)
  - `PROTOCOL.md` (6-phase master loop FSM)
  - `STATE.md` (state schema, parseable `step-output`, already-implemented probe, blank scan, resume)
  - `EXAMPLES.md` (usage examples)
  - `evals/evals.json` (evaluation prompts)
- Registered `ws-long-runner` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`.
- Updated skill routing tables and indexes in `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, and `README.md`.
- Rebuilt site catalog (`node bin/build-site.js`) updating `docs/index.html`.
- Regenerated integrity checksums (`bin/skill-integrity.json`) and bumped version to `0.0.83`.

## Verification Results
- `npm run verify-integrity`: ✅ PASS
- `python .agents/skills/check-workflows/scripts/check_workflows.py`: ✅ PASS (0 issues)
- `npm run tests -- --local`: ✅ PASS (34/34 skills installed & verified)
