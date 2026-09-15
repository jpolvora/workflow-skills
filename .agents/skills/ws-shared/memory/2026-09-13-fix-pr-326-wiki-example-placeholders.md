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
