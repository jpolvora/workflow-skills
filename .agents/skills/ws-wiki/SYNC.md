# `/ws-wiki sync [slug]`

Synchronize shipped code changes to living domain wiki subpages (conditional template: `## Feature` + `## How it works` required; `## Backend` / `## Frontend` / `## Third-party services` conditional, omitted when not applicable):

1. **Discover Context & Evidence**:
   - If `slug` provided: load `{us-dir}/step-00-{slug}.spec.md` (or `{specsDir}/{slug}.spec.md`), committed diff `git diff {baseBranch}...HEAD`, and touched files list.
   - **Incremental mode (no slug, baseline present)**: when `index.wiki.md` carries a reachable `## Sync Baseline` `Commit:`, analyze `git diff <sha>..HEAD` and `git log --oneline <sha>..HEAD` so every change since the last wiki reconciliation is in scope; advance the watermark only when that complete range was processed (see `SKILL.md` § Incremental baseline).
   - **Vibe-Coding Mode (no spec, no reachable baseline)**: analyze `git diff HEAD~1` (or specified range) and recent commit messages to reverse-engineer business rules, validation constraints, data model changes, and API contracts directly from code.
2. **Domain Mapping & Multi-Page Partitioning**:
   - Determine which bounded context domain(s) the feature belongs to (e.g., `identity`, `billing`).
   - If a feature spans multiple modules (e.g. `orders` touches `inventory` and `notifications`), map updates across multiple domain subpages and establish cross-boundary markdown links between them.
3. **In-Place Rule Refinement**:
   - Read the existing `{wikiDir}/{domain}/{feature}.md` if present.
   - Update, reconcile, and refine existing business rules and technical architecture in place. Do **not** append repetitive chronological change logs.
   - If creating a new page, adhere to the conditional template (`## Feature`, `## How it works`, plus `## Backend` / `## Frontend` / `## Third-party services` only when applicable).
   - **Verbosity:** resolve `verbosity` as explicit gate choice > `{wikiDir}/from-code.state.json:verbosity` > `plans.wiki.verbosity` in `{sharedDir}/config.json` > `condensed`. Unknown values fail closed to `condensed`. `detailed` writes paragraph prose and disables terse rewriting for wiki bodies. `autoMode` takes the persisted/default value without prompting.
4. **Approval Review Gate**:
   - Present the synthesized wiki diffs plus the resolved `verbosity` to the user via structured `user-gate`:
     1. **Apply wiki updates (Recommended)**
     2. **Apply with detailed prose** (when resolved verbosity is `condensed`; writes this page as `detailed` once)
     3. **Cancel**
   - If **Cancel** is selected: STOP, terminate immediately without writing changes to disk.
5. **Write & Index**:
   - On approval, write the updated feature markdown files.
   - Invoke `sync_wiki_index.cjs` to register/update the feature link and one-line description in `{wikiDir}/index.wiki.md`.
   - Run `validate_wiki.cjs` to verify structural integrity.
