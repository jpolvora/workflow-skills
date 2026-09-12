# Spec Lifecycle (`specs`)

## Feature Overview

Specs are point-in-time delivery contracts authored in free text or reformulated from tracker issues, then planned, listed, indexed, and archived through a specialist family fronted by one router: `ws-spec-manager` (`/spec`) dispatches to `ws-spec-write` (author), `ws-spec-format` (schema/validator), `ws-spec-organizer` (paths/prefixes), `ws-spec-index` (`index.PRD` tracker), `ws-spec-list` (dual-board inventory), `ws-spec-explain` (read-only panorama), `ws-spec-update` (drift fix), and `ws-spec-archive` (harvest + cleanup). Creation flows `ws-spec-write` → `ws-spec-organizer` → `ws-spec-format` → `ws-spec-index track`. `ws-spec-list` keeps the human Spec Board (`{specsDir}/*.spec.md`) strictly separate from the transient Plan Board (`{plansDir}` runs) with gated destructive actions.

## Business Rules & Logic

- **Authoring closure**: authoring mode requires Out of Scope, Assumptions, DoR, Validation & Observation Notes, and Negative Scenarios; every requirement maps to ≥1 acceptance criterion or explicit out-of-scope; `validate_spec.cjs --mode=authoring` must pass, gray areas (≥2 product options) get a `{slug}.context.md` companion.
- **TDD execution**: plans are interrogated against DoR; implementation is failing-tests-first with positive and negative scenario verification; `ws-spec-update` (delta spec) and `ws-spec-index sync` (phase status) are never interchanged.
- **Prefix ordering is opt-in**: `plans.enforceSpecPrefixOrdering: false` by default; when true, specs-of-record use `NNNN-{slug}.spec.md` ordered by `specDate`/git first-add/mtime while frontmatter `slug` and `{plansDir}/{slug}/step-00` stay unprefixed; reorder is explicit `--apply` only, never auto-rename on install.
- **Dispatcher only**: `ws-spec-manager` never reimplements specialist logic; slice specs for task-lifecycle work never create `{plansDir}` trees.

## Technical Architecture

- **Paths**: `{specsDir}` ← `plans.specsDir` (default `.agents/specs`); `resolve_spec_path.cjs` is the single path authority; `organize_specs.cjs --dry-run/--apply` with `git mv` index backtick updates.
- **Tracking order**: `FEATURES.md` → `PLAN.md` → `PRODUCT.PRD` → `index.PRD`, skipping missing files with a note.
- **Validation**: `validate_spec.cjs --mode=authoring|compat`, `test/test-spec-dor-tdd.js`, `test/test-ws-spec-manager.js`.
- **Provenance**: living synthesis of specs 0009, 0040, 0045, 0051, 0053, and 0065.
