---
slug: us-217
title: "ws-spec-to-pr Step 4/6 subagents do not consult frontend.md/backend.md (MEMORY consult is also weakly enforced)"
status: "plan to be refined"
---

## 0. Summary & Business Rules
Ensure that subagents in `ws-spec-to-pr` (and `ws-spec-to-pr-lite`) systematically consult `{sharedDir}/frontend.md`, `{sharedDir}/backend.md`, and `{sharedDir}/MEMORY.md` before planning, implementing, or reviewing code changes. Provide verifiable proof in `step-output` and wire `check_memory_conflict.py` into the workflow dispatch.

## 1. Definition of Ready & Scope
- AC1: `PROTOCOLS.md` & `ws-spec-to-pr-lite/SKILL.md` prompt prefix updates.
- AC2: `ws-implement-tasks` & `ws-write-plan` layer detection and `step-output` schema extension.
- AC3: `check_memory_conflict.py` dynamic `{sharedDir}` resolution and dispatch wiring.
- AC4: `ws-code-review` compiled MEMORY sweep and pattern file review rules.
- AC5: `config.schema.json` & `config.json.example` property definitions.
- AC6: Automated tests in `test/`.

## 2. Technical Design & Architecture
- Layer Edits:
  - Orchestrators: `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
  - Core Tasks: `.agents/skills/ws-implement-tasks/SKILL.md`, `.agents/skills/ws-write-plan/SKILL.md`, `.agents/skills/ws-code-review/SKILL.md`
  - Scripts: `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py`
  - Configuration: `config.schema.json`, `.agents/skills/ws-shared/config.json.example`
  - Tests: `test/test-pattern-consult.js`, `test/test-check-memory-conflict.js`

## 3. Step-by-Step Plan
1. **Base Prompt Prefix & Lite Dispatch**:
   - Update `ws-spec-to-pr/PROTOCOLS.md` lines ~35–55 with explicit `patternsFrontend` and `patternsBackend` consult directives and `step-output` proof requirement.
   - Update `ws-spec-to-pr-lite/SKILL.md` to include identical pattern and memory consult directives in inline Steps 1, 2, and 3.
2. **Implement Tasks & Write Plan Contracts**:
   - Update `ws-implement-tasks/SKILL.md` to add layer detection and document `memory_consult` and `pattern_consult` fields in `step-output`.
   - Update `ws-write-plan/SKILL.md` to add layer detection and pre-drafting pattern consult.
3. **`check_memory_conflict.py` Script & Wiring**:
   - Refactor `ws-spec-to-pr/scripts/check_memory_conflict.py` to resolve `{sharedDir}` via `resolve_consumer_root.py` or explicit CLI flags (`--shared-dir`), handling hybrid global/local installs.
   - Document `check_memory_conflict.py` execution in `STEP-DISPATCH.md` Step 1/Step 4 and `PROTOCOLS.md`.
4. **Code Review MEMORY Sweep & Pattern Checks**:
   - Update `ws-code-review/SKILL.md` to sweep compiled `MEMORY.md` entries (titles, DO NOT, INSTEAD DO) against the diff path set.
   - When diff touches UI/backend files, consult `frontend.md`/`backend.md` for project convention compliance.
5. **Config Schema & Examples**:
   - Verify/update `config.schema.json` and `.agents/skills/ws-shared/config.json.example` to define `defaults.patternsFrontend` and `defaults.patternsBackend`.
6. **Tests & Validation**:
   - Add automated test assertions verifying prompt prefixes, `step-output` schemas, and `check_memory_conflict.py`.
   - Run `npm run test`, `check_workflows.py`, and integrity verification.

## 4. Permissions, Tenancy & i18n
N/A (harness-level meta-skill changes; no product database/RBAC changes).

## 5. Test Coverage
- AC1: Test in `test/test-pattern-consult.js` checks `PROTOCOLS.md` and `ws-spec-to-pr-lite/SKILL.md` contain pattern consult instructions.
- AC2: Test verifies `ws-implement-tasks` and `ws-write-plan` SKILL.md contain `pattern_consult` and `memory_consult` in `step-output` schema.
- AC3: Test verifies `check_memory_conflict.py` runs with exit 0 on a sample plan and detects keywords against a test `MEMORY.md`.
- AC4: Test verifies `ws-code-review/SKILL.md` contains the compiled MEMORY sweep and `frontend.md`/`backend.md` checks.
- AC5: Test verifies `config.schema.json` validates `patternsFrontend` and `patternsBackend`.
- AC6: `npm run test` exits 0.

## 6. Invariants (Do Not Violate)
- Skills must remain agent- and IDE-neutral.
- Do not hardcode consumer project paths; resolve dynamically via path tokens and `config.json`.
- Do not break backward compatibility of `step-output` parsers.

## 7. Pre-PR Checklist
- [ ] Layer boundaries respected.
- [ ] Test cases cover all ACs.
- [ ] No regression in existing test suites.

## 8. Open Questions
None.
