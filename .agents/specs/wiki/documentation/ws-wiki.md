# Living Feature Wiki & Domain Knowledge Base (`ws-wiki`)

> Provenance: `.agents/skills/ws-wiki/SKILL.md`, companions `FROM-CODE.md`/`PHASE-1-SWEEP.md`/`SYNC.md`/`UPDATE.md`, `scripts/validate_wiki.cjs`, `plans.wikiDir` config.

## Feature

`ws-wiki` is the authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness. Unlike chronological changelogs (`CHANGELOG.md`) or point-in-time specifications (`*.spec.md`), `ws-wiki` maintains a consolidated living tree at `{wikiDir}` organized by bounded-context domains.

Key subcommands include `/ws-wiki init`, `/ws-wiki from-code` (`reverse`, `reconstruct`), `/ws-wiki sweep` (`first-time`, `backfill`), `/ws-wiki verify` (`audit`, `check-code`), `/ws-wiki apply` (`reconcile`, `phase-3`), `/ws-wiki sync [slug]`, `/ws-wiki update [target]`, and `/ws-wiki validate`.

Page-writing flows support `verbosity` (`condensed` default terse; `detailed` paragraph walkthrough, terse rewriting disabled). See `.agents/skills/ws-wiki/references/VERBOSITY-EXAMPLE.md`.

## How it works

Operators bootstrap with `/ws-wiki init`, then genesis via from-code (code/docs inspection in canonical area order) or sweep (top-level specs in prefix order, later specs win, current code beats stale ACs). Merge is the default; overwrite requires an explicit confirm gate. Each run asks `verbosity` via `user-gate` (`condensed` Recommended; `autoMode` takes `condensed`) and persists it in `{wikiDir}/from-code.state.json` (`verbosity`) and/or `plans.wiki.verbosity` so later `sync`/`update` stay consistent.

Single-feature `sync` resolves `verbosity` as explicit choice > state file > config > `condensed`, presents diffs in a review gate (Apply Recommended, Apply-with-detailed once, Cancel STOP), then writes, re-indexes, and validates. `update` honors the persisted style unless overridden and preserves untouched sections.

Phase 2 verify walks pages in helper order, classifies statements `confirmed` | `differs` | `absent` | `inconclusive` with file+line evidence. Phase 3 plans every `differs`/`absent` finding with a per-finding truth gate, then batch-applies wiki edits or emits standalone `ws-spec-write` items for code fixes.

Validation accepts the new conditional template and legacy 3-section pages (warn-only migration). Broken links and malformed pages fail with exit 1.

## Backend

- Helpers: `validate_wiki.cjs` (links, index presence, `## Feature` + `## How it works` required with conditional `## Backend` / `## Frontend` / `## Third-party services`; legacy 3-section warn-compat; `--json`/`--check`), `sync_wiki_index.cjs` (idempotent index updater), `list_wiki_sweep_specs.cjs` (prefix order, ambiguous-dual fail-closed), `list_wiki_from_code_areas.cjs` (canonical order, `git-surface` always present), `list_wiki_feature_pages.cjs` (verify order, containment-gated).
- Configuration: `config.json` -> `plans.wikiDir` (default `.agents/specs/wiki`) and `plans.wiki.verbosity` (default `condensed`).
- Lifecycle: post-close docs hook in `ws-spec-to-pr` Step 8 and lite Step 4; registered in `CATALOG.md`, `ws-shared/autoload.md`, `bin/skill-dependencies.json`.
- Checkpoints (`from-code.state.json`, `sweep.state.json`, `verify.state.json`) are never staged in product commits.
