### [2026-09-12] Wiki inline scanner must parse strong before dumping remainder
- **Layer**: Web
- **Module**: Wiki site builder
- **Severity**: Medium
- **PathPattern**: bin/build-wiki-site.js; test/test-site-wiki.js
- **Scenario / Context**: Minimal markdown subset for published wiki pages that use `**bold**` lead-ins.
- **DO NOT**: Match only single `*`/`_` emphasis, or `escapeHtml` the rest of a paragraph when the next special char search omits `*`/`_`. `**text**` then prints as literal asterisks.
- **INSTEAD DO**: Match `**`/`__` strong before single-marker em, include `*_` in the inline special-char scan, and assert `<strong>` in the wiki renderer tests.
