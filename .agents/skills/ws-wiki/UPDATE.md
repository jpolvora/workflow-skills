# `/ws-wiki update [target]`

Perform targeted surgical updates on an individual feature page `{domain}/{feature}.md` (conditional template: `## Feature` + `## How it works` required; `## Backend` / `## Frontend` / `## Third-party services` conditional):

- Loads target page, updates specific business rules or technical contracts, preserves other sections, and validates upon save.
- Never advances the `## Sync Baseline` watermark (targeted flow; see `SKILL.md` § Incremental baseline).
- **Verbosity:** honors the persisted `verbosity` (`{wikiDir}/from-code.state.json:verbosity` > `plans.wiki.verbosity` in `{sharedDir}/config.json` > `condensed`) unless the invocation explicitly overrides with `verbosity=condensed|detailed`. Unknown values fail closed to `condensed`. `detailed` writes paragraph prose and disables terse rewriting for wiki bodies. `autoMode` takes the persisted/default value without prompting.
- Conditional sections stay omitted when not applicable; do not add placeholder headings.
