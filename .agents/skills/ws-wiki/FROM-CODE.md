# `/ws-wiki from-code`

Alternate whole-tree wiki genesis beside Phase 1 sweep. Inspect project structure and code in deterministic area order, merge with existing wiki/specs/docs (default), write or refine `{wikiDir}/{domain}/{feature}.md` pages in the conditional template (`## Feature` + `## How it works` required; `## Backend` / `## Frontend` / `## Third-party services` conditional, omitted when not applicable).

**Aliases:** `reverse`, `reconstruct`

**Not Phase 4.** Does not call `ws-spec-write`, register `{plansDir}`, or mutate product source.

**Preconditions:** `{wikiDir}/index.wiki.md` must exist. If missing, STOP with a message to run `/ws-wiki init` first. Do not invent an index or feature pages.

**Context precedence (merge, highest first):**

1. Existing `{wikiDir}` feature pages (do not delete statements).
2. Top-level specs of record, when present (hints / provenance, not a Phase 1 overlay).
3. Project docs: `README.md`, `AGENTS.md`, `STACK.md`, `docs/`, `FEATURES.md`, `index.PRD` when they exist.
4. Inferred behavior from code, tests, CI, and a bounded git surface.

## Flow

1. **Area map (deterministic):**

   ```bash
   node {skillsRoot}/ws-wiki/scripts/list_wiki_from_code_areas.cjs --json [--repo-root .]
   ```

   Canonical area ids in order: `structure`, `frontend`, `backend`, `ci-cd`, `docs`, `domains`, `quality`, `ship`, `git-surface`. Filesystem areas with zero candidate paths are omitted from `areas` and recorded in `skipped`. `git-surface` is always in `areas` with `paths: []` (local `git log --oneline -20` and branch names from `config.project`; no remote fetch).

2. **Start gate:** Present `user-gate` once before writing feature pages:
   1. **Start merge reconstruction (Recommended)** — shows area count and mode
   2. **Overwrite existing wiki from code** — shown only when feature pages already exist; full replacement of page bodies
   3. **Cancel**
   Cancel → STOP; write no wiki pages and no `from-code.state.json`. **`autoMode`:** take option 1 without prompting.

2b. **Verbosity gate (prose style):** Present `user-gate` once after the Start gate and before the checkpoint:
   1. **Condensed (Recommended)** — short terse statements, one fact per line; lowest token cost
   2. **Detailed** — full-sentence paragraphs, feature-by-feature walkthrough; disables terse rewriting for wiki bodies
   3. **Cancel**
   Cancel → STOP; write no wiki pages and no `from-code.state.json`. **`autoMode`:** take `condensed` without prompting. Persist the choice as `verbosity: condensed|detailed` in `{wikiDir}/from-code.state.json` (and honor `plans.wiki.verbosity` from `{sharedDir}/config.json` as the pre-selected default when no state exists). Unknown persisted values fail closed to `condensed` with a warning. `detailed` pages still use the conditional template; only the prose depth changes.

3. **Overwrite confirm (only when option 2 was picked and feature pages already exist):** Present a second `user-gate`:
   1. **Confirm overwrite existing wiki from code**
   2. **Cancel**
   Cancel → STOP. Overwrite without this confirm must not replace existing feature page bodies.

4. **Checkpoint (resume):** Maintain `{wikiDir}/from-code.state.json` with `status` (`running` | `completed`), `completedAreas`, `lastArea`, `mode` (`merge` | `overwrite`), `verbosity` (`condensed` | `detailed`, default `condensed`), `startedAt`, `updatedAt`. `--resume` continues after `lastArea` (skip completed unless `--force`). Agents must not stage this file in product commits.

5. **Sequential investigation (one area at a time):** For each queued area not yet completed:
   - Read existing wiki pages that map to the area.
   - Read matching docs/specs and listed source paths.
   - **Merge mode:** create missing domain/feature pages and fill empty conditional headings from code/docs; do not drop existing Business Rules or Architecture statements.
   - **Overwrite mode (after confirm):** may replace page bodies but still writes conditional-template pages.
   - Honor the persisted `verbosity`: `condensed` writes one-fact-per-line statements; `detailed` writes paragraph prose and disables terse rewriting for wiki bodies.
   - Run `sync_wiki_index.cjs` after each successful area.
   - Update checkpoint `lastArea` / `completedAreas`.
   - Log progress: `{index}/{total} {areaId}`.

6. **`--dry-run`:** Print the ordered area queue (and checkpoint summary if present). Write neither wiki pages nor `from-code.state.json`. A `--dry-run` after a partial checkpoint changes no wiki mtime/content and writes no new checkpoint.

7. **Finish:** Run `validate_wiki.cjs --check`. Report processed areas, skipped areas, pages written, and validate exit code.

8. **Post-finish Phase 2 offer:** After a successful from-code finish, present `user-gate`:
   1. **Run Phase 2 wiki-vs-code audit (Recommended)**
   2. **Skip**
   Cancel → HS-1 STOP. Skip writes no verify artifacts. **`autoMode`:** take option 1 without prompting.
