### [2026-09-13] Template-mix predicates must warn on any legacy residue

- **Layer**: `harness`
- **Module**: `ws-wiki / validate_wiki.cjs`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/scripts/validate_wiki.cjs; test/test-wiki.js`
- **Scenario / Context**: `classifyTemplate` returned `mixed` only for new-complete plus
  ALL legacy headings, so new-complete plus one stray legacy heading passed silently
  as `new`. Test 22 fixtures covered new-full/omit/legacy/malformed but no
  new-complete plus partial-legacy case. Reviewer scored 6/10 on PR 326.
- **DO NOT**: Gate the `mixed` style on full legacy residue (`missingOld.length === 0`);
  do not ship classifier changes without a partial-overlap fixture.
- **INSTEAD DO**: Classify new-complete plus any legacy heading as `mixed`
  (`hasAnyOld ? 'mixed' : 'new'`, warn-only preserved); add a hybrid fixture asserting
  exit 0 plus a `Mixed template` warning.
