---
name: ws-wiki
version: 0.4.21
disable-model-invocation: true
description: Living project feature wiki and domain knowledge base manager — initializes, synchronizes, and validates living feature documentation, business rules, and technical architecture.
invocation_names:
  - ws-wiki
  - wiki
---

# ws-wiki

> When this skill is loaded, output "ws-wiki loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check. When project configuration (`.agents/skills/ws-shared/config.json`) is missing or unconfigured, prompt via `user-gate` recommending running `ws-configure-project` before continuing.

Authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness.

Existing documents serve distinct roles:
- `CHANGELOG.md`: Chronological delivery history log.
- `index.PRD`: Implementation phases and task completion tracker.
- `*.spec.md`: Bounded, point-in-time contract for a specific delivery package.
- `ws-spec-update`: Surgical drift updater for individual delta specifications.

`ws-wiki` manages a consolidated, living feature wiki at `{wikiDir}` (`plans.wikiDir`, default `.agents/specs/wiki/`).

## Wiki Structure

1. **Root Index (`index.wiki.md`)**:
   - High-level catalog containing project overview, architectural boundaries, and system vision.
   - Domain-grouped catalog with relative markdown links to individual feature subpages: `[{Feature Title}]({domain}/{feature}.md): {One-line description}`.

2. **Domain-Partitioned Subpages (`{domain}/{feature}.md`)**:
   - Dedicated markdown documents organized by bounded context (e.g. `identity/user-management.md`, `billing/invoicing.md`).
   - Adheres strictly to the standardized 3-section format:
     - `## Feature Overview`: Purpose, user journeys, screens, forms, and core interactions.
     - `## Business Rules & Logic`: Invariants, validation constraints, permissions, state transitions, and edge cases.
     - `## Technical Architecture`: Persistence models, API contracts, backend workflows, side effects, and provenance traceability.

---

## Subcommands

```text
/ws-wiki init                   Scan project documentation to bootstrap initial index.wiki.md
/ws-wiki sweep                  Phase 1 sweep/backfill from all top-level specs (aliases: first-time, backfill)
/ws-wiki verify                 Phase 2 wiki-vs-code statement verify (aliases: audit, check-code)
/ws-wiki apply                  Phase 3 findings plan plus batch apply (aliases: reconcile, phase-3)
/ws-wiki sync [slug]            Sync delivered feature or commit diff to living domain wiki pages
/ws-wiki update [target]        Surgically update an individual feature wiki page
/ws-wiki validate               Deterministic validation of links and 3-section heading structures
```

Phase names: Phase 1 is sweep/backfill, Phase 2 is wiki-vs-code statement verify, Phase 3 is findings plan plus batch apply.

---

## Modes & Workflows

### 1. `/ws-wiki init`

Bootstrap the living wiki from existing project context:

1. **Scan Project Files**: Inspect `README.md`, `AGENTS.md`, `index.PRD`, `.prd`, `features.md`, and architectural documentation.
2. **Synthesize Domain Taxonomy**: Identify the project's core vision, bounded contexts, and key domain modules (e.g. `identity`, `catalog`, `billing`, `harness`).
3. **Generate Root Index**: Write `{wikiDir}/index.wiki.md` containing:
   - `# Project Living Feature Wiki & Domain Knowledge Base`
   - `## System Vision & Overview`
   - `## Architectural Boundaries`
   - `## Domain Catalog` with empty domain sections or seed placeholders.
4. **Guard**: If `{wikiDir}/index.wiki.md` already exists, do not overwrite without explicit user confirmation. Defer feature subpages until features are delivered.
5. **Post-init offer**: After a successful init write or confirmed refresh, present `user-gate`:
   1. **Run first-time spec sweep (Recommended)** when the wiki has no feature pages or only seed pages
   2. **Skip (index only)**
   Cancel → HS-1 STOP. Skip leaves feature pages untouched. On **Run**, invoke § `/ws-wiki sweep` below.

### 2. `/ws-wiki sweep` (Phase 1 — sweep/backfill)

First-time (or re-runnable) sequential backfill from every top-level spec of record, in prefix order, overlaying living wiki pages so later specs win. Phase 1 current-code overlay bias is unchanged: when code contradicts an older spec AC, document current code.

