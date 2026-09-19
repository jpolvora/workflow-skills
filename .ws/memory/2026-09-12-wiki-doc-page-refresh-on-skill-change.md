### [2026-09-12] Refresh wiki documentation page when a skill gains subcommands

- **Layer**: `harness`
- **Module**: `ws-wiki / docs site`
- **Severity**: `Medium`
- **PathPattern**: `.agents/specs/wiki/documentation/*.md; docs/wiki/**`
- **Scenario / Context**: A PR added `/ws-wiki from-code` and `list_wiki_from_code_areas.cjs` to `SKILL.md`, `runtime/CATALOG.md`, and tests, but the published wiki page `.agents/specs/wiki/documentation/ws-wiki.md` still listed only init/sweep/verify/apply/sync/update/validate. Code review flagged it (6/10). `node bin/build-site.js --check` stayed green because the generated HTML matched the stale source.
- **DO NOT**: Ship a skill subcommand or helper while its `{wikiDir}` documentation page omits it; do not assume `build-site --check` catches documentation drift (it only verifies the HTML matches its source).
- **INSTEAD DO**: When a skill adds/renames subcommands or helpers, update `{wikiDir}/documentation/<skill>.md` and run `node bin/build-site.js` so `docs/wiki/**` is regenerated in the same change.
