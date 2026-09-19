### [2026-09-13] Verifier extraction must follow writer template migrations

- **Layer**: `harness`
- **Module**: `ws-wiki / Phase 2 verify`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/PHASE-2-VERIFY.md; test/test-wiki.js`
- **Scenario / Context**: Writers (from-code/sweep/sync/update) and the validator moved
  to the conditional template, but PHASE-2-VERIFY still extracted checkable statements
  only from legacy `## Business Rules & Logic` / `## Technical Architecture`, so new
  pages verified vacuously (zero statements). No test asserted verifier extraction
  headings. Reviewer scored 6/10 on PR 326.
- **DO NOT**: Migrate writer/validator templates without sweeping reader flows
  (verifier, apply) for hardcoded old heading names.
- **INSTEAD DO**: Extract from `## How it works` + `## Backend` (+ conditionals when
  present; `## Feature` only for testable invariants), keep legacy headings as
  fallback with a migrate-on-touch flag, and assert the new headings in tests.
