# `/ws-wiki verify` (Phase 2 — wiki-vs-code statement verify)

Read-only audit. Extract every checkable wiki statement, look it up in code, classify it, and persist findings. It does not present the apply plan and does not write wiki pages or specs during the walk.

**Aliases:** `/ws-wiki audit`, `/ws-wiki check-code`

**Preconditions:** `{wikiDir}/index.wiki.md` must exist. If missing, STOP with a message to run `/ws-wiki init` first. Do not invent an index or feature pages.

1. **Build queue (deterministic):**

   ```bash
   node {skillsRoot}/ws-wiki/scripts/list_wiki_feature_pages.cjs --json [--repo-root .]
   ```

   Every feature page under `{wikiDir}` (`**/*.md` excluding the root `index.wiki.md` and any `*.state.json`), repo-relative POSIX paths in lexicographic order. Empty feature-page set (index only) is Phase 2 success with findings `0`: run `validate_wiki.cjs --check` if the index exists, report counts, and finish with no Phase 3 gate.

2. **Sequential walk (one page at a time):** Walk pages in helper order, one page at a time (no parallel writes to the same wiki file). For each page extract checkable statements from `## How it works` and `## Backend` plus `## Frontend` / `## Third-party services` when present (list items, numbered rules, table data rows). `## Feature` contributes a statement only when the sentence is a testable invariant, not marketing prose. For legacy 3-section pages, read `## Business Rules & Logic` and `## Technical Architecture` instead (`## Feature Overview` only for testable invariants) and flag the page for migration on next touch.

3. **Evidence against code:** For each statement search the consumer project (skills, scripts, tests, hub files, application source as configured in `config.json` stack layers). Classify each statement `confirmed` (code matches) | `differs` (code contradicts or implements a different rule) | `absent` (no supporting implementation found) | `inconclusive` (cannot decide; record why). Every statement needs at least one evidence pointer (file path + line or explicit `no match`). Write classifications to the checkpoint before the next page.

4. **Checkpoint (resume):** Maintain `{wikiDir}/verify.state.json` with `status` (`running` | `audited` | `applying` | `completed`), `completedPages` (repo-relative POSIX paths), `lastFile`, `findings` (`id`, `page`, `statement`, `class`, `evidence`, `decision`), `startedAt`, `updatedAt`. `--resume` continues after `lastFile` (skip completed unless `--force`). Agents must not stage this file in product commits.

5. **Walk purity:** During the walk do not present the findings apply plan, do not apply wiki edits, do not run `ws-spec-write`, and do not mutate product source.

6. **`--dry-run`:** Print the ordered page queue (and checkpoint summary if present). Write neither wiki pages, nor `verify.state.json`, nor specs. A `--dry-run` after a partial checkpoint changes no wiki mtime/content, writes no new checkpoint, and writes no new spec files.

7. **Finish:** After the last page set checkpoint `status` to `audited`. When actionable findings (`differs`/`absent` count greater than 0) exist, present a `user-gate`:
   1. **Run Phase 3 plan and apply (Recommended)**
   2. **Skip**
   Cancel → HS-1 STOP. Skip writes no wiki or spec updates and leaves findings on disk for a later `/ws-wiki apply`. Zero actionable findings skips the gate; report `confirmed`/`differs`/`absent`/`inconclusive` counts and finish. **`autoMode`:** take option 1 without prompting when the gate is shown.

Verify performs no network calls; a regression that adds a remote fetch for verify must not ship.