**Aliases:** `/ws-wiki first-time`, `/ws-wiki backfill`

**Preconditions:** `{wikiDir}/index.wiki.md` must exist. If missing, STOP with a message to run `/ws-wiki init` first. Do not invent an index.

1. **Build queue (deterministic):**

   ```bash
   node {skillsRoot}/ws-wiki/scripts/list_wiki_sweep_specs.cjs --json [--repo-root .]
   ```

   Top-level `{specsDir}/*.spec.md` only; `NNNN-*.spec.md` ascending, then unprefixed lexicographically. Excludes `{wikiDir}/**`, `*.context.md`, and nested `step-00-*.spec.md`. Ambiguous dual `{slug}.spec.md` + `NNNN-{slug}.spec.md` → omit slug, record error, continue.

2. **Start gate:** Present `user-gate` once before writing feature pages:
   1. **Start spec sweep (Recommended)** — shows queue length and first/last file
   2. **Cancel**
   Cancel → STOP; write no sweep pages and no checkpoint. **`autoMode`:** take option 1 without prompting.

3. **Checkpoint (resume):** Maintain `{wikiDir}/sweep.state.json` with `status`, `completedFiles` (repo-relative POSIX paths), `lastFile`, `startedAt`, `updatedAt`. `--resume` continues after `lastFile` (skip completed unless `--force`). Successful full run sets `status: completed` or deletes the file. Never stage this checkpoint in product commits.

4. **Sequential overlay (one spec at a time):** For each queued spec not yet completed:
   - Read the spec of record.
   - Consult **current** shipped code/docs the spec touches (skills, scripts, tests, hub files).
   - Map bounded-context domain page(s) under `{wikiDir}/{domain}/{feature}.md`.
   - Refine pages **in place** (3-section format). Later specs supersede earlier rules. When code contradicts an older spec AC, document **current code**; spec text is provenance only.
   - Run `sync_wiki_index.cjs` after each successful overlay.
   - Update checkpoint `lastFile` / `completedFiles`.
   - Log progress: `{index}/{total} {file}`.

5. **No per-spec Apply/Cancel gate:** Unlike `/ws-wiki sync [slug]`, sweep does not present 0075’s per-diff Apply/Cancel gate for each spec. Mid-run **Pause** is allowed; resume from checkpoint.

6. **`--dry-run`:** Print the ordered queue (and checkpoint summary if present). Write neither wiki pages nor `sweep.state.json`.

7. **Finish:** Run `validate_wiki.cjs --check`. Report processed, skipped (ambiguous/unreadable), pages written, and validate exit code. Empty `{specsDir}` → success with processed `0`.

8. **Post-sweep Phase 2 offer:** After a successful sweep finish (including empty-queue success), present a `user-gate` before ending the turn:
   1. **Run Phase 2 wiki-vs-code audit (Recommended)**
   2. **Skip**
   Cancel → HS-1 STOP (no Phase 2 writes). Skip writes no verify artifacts (`verify.state.json`) and runs no spec writes. **`autoMode`:** take option 1 without prompting.

### 3. `/ws-wiki sync [slug]`

Synchronize shipped code changes to living domain wiki subpages:

1. **Discover Context & Evidence**:
   - If `slug` provided: load `{us-dir}/step-00-{slug}.spec.md` (or `{specsDir}/{slug}.spec.md`), committed diff `git diff {baseBranch}...HEAD`, and touched files list.
   - **Vibe-Coding Mode (no spec)**: When no spec exists, analyze `git diff HEAD~1` (or specified range) and recent commit messages to reverse-engineer business rules, validation constraints, data model changes, and API contracts directly from code.
2. **Domain Mapping & Multi-Page Partitioning**:
   - Determine which bounded context domain(s) the feature belongs to (e.g., `identity`, `billing`).
   - If a feature spans multiple modules (e.g. `orders` touches `inventory` and `notifications`), map updates across multiple domain subpages and establish cross-boundary markdown links between them.
