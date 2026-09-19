### [2026-09-13] Migrated preservation clauses must name current headings

- **Layer**: `harness`
- **Module**: `ws-wiki / from-code merge mode`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/FROM-CODE.md; test/test-wiki.js`
- **Scenario / Context**: FROM-CODE merge mode was updated to fill conditional
  headings but its preservation clause still named legacy `Business Rules` /
  `Architecture` statements, inviting duplication or dropped invariants on new pages.
  A test assert locked the stale wording. Reviewer scored 6/10 on PR 326.
- **DO NOT**: Half-migrate a clause (new action verbs, old heading names); do not let
  test asserts lock pre-migration prose.
- **INSTEAD DO**: Name current headings (`## How it works` / `## Backend`) with a
  legacy-when-present migrate-on-touch qualifier, and update the locking assert to
  the new wording in the same change.
