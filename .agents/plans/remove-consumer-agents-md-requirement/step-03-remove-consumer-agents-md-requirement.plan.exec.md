# Execution Plan — DAG Tasks

## Tasks

### T1: Audit and refine ws-check-harness for consumer scope
- **Files:** `src/skills/ws-check-harness/PHASES.md`, `src/skills/ws-check-harness/SKILL.md`
- **Goal:** Ensure `ws-check-harness` checks `ws-shared/AGENTS.md` in consumer scope and does not fail on missing `.agents/AGENTS.md`.

### T2: Verify ws-shared/AGENTS.md self-containment
- **Files:** `src/skills/ws-shared/AGENTS.md`
- **Goal:** Verify complete consumer agent instructions and routing.

### T3: Verify installer and test suite assertions
- **Files:** `test/test-install.js`
- **Goal:** Confirm `npm run test` verifies 100% success without `.agents/AGENTS.md`.