3. **In-Place Rule Refinement**:
   - Read the existing `{wikiDir}/{domain}/{feature}.md` if present.
   - Update, reconcile, and refine existing business rules and technical architecture in place. Do **not** append repetitive chronological change logs.
   - If creating a new page, adhere strictly to the 3-section structure (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`).
4. **Approval Review Gate**:
   - Present the synthesized wiki diffs to the user via structured `user-gate`:
     1. **Apply wiki updates (Recommended)**
     2. **Cancel**
   - If **Cancel** is selected: STOP, terminate immediately without writing changes to disk.
5. **Write & Index**:
   - On approval, write the updated feature markdown files.
   - Invoke `sync_wiki_index.cjs` to register/update the feature link and one-line description in `{wikiDir}/index.wiki.md`.
   - Run `validate_wiki.cjs` to verify structural integrity.

### 4. `/ws-wiki update [target]`

Perform targeted surgical updates on an individual feature page `{domain}/{feature}.md`:
- Loads target page, updates specific business rules or technical contracts, preserves other sections, and validates upon save.

### 5. `/ws-wiki validate`

Run deterministic verification:
```bash
node {skillsRoot}/ws-wiki/scripts/validate_wiki.cjs [--wiki-dir <path>] [--repo-root <path>] [--check] [--json]
```
Checks:
- Wiki directory and `index.wiki.md` exist.
- All relative markdown links resolve to existing files (broken links fail with exit 1).
- All feature subpages contain all three required sections (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`) (malformed headings fail with exit 1).
- Warns on unindexed feature pages.

### 6. `/ws-wiki verify` (Phase 2 — wiki-vs-code statement verify)

Read-only audit. Extract every checkable wiki statement, look it up in code, classify it, and persist findings. It does not present the apply plan and does not write wiki pages or specs during the walk.

**Aliases:** `/ws-wiki audit`, `/ws-wiki check-code`

**Preconditions:** `{wikiDir}/index.wiki.md` must exist. If missing, STOP with a message to run `/ws-wiki init` first. Do not invent an index or feature pages.

1. **Build queue (deterministic):**

   ```bash
   node {skillsRoot}/ws-wiki/scripts/list_wiki_feature_pages.cjs --json [--repo-root .]
   ```

   Every feature page under `{wikiDir}` (`**/*.md` excluding the root `index.wiki.md` and any `*.state.json`), repo-relative POSIX paths in lexicographic order. Empty feature-page set (index only) is Phase 2 success with findings `0`: run `validate_wiki.cjs --check` if the index exists, report counts, and finish with no Phase 3 gate.

2. **Sequential walk (one page at a time):** Walk pages in helper order, one page at a time (no parallel writes to the same wiki file). For each page extract checkable statements from `## Business Rules & Logic` and `## Technical Architecture` (list items, numbered rules, table data rows). `## Feature Overview` contributes a statement only when the sentence is a testable invariant (permissions, required fields, state machine), not marketing purpose prose.

3. **Evidence against code:** For each statement search the consumer project (skills, scripts, tests, hub files, application source as configured in `config.json` stack layers). Classify each statement `confirmed` (code matches) | `differs` (code contradicts or implements a different rule) | `absent` (no supporting implementation found) | `inconclusive` (cannot decide; record why). Every statement needs at least one evidence pointer (file path + line or explicit `no match`). Write classifications to the checkpoint before the next page.

4. **Checkpoint (resume):** Maintain `{wikiDir}/verify.state.json` with `status` (`running` | `audited` | `applying` | `completed`), `completedPages` (repo-relative POSIX paths), `lastFile`, `findings` (`id`, `page`, `statement`, `class`, `evidence`, `decision`), `startedAt`, `updatedAt`. `--resume` continues after `lastFile` (skip completed unless `--force`). Agents must not stage this file in product commits.

5. **Walk purity:** During the walk do not present the findings apply plan, do not apply wiki edits, do not run `ws-spec-write`, and do not mutate product source.

6. **`--dry-run`:** Print the ordered page queue (and checkpoint summary if present). Write neither wiki pages, nor `verify.state.json`, nor specs. A `--dry-run` after a partial checkpoint changes no wiki mtime/content, writes no new checkpoint, and writes no new spec files.

