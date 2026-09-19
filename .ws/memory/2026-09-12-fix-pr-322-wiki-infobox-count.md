### [2026-09-12] Wiki infobox counts must stay data-driven
- **Layer**: Web
- **Module**: Wiki site builder
- **Severity**: Medium
- **PathPattern**: bin/build-wiki-site.js; test/test-site-wiki.js
- **Scenario / Context**: Building `docs/wiki/index.html` infobox from `{wikiDir}` pages. Empty feature set (index-only wiki, AC16 success) must render 0 domains, not a placeholder.
- **DO NOT**: Fall back with `Set.size || 8` (or any hardcoded domain total) when the feature set is empty; `Set.size` is always numeric and only 0 triggers the fallback, rendering factually wrong totals.
- **INSTEAD DO**: Use `new Set(...).size` directly for domain counts; rebuild site (`node bin/build-site.js`) and keep `test-doc-sync` green. Cover empty-wiki counts when adding infobox logic.
