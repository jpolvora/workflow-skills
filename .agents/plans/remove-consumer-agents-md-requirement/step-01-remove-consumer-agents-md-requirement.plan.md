# Implementation Plan — Remove Consumer Requirement for .agents/AGENTS.md and Consolidate Context into ws-shared/

## Overview
This plan defines the technical implementation steps to eliminate any consumer-side dependency or enforcement of `.agents/AGENTS.md`, consolidating all required consumer agent contracts, routing tables, skill indexes, and configuration guidelines into `ws-shared/AGENTS.md`.

## Proposed Implementation Steps

### 1. Audit & Update Harness Audit Rules (`ws-check-harness`)
- File: `src/skills/ws-check-harness/PHASES.md`, `src/skills/ws-check-harness/SKILL.md`, `src/skills/ws-check-harness/scripts/check_harness.py`
- Distinguish between upstream checks (which compare root `AGENTS.md` and `.agents/AGENTS.md` for drift) and consumer checks (which validate `ws-shared/AGENTS.md` only).
- Ensure harness checks pass cleanly in consumer repos without `.agents/AGENTS.md`.

### 2. Verify Consumer Hub Self-Containment (`ws-shared/AGENTS.md`)
- File: `src/skills/ws-shared/AGENTS.md`
- Ensure `ws-shared/AGENTS.md` contains complete skill index (36 Workflows skills), capability vocabulary links (`ws-shared/tools.md`), path tokens (`plans.dir`, `plans.specsDir`), and configuration resolution rules (`ws-shared/config.json`).

### 3. Update Installer & Wizard Guidance (`bin/cli.js`, `install-skills.sh`, `ws-configure-project`)
- File: `bin/cli.js`, `install-skills.sh`, `src/skills/ws-configure-project/SKILL.md`
- Explicitly enforce that `.agents/AGENTS.md` is never copied or required in consumer projects, pointing consumer agents exclusively to `ws-shared/AGENTS.md`.

### 4. Integration Test Suite Assertions (`test-install.js`)
- File: `test/test-install.js`
- Verify that fresh consumer installation assertions pass 100% and explicitly check that `.agents/AGENTS.md` is not written and not required in consumer test trees.

## Verification
- Run `npm run sync-skills` to update local dogfood skills.
- Run `npm run test` to verify installer, canonicity, and quality-gate assertions pass 100%.
