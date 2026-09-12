### [2026-09-12] Wiki HTML hrefs must be page-relative
- **Layer**: Web
- **Module**: Wiki site builder
- **Severity**: High
- **PathPattern**: bin/build-wiki-site.js; test/test-site-wiki.js; docs/wiki/**
- **Scenario / Context**: Publishing `{wikiDir}` markdown to `docs/wiki/` static HTML. Links authored as sibling `feature.md` from a depth-2 page.
- **DO NOT**: Return wiki-root-relative hrefs such as `documentation/ws-wiki.html` from a file already under `documentation/`. Browsers resolve that against the current directory and 404.
- **INSTEAD DO**: Convert the markdown target to an HTML path, then `path.posix.relative` from the source HTML directory. Treat bare `index.wiki.md` as the wiki-root index. Cover depth-2 sibling and parent-index cases in `test/test-site-wiki.js`.

### [2026-09-12] Wiki inline scanner must parse strong before dumping remainder
- **Layer**: Web
- **Module**: Wiki site builder
- **Severity**: Medium
- **PathPattern**: bin/build-wiki-site.js; test/test-site-wiki.js
- **Scenario / Context**: Minimal markdown subset for published wiki pages that use `**bold**` lead-ins.
- **DO NOT**: Match only single `*`/`_` emphasis, or `escapeHtml` the rest of a paragraph when the next special char search omits `*`/`_`. `**text**` then prints as literal asterisks.
- **INSTEAD DO**: Match `**`/`__` strong before single-marker em, include `*_` in the inline special-char scan, and assert `<strong>` in the wiki renderer tests.
