# `/ws-wiki sweep` (Phase 1 — sweep/backfill)

First-time (or re-runnable) sequential backfill from every top-level spec of record, in prefix order, overlaying living wiki pages so later specs win. When `index.wiki.md` carries a reachable `## Sync Baseline` commit, sweep runs bounded to that delta (step 1b) instead of every spec. Phase 1 current-code overlay bias is unchanged: when code contradicts an older spec AC, document current code. Pages use the conditional template (`## Feature` + `## How it works` required; `## Backend` / `## Frontend` / `## Third-party services` conditional).

**Aliases:** `/ws-wiki first-time`, `/ws-wiki backfill`

**Preconditions:** `{wikiDir}/index.wiki.md` must exist. If missing, STOP with a message to run `/ws-wiki init` first. Do not invent an index.

1. **Build queue (deterministic):**

   ```bash
   node {skillsRoot}/ws-wiki/scripts/list_wiki_sweep_specs.cjs --json [--repo-root .]
   ```

   Top-level `{specsDir}/*.spec.md` only; `NNNN-*.spec.md` ascending, then unprefixed lexicographically. Excludes `{wikiDir}/**`, `*.context.md`, and nested `step-00-*.spec.md`. Ambiguous dual `{slug}.spec.md` + `NNNN-{slug}.spec.md` → omit slug, record error, continue.

1b. **Baseline-bounded sweep (incremental):** When `index.wiki.md` carries a reachable `## Sync Baseline` `Commit:` (see `SKILL.md` § Incremental baseline), restrict the run to the delta instead of every top-level spec:
    - `git diff --name-status <sha>..HEAD` lists changed paths; overlay only top-level `{specsDir}` `*.spec.md` added or modified in the range (in the step-1 order) plus new specs that land after it.
    - Map changed product and doc paths to existing `{wikiDir}` pages through page provenance and path patterns; update only affected pages and new domains. Do not re-read unrelated code.
    - Fall back to the full queue when the block is missing, the SHA is unreachable, or an explicit user request asks for a full sweep.
    - Start gate states whether the queue is baseline-bounded (`<sha>..HEAD`) or full.

2. **Start gate:** Present `user-gate` once before writing feature pages:
   1. **Start spec sweep (Recommended)** — shows queue length and first/last file
   2. **Cancel**
   Cancel → STOP; write no sweep pages and no checkpoint. **`autoMode`:** take option 1 without prompting.

2b. **Verbosity gate (prose style):** Present `user-gate` once after the Start gate:
   1. **Condensed (Recommended)** — short terse statements; lowest token cost
   2. **Detailed** — paragraph prose with feature-by-feature walkthrough; disables terse rewriting for wiki bodies
   3. **Cancel**
   Cancel → STOP; write no sweep pages and no checkpoint. **`autoMode`:** take `condensed` without prompting. Persist as `verbosity` in `{wikiDir}/sweep.state.json` (default `condensed`; honor `plans.wiki.verbosity` from `{sharedDir}/config.json` as the pre-selected default when no sweep state exists; unknown values fail closed to `condensed`). A sweep choice is per-run only; sync/update resolve from `from-code.state.json`.

3. **Checkpoint (resume):** Maintain `{wikiDir}/sweep.state.json` with `status`, `completedFiles` (repo-relative POSIX paths), `lastFile`, `verbosity` (`condensed` | `detailed`, default `condensed`), `startedAt`, `updatedAt`. `--resume` continues after `lastFile` (skip completed unless `--force`). Successful full run sets `status: completed` or deletes the file. Never stage this checkpoint in product commits.

4. **Sequential overlay (one spec at a time):** For each queued spec not yet completed:
   - Read the spec of record.
   - Consult **current** shipped code/docs the spec touches (skills, scripts, tests, hub files).
   - Map bounded-context domain page(s) under `{wikiDir}/{domain}/{feature}.md`.
   - Refine pages **in place** (conditional template). Later specs supersede earlier rules. When code contradicts an older spec AC, document **current code**; spec text is provenance only.
   - Honor the run `verbosity` (`condensed` terse statements; `detailed` paragraph prose with terse rewriting disabled for wiki bodies).
   - Run `sync_wiki_index.cjs` after each successful overlay.
   - Update checkpoint `lastFile` / `completedFiles`.
   - Log progress: `{index}/{total} {file}`.

5. **No per-spec Apply/Cancel gate:** Unlike `/ws-wiki sync [slug]`, sweep does not present a per-diff Apply/Cancel gate for each spec. Mid-run **Pause** is allowed; resume from checkpoint.

6. **`--dry-run`:** Print the ordered queue (and checkpoint summary if present). Write neither wiki pages nor `sweep.state.json`.

7. **Finish:** Run `validate_wiki.cjs --check`. Report processed, skipped (ambiguous/unreadable), pages written, queue mode (baseline-bounded `<sha>..HEAD` or full), and validate exit code. On a successful bounded or full sweep, advance the `## Sync Baseline` `Commit:` to the current full `HEAD` and `Synced:` to today's date (see `SKILL.md` § Incremental baseline); `--dry-run` never advances it. Empty `{specsDir}` → success with processed `0`.

8. **Post-sweep Phase 2 offer:** After a successful sweep finish (including empty-queue success), present a `user-gate` before ending the turn:
   1. **Run Phase 2 wiki-vs-code audit (Recommended)**
   2. **Skip**
   Cancel → HS-1 STOP (no Phase 2 writes). Skip writes no verify artifacts (`verify.state.json`) and runs no spec writes. **`autoMode`:** take option 1 without prompting.
