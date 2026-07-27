# Execution Plan — US-125

## DAG Summary
- `execMode`: sequential
- Tasks:
  1. `task-1`: Create `ws-long-runner` skill files under `.agents/skills/ws-long-runner/` (`SKILL.md`, `PROTOCOL.md`, `STATE.md`, `EXAMPLES.md`, `evals/evals.json`).
  2. `task-2`: Register `long-runner` in `bin/skill-dependencies.json`.
  3. `task-3`: Update skill routing & catalog index tables in `AGENTS.md`, `.agents/AGENTS.md`, and `.agents/skills/ws-shared/AGENTS.md`.
  4. `task-4`: Run `node bin/build-site.js` and `npm run generate-integrity`.
  5. `task-5`: Run verification (`npm run verify-integrity`, `check-harness`, `npm run tests -- --local`).
