### [2026-09-13] Wiki examples must not keep placeholder conditional sections

- **Layer**: `harness`
- **Module**: `ws-wiki / conditional template docs`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/references/*.md; test/test-wiki.js`
- **Scenario / Context**: `VERBOSITY-EXAMPLE.md` Detailed example kept a `## Third-party services`
  section whose body only said the section was omitted, contradicting the normative
  no-placeholder omission rule in Notes/SKILL/SYNC. Test 22 asserted the example only
  contained Condensed/Detailed strings, so the contradiction was untested. Reviewer
  scored 6/10 on PR 326.
- **DO NOT**: Illustrate an inapplicable conditional section with a placeholder heading
  plus "omitted" body in example fixtures; do not assert only style-name strings for
  example docs.
- **INSTEAD DO**: Omit the heading and use an HTML-comment omission note inside the
  example fence; assert `!example.includes('## <Section>')` for inapplicable
  conditionals in Test 22.

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
