---
slug: us-217
title: "ws-spec-to-pr Step 4/6 subagents do not consult frontend.md/backend.md (MEMORY consult is also weakly enforced)"
status: "plan refined"
---

## 0. Summary & Business Rules
Subagents executing Step 1 (planning), Step 4 (implement-tasks), and Step 6 (code-review) in `ws-spec-to-pr` and `ws-spec-to-pr-lite` must systematically consult `{sharedDir}/frontend.md`, `{sharedDir}/backend.md`, and `{sharedDir}/MEMORY.md` before planning, writing, or reviewing code. Provide explicit proof in `step-output` and wire `check_memory_conflict.py` into the workflow dispatch.

## 1. Definition of Ready & Scope
- AC1: `PROTOCOLS.md` & `ws-spec-to-pr-lite/SKILL.md` prompt prefix updates.
- AC2: `ws-implement-tasks` & `ws-write-plan` layer detection and `step-output` schema extension.
- AC3: `check_memory_conflict.py` dynamic `{sharedDir}` resolution and dispatch wiring.
- AC4: `ws-code-review` compiled MEMORY sweep and pattern file review rules.
- AC5: `config.schema.json` & `config.json.example` property definitions.
- AC6: Automated tests in `test/`.

## 2. Technical Design & Architecture
- **Files to Modify**:
  - `ws-spec-to-pr/PROTOCOLS.md`: Extend Base Prompt Prefix with pattern and memory consult directives.
  - `ws-spec-to-pr-lite/SKILL.md`: Add pattern and memory consult instructions to Steps 1, 2, and 3.
  - `ws-implement-tasks/SKILL.md`: Document layer detection, pattern consultation before edit, and add `pattern_consult` + `memory_consult` to `step-output`.
  - `ws-write-plan/SKILL.md`: Document layer detection and pattern consultation before drafting.
  - `ws-spec-to-pr/scripts/check_memory_conflict.py`: Use dynamic `{sharedDir}` resolution with `--shared-dir` option and fallback to `resolve_consumer_root`.
  - `ws-spec-to-pr/STEP-DISPATCH.md`: Wire `check_memory_conflict.py` into Step 1 post-plan and Step 4 pre-implement checks.
  - `ws-code-review/SKILL.md`: Update MEMORY sweep to search compiled MEMORY entries (titles, DO NOT, INSTEAD DO) against diff paths and keywords, and check `frontend.md`/`backend.md` when corresponding layers are in the diff.
  - `config.schema.json`: Declare `defaults.patternsFrontend` and `defaults.patternsBackend` as boolean types.
  - `ws-shared/config.json.example`: Add `patternsFrontend` and `patternsBackend` defaults.
  - `test/test-pattern-consult.js`: Add automated verification tests.

## 3. Step-by-Step Implementation Tasks
1. **Task 1 (PROTOCOLS & Lite Orchestrator)**:
   - Edit `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`: Insert `Patterns:` and `MEMORY:` and `Proof:` instructions in Base Prompt Prefix.
   - Edit `.agents/skills/ws-spec-to-pr-lite/SKILL.md`: Add corresponding instructions into Steps 1, 2, and 3.
2. **Task 2 (Implement Tasks & Write Plan Skills)**:
   - Edit `.agents/skills/ws-implement-tasks/SKILL.md`: Add layer detection, pattern consultation steps, and `pattern_consult`/`memory_consult` schema.
   - Edit `.agents/skills/ws-write-plan/SKILL.md`: Add layer detection and pattern consultation.
3. **Task 3 (Memory Conflict Script & Dispatch Wiring)**:
   - Edit `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py`: Support dynamic `--shared-dir`, project-local and hybrid install directory resolution.
   - Edit `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`: Wire `check_memory_conflict.py` in Step 1 and Step 4.
4. **Task 4 (Code Review Skill)**:
   - Edit `.agents/skills/ws-code-review/SKILL.md`: Replace `## Review Patterns` with compiled MEMORY scan and add pattern file checks.
5. **Task 5 (Config Schema & Example)**:
   - Edit `config.schema.json` and `.agents/skills/ws-shared/config.json.example`: Define `patternsFrontend` and `patternsBackend`.
6. **Task 6 (Tests & Verification)**:
   - Create `test/test-pattern-consult.js`.
   - Run `npm run test`, `check_workflows.py`, and integrity digest updates.

## 4. Test Mapping
- AC1: `test/test-pattern-consult.js` verifies `PROTOCOLS.md` and `ws-spec-to-pr-lite/SKILL.md` contain pattern instructions.
- AC2: `test/test-pattern-consult.js` verifies `ws-implement-tasks/SKILL.md` and `ws-write-plan/SKILL.md` schema fields.
- AC3: `test/test-pattern-consult.js` executes `check_memory_conflict.py` across mock plans and memory entries.
- AC4: `test/test-pattern-consult.js` verifies `ws-code-review/SKILL.md` sweep rules.
- AC5: `test/test-pattern-consult.js` validates `config.schema.json`.
- AC6: Full suite passes.

## 5. Invariants
- Zero regression on existing test suite.
- Portable, IDE-neutral implementation.
