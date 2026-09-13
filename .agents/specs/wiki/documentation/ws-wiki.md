# Living Feature Wiki & Domain Knowledge Base (`ws-wiki`)

> Provenance: `.agents/skills/ws-wiki/SKILL.md`, companions `FROM-CODE.md`/`PHASE-1-SWEEP.md`/`SYNC.md`/`UPDATE.md`, `scripts/validate_wiki.cjs`, `plans.wikiDir` and `plans.wiki.verbosity` in `{sharedDir}/config.json`.

## Feature

`ws-wiki` is the authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness. Unlike chronological changelogs (`CHANGELOG.md`) or point-in-time specifications (`*.spec.md`), `ws-wiki` maintains a consolidated living tree at `{wikiDir}` (default `.agents/specs/wiki/`) organized by bounded-context domains such as `harness/`, `delivery/`, and `providers/`. Operators bootstrap with `/ws-wiki init`, generate content from code with `/ws-wiki from-code`, backfill from specs with `/ws-wiki sweep`, audit wiki statements against the repository with `/ws-wiki verify`, reconcile findings with `/ws-wiki apply`, keep shipped features current through `/ws-wiki sync [slug]`, and surgically refresh individual pages through `/ws-wiki update [target]`. Deterministic validation runs through `/ws-wiki validate`.

Page-writing flows honor a `verbosity` prose style. `condensed` (the default) writes short one-fact-per-line statements to minimize token cost. `detailed` writes full-sentence paragraphs with feature-by-feature walkthroughs naming services, scripts, configuration keys, and side effects, and explicitly disables terse rewriting for wiki bodies. See `.agents/skills/ws-wiki/references/VERBOSITY-EXAMPLE.md` for before-and-after samples.

## How it works

Genesis begins after `index.wiki.md` exists. From-code inspects project structure and code in canonical area order from `list_wiki_from_code_areas.cjs`, merges with existing wiki pages by default, and writes the conditional template where `## Feature` and `## How it works` are required while `## Backend`, `## Frontend`, and `## Third-party services` appear only when applicable. Sweep walks top-level specs in prefix order via `list_wiki_sweep_specs.cjs`; later specs win conflicts and current code beats stale acceptance criteria when reconciling statements.

Each page-writing run resolves verbosity as explicit invocation override, then `{wikiDir}/from-code.state.json`, then `plans.wiki.verbosity` in config, then `condensed`. Unknown values fail closed to `condensed` with a warning. The Start gate in from-code and sweep asks via `user-gate` unless `autoMode` takes the persisted default without prompting.

Single-feature `sync` presents diffs in a review gate with Apply recommended, Apply-with-detailed once, or Cancel STOP, then writes, re-indexes through `sync_wiki_index.cjs`, and validates. `update` loads one target page, migrates legacy three-section headings on touch, preserves untouched sections, and validates on save. Phase 2 verify walks pages from `list_wiki_feature_pages.cjs`, classifies statements as `confirmed`, `differs`, `absent`, or `inconclusive` with file-and-line evidence, and checkpoints progress in `verify.state.json`. Phase 3 plans every `differs` or `absent` finding with a per-finding truth gate, then batch-applies wiki edits or emits standalone spec items for code fixes.

Validation accepts the new conditional template and legacy three-section pages with a deprecation warning only. Broken relative links and pages missing all required headings fail with exit code 1. Checkpoint state files are never staged in product commits.

## Backend

Deterministic helpers include `validate_wiki.cjs` (link resolution, index presence, new and legacy heading checks, `--json` and `--check`), `sync_wiki_index.cjs` (idempotent index updater), `list_wiki_sweep_specs.cjs` (prefix order with ambiguous-dual fail-closed), `list_wiki_from_code_areas.cjs` (canonical investigation order with `git-surface` always present), and `list_wiki_feature_pages.cjs` (verify order with containment gating).

Configuration resolves `{wikiDir}` from `plans.wikiDir` (default `.agents/specs/wiki`) and optional `plans.wiki.verbosity` (default `condensed`) in `{sharedDir}/config.json`. The skill registers in `CATALOG.md`, `ws-shared/autoload.md`, and `bin/skill-dependencies.json`. Post-close lifecycle integration offers `/ws-wiki sync` alongside index and changelog updates in `ws-spec-to-pr` Step 8 and lite Step 4 after product code is committed.

Legacy migration maps `Feature Overview` into `Feature`, folds `Business Rules & Logic` into `How it works` and `Backend`, and splits `Technical Architecture` into `Backend`, `Frontend`, and `Third-party services` when those layers exist in the product.
