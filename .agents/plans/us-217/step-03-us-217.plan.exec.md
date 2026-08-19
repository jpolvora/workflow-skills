---
slug: us-217
execMode: sequential
reason: "defaults.enableDag is false (sequential execution mode)"
planPath: ".agents/plans/us-217/step-02-us-217.plan.refined.md"
---

# Execution Plan: us-217

`defaults.enableDag` is `false` (default sequential task execution mode).

## Tasks to execute in order:
1. **Task 1: PROTOCOLS & Lite Orchestrator**: Update Base Prompt Prefix in `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` and inline steps in `.agents/skills/ws-spec-to-pr-lite/SKILL.md` with pattern & MEMORY consult requirements and proof schema.
2. **Task 2: Implement Tasks & Write Plan Skills**: Update `.agents/skills/ws-implement-tasks/SKILL.md` and `.agents/skills/ws-write-plan/SKILL.md` with layer detection, pre-draft/pre-edit consult requirements, and `pattern_consult`/`memory_consult` schema.
3. **Task 3: Memory Conflict Script & Wiring**: Refactor `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py` to resolve `{sharedDir}` dynamically (supporting `--shared-dir` and hybrid installs), and wire in `STEP-DISPATCH.md`.
4. **Task 4: Code Review Skill**: Update `.agents/skills/ws-code-review/SKILL.md` to sweep compiled MEMORY entries and inspect `frontend.md`/`backend.md` when corresponding layers are in the diff.
5. **Task 5: Config Schema & Example**: Declare `patternsFrontend` and `patternsBackend` in `config.schema.json` and `.agents/skills/ws-shared/config.json.example`.
6. **Task 6: Tests & Verification**: Implement automated test suite in `test/test-pattern-consult.js` and verify full harness.
