# `/ws-wiki init`

Bootstrap the living wiki from existing project context:

1. **Scan Project Files**: Inspect `README.md`, `AGENTS.md`, `index.PRD`, `.prd`, `features.md`, and architectural documentation.
2. **Synthesize Domain Taxonomy**: Identify the project's core vision, bounded contexts, and key domain modules (e.g. `identity`, `catalog`, `billing`, `harness`).
3. **Generate Root Index**: Write `{wikiDir}/index.wiki.md` containing:
   - `# Project Living Feature Wiki & Domain Knowledge Base`
   - `## System Vision & Overview`
   - `## Architectural Boundaries`
   - `## Domain Catalog` with empty domain sections or seed placeholders.
   - `## Sync Baseline` seeded with `- Commit: \`<current full HEAD SHA>\`` and `- Synced: \`<YYYY-MM-DD>\`` (exact names per `SKILL.md` § Incremental baseline); skip the block only when the project is not a git repository.
4. **Guard**: If `{wikiDir}/index.wiki.md` already exists, do not overwrite without explicit user confirmation. Defer feature subpages until features are delivered.
5. **Post-init offer**: After a successful init write or confirmed refresh, present `user-gate` based on top-level spec count from `list_wiki_sweep_specs.cjs --json`:

   **Zero** top-level `{specsDir}/*.spec.md`:
   1. **Run from-code reconstruction (Recommended)**
   2. **Run first-time spec sweep**
   3. **Skip (index only)**

   **One or more** top-level specs:
   1. **Run first-time spec sweep (Recommended)**
   2. **Run from-code (merge)**
   3. **Skip (index only)**

   Cancel → HS-1 STOP. Skip leaves feature pages untouched. On **Run from-code**, invoke `FROM-CODE.md`. On **Run sweep**, invoke `PHASE-1-SWEEP.md`.
