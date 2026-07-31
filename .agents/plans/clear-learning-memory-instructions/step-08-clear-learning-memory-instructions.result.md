# Delivery Result — clear-learning-memory-instructions

## Summary of Completed Work
Standardized and simplified how anti-regression traps, gaps, and learnings are recorded across `workflow-skills`. Enforced clear, direct, and actionable "DO / DO NOT" directives in memory files, `MEMORY.md`, state hygiene, and pre-work consults.

## Acceptance Criteria Status
- [x] **AC1**: Enforced **Scenario / Context**, **DO NOT**, and **INSTEAD DO** fields in `ws-self-learning/SKILL.md`.
- [x] **AC2**: Updated `MEMORY.md.template` and `self_learning.py` compiler to format entries cleanly into DO / DO NOT rule blocks.
- [x] **AC3**: Updated `state.md` protocol docs (`ws-spec-to-pr/PROTOCOLS.md`, `ws-spec-to-pr-lite/SKILL.md`) so `step-output.learning` enforces actionable DO/DO NOT directives.
- [x] **AC4**: Updated pre-work memory consult instructions across `ws-implement-tasks`, `ws-write-plan`, `ws-code-review`, `ws-senior-developer`, and `ws-karpathy-guidelines`.
- [x] **AC5**: Added automated tests in `test/test-memory-formatting.js` and updated `package.json` tests script.

## Verification
- Unit test suite: `node test/test-memory-formatting.js` PASSED.
- Integrity verification: `npm run generate-integrity && npm run verify-integrity` PASSED.
