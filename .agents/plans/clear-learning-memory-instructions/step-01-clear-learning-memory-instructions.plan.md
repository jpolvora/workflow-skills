---
slug: clear-learning-memory-instructions
title: "Actionable Directives in Learning Steps, state.md, and MEMORY.md"
status: "plan to be refined"
---

## 0. Summary & Business Rules
Enhance all learning, memory, and state recording protocols across `workflow-skills` so that captured traps, gaps, and anti-regression insights adopt crisp, actionable DO / DO NOT directives (e.g. "When dealing with X: DO NOT use Y because Z; INSTEAD DO W"). This prevents vague, passive memory entries and ensures humans and agents immediately understand the exact implementation pattern to avoid and the correct pattern to follow.

## 1. Definition of Ready & Scope
- **AC1**: Enforce new memory template with explicit **Scenario / Context**, **DO NOT**, and **INSTEAD DO** fields in `ws-self-learning/SKILL.md`.
- **AC2**: Update `MEMORY.md.template` and compiler `self_learning.py` to format entries cleanly into DO / DO NOT rule blocks.
- **AC3**: Update `state.md` protocol docs (`ws-spec-to-pr/PROTOCOLS.md`, `ws-spec-to-pr-lite/SKILL.md`) so `step-output.learning` enforces actionable DO/DO NOT directives.
- **AC4**: Update pre-work memory consult instructions across `ws-implement-tasks`, `ws-write-plan`, `ws-code-review`, `ws-senior-developer`, and `ws-karpathy-guidelines`.
- **AC5**: Add automated tests in `test/test-memory-formatting.js` to verify compilation and structure enforcement.

## 2. Technical Design & Architecture
- Update Markdown skill documentation and protocols under `.agents/skills/`.
- Update Python memory compiler script in `.agents/skills/ws-self-learning/scripts/self_learning.py`.
- Update Node test suite under `test/`.

## 3. Step-by-Step Plan

### Step 1: Update `ws-self-learning` & `MEMORY.md.template` (AC1, AC2)
- Update `.agents/skills/ws-self-learning/SKILL.md` individual memory file template.
- Update `.agents/skills/ws-shared/MEMORY.md.template`.
- Modify `self_learning.py` to parse and render **DO NOT** and **INSTEAD DO** fields cleanly during `python self_learning.py --compile`.

### Step 2: Update Workflow State Memory Protocols (AC3)
- Update `ws-spec-to-pr/PROTOCOLS.md` and `ws-spec-to-pr-lite/SKILL.md` to specify actionable DO/DO NOT format for `step-output.learning`.

### Step 3: Update Pre-work Consult Guidance (AC4)
- Update `ws-implement-tasks/SKILL.md`, `ws-write-plan/SKILL.md`, `ws-code-review/SKILL.md`, `ws-senior-developer/SKILL.md`, and `ws-karpathy-guidelines/SKILL.md` to mandate reading DO / DO NOT directives from MEMORY.md during preflight.

### Step 4: Add Automated Tests & Harness Validation (AC5)
- Create `test/test-memory-formatting.js` or add test runner assertions verifying `self_learning.py` correctly parses and formats DO / DO NOT memory files into `MEMORY.md`.
- Run `npm run tests` and `ws-check-harness` to ensure all skills pass harness audits cleanly.

## 4. Permissions, Tenancy & i18n
- N/A (Internal agent harness documentation & tooling).

## 5. Test Coverage
- **AC1**: Verify `ws-self-learning/SKILL.md` contains the new template fields.
- **AC2**: Unit test `self_learning.py` compilation with DO NOT / INSTEAD DO formatted memory files.
- **AC3**: Verify `ws-spec-to-pr/PROTOCOLS.md` and `ws-spec-to-pr-lite/SKILL.md` include DO/DO NOT guidelines.
- **AC4**: Verify pre-work sections in all target skill files instruct reading DO/DO NOT rules.
- **AC5**: Run `node test/test-memory-formatting.js` or `npm run tests` successfully.

## 6. Invariants (Do Not Violate)
- No hardcoded absolute paths or IDE product names.
- Keep skill content in en-us.
- Preserve backward compatibility for existing memory entries.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Test cases cover all ACs.

## 8. Open Questions
- None.