7. **Finish:** After the last page set checkpoint `status` to `audited`. When actionable findings (`differs`/`absent` count greater than 0) exist, present a `user-gate`:
   1. **Run Phase 3 plan and apply (Recommended)**
   2. **Skip**
   Cancel → HS-1 STOP. Skip writes no wiki or spec updates and leaves findings on disk for a later `/ws-wiki apply`. Zero actionable findings skips the gate; report `confirmed`/`differs`/`absent`/`inconclusive` counts and finish. **`autoMode`:** take option 1 without prompting when the gate is shown.

### 7. `/ws-wiki apply` (Phase 3 — findings plan plus batch apply)

Plan and updating pass. Show the findings plan, collect truth decisions, then batch-apply wiki edits and generate code-change specs.

**Aliases:** `/ws-wiki reconcile`, `/ws-wiki phase-3`

**Preconditions:** Requires a checkpoint with `status: audited` (or leftover `pending` decisions). Missing checkpoint → STOP with a message to run `/ws-wiki verify` first. `--resume` continues truth gates then apply.

1. **Findings plan:** Present every `differs` and `absent` finding with wiki path, quoted statement, code evidence (paths + short excerpt or `no match`), and two truth options (proposed wiki edit vs proposed code-change spec). Do not write wiki pages or specs until truth decisions are recorded. `confirmed` / `inconclusive` counts appear in the summary only.

2. **Truth gate per finding:** For each actionable finding present a `user-gate` (host structured choice via `askQuestion` when that tool is bound; markdown fallback otherwise):
   1. **Update wiki (Recommended)** — code (or absence of code) is the source of truth; schedule a wiki edit that drops or rewrites the statement.
   2. **Update code** — the wiki statement stays; schedule a new spec so implementation can be changed to match.
   Cancel / dismiss → HS-1 STOP; keep already-recorded decisions; do not apply the remaining un-decided batch. Undecided findings stay `pending`.

3. **Batch apply after all decisions (or after STOP of remaining):**
   - **Wiki batch:** Apply scheduled wiki edits in one pass. Edits are in-place 3-section pages with no changelog append. Writer targets reuse the `assertContained` pattern for paths under `{wikiDir}`; a path-traversal domain/feature from a malicious wiki filename is rejected and no write leaves `{wikiDir}`. Run `sync_wiki_index.cjs` after the batch if titles/one-liners changed, then `validate_wiki.cjs --check`. Product `.cjs` and skill bodies outside `{wikiDir}` are not edited for those findings.
   - **Code batch:** Do not edit product code in this skill. For each finding marked Update code, invoke standalone `ws-spec-write` (skill `ws-spec-write`, not a `{plansDir}` register) with a description that is exactly the template `Update feature {title} to reflect current wiki statement: {statement}` (`{title}` from the wiki page title or index one-liner, `{statement}` the quoted wiki text). Frontmatter `source: local`. Those specs land under `{specsDir}` only.

4. **Close:** Phase 3 does not implement those specs and does not start an orchestrator (`ws-spec-to-pr` / lite is out of band). Successful apply sets checkpoint `status` to `completed` or deletes the file.

Verify performs no network calls; a regression that adds a remote fetch for verify must not ship.

---

## Deterministic Helpers

```bash
# Validate wiki links and heading structures
node {skillsRoot}/ws-wiki/scripts/validate_wiki.cjs --check

# Register or update a feature link in index.wiki.md
node {skillsRoot}/ws-wiki/scripts/sync_wiki_index.cjs \
  --domain identity \
  --feature user-management \
  --title "User Management" \
  --description "User onboarding, credential lifecycle, and role assignment."

# List top-level specs in sweep order
node {skillsRoot}/ws-wiki/scripts/list_wiki_sweep_specs.cjs --json --repo-root .

# List feature pages in Phase 2 verify order
node {skillsRoot}/ws-wiki/scripts/list_wiki_feature_pages.cjs --json --repo-root .
```

---

## Delivery Close Lifecycle Integration

In `ws-spec-to-pr` (Step 8 close) and `ws-spec-to-pr-lite` (Step 4 close), after implementation is completed and product code is committed, `ws-wiki sync` is offered as a post-close documentation sync step alongside `ws-spec-index` and `ws-changelog` to keep living domain documentation permanently synchronized with shipped code.
