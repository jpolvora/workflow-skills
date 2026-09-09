---
name: ws-spec-manager
version: 0.4.6
description: Unified specification router and lifecycle manager — routes spec creation, listing, inspection, drift updating, index synchronization, organization, and archiving to specialized ws-spec-* skills.
disable-model-invocation: true
invocation_names:
  - ws-spec-manager
  - spec-manager
---

# ws-spec-manager

> When this skill is loaded, output "ws-spec-manager loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check. Verify that `{sharedDir}/config.json` exists in the current repository. If missing or unconfigured, halt and prompt via `user-gate` recommending running `ws-configure-project`.

Single memorable entry point (`/spec-manager`, `/ws-spec-manager`) and authoritative router for all specification operations across the `ws-spec-*` family.

---

## Skill Boundaries & Non-Overlap Matrix

To guarantee predictability and avoid overlapping responsibilities, `ws-spec-manager` enforces strict role boundaries:

| Need | Specialized Skill | Role Boundary (What it does vs. does NOT do) |
|---|---|---|
| **Author / Draft Spec** | [`ws-spec-write`](../ws-spec-write/SKILL.md) | Formulates requirements, testable ACs, and DoR into `{specsDir}/*.spec.md`. Calls `ws-spec-organizer` for path resolution and gates `ws-spec-index track`. Does **not** create `{plansDir}` artifacts. |
| **Validate Format** | [`ws-spec-format`](../ws-spec-format/SKILL.md) | Enforces schema and AC linting rules (`validate_spec.cjs`). Does **not** author business requirements or manage status. |
| **Path & Naming Rules** | [`ws-spec-organizer`](../ws-spec-organizer/SKILL.md) | Resolves spec-of-record paths (`resolve_spec_path.cjs`) honoring `plans.enforceSpecPrefixOrdering` and batch-organizes `NNNN-` prefixes. Does **not** edit spec content or status. |
| **List & Manage Boards** | [`ws-spec-list`](../ws-spec-list/SKILL.md) | Dual-board interactive dashboard (Specs vs. Plans) and lifecycle actions (Start, Continue, Cancel, Archive, Remove). Does **not** edit spec markdown bodies. |
| **Deep-Dive Panorama** | [`ws-spec-explain`](../ws-spec-explain/SKILL.md) | Read-only delivery panorama for **one** target (requirements, evidence, UI verification, test instructions). Does **not** modify files or change status. |
| **Requirement Drift Sync** | [`ws-spec-update`](../ws-spec-update/SKILL.md) | Updates **spec body text & ACs** when code changes drift from original requirements. Does **not** update `index.PRD` checkboxes (that is `ws-spec-index sync`). |
| **Roadmap & Status Sync** | [`ws-spec-index`](../ws-spec-index/SKILL.md) | Manages `{specsDir}/index.PRD` content. `sync` updates **checkboxes `[x]` and Done log** from delivery evidence. `track` adds an existing spec to the roadmap. Does **not** rewrite AC text. |
| **Harvest & Plan Archive** | [`ws-spec-archive`](../ws-spec-archive/SKILL.md) | Harvests completed `{plansDir}` workflow facts into `index.PRD` Archive and proposes cleanup of finished plan directories. Does **not** delete untracked scratch (that is `ws-cleanup`). |
| **Bridge / Promotion** | [`ws-spec-provider-local`](../ws-spec-provider-local/SKILL.md) | Registers `{specsDir}` spec into `{us-dir}/step-00-*.spec.md` workflow copy. |
| **Backlog Bulk Import** | [`ws-spec-from-provider`](../ws-spec-from-provider/SKILL.md) | Bulk imports open issues from GitHub or Azure DevOps into local specs. |
| **Complexity Classifier** | [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) | Evaluates spec scope and recommends `ws-spec-to-pr-lite` vs `ws-spec-to-pr`. |

---

## Invocation

### Interactive Menu
```text
/spec
/specs
/ws-spec-manager
```
Displays an interactive structured `user-gate` with 11 distinct actions.

### Direct Subcommands
```text
/spec create "<description>" [slug=...]     Draft new spec (ws-spec-write + organizer + index track)
/spec list [--specs|--plans|--active]       View interactive dual board (ws-spec-list)
/spec explain <slug|#id>                    Read-only delivery & testing panorama (ws-spec-explain)
/spec update [slug|component]               Sync spec ACs to drifted code (ws-spec-update)
/spec sync [slug]                           Sync status checkboxes in index.PRD (ws-spec-index sync)
/spec track <slug>                          Add existing spec to index.PRD (ws-spec-index track)
/spec organize [--apply|--dry-run]          Renumber/prefix specs chronologically (ws-spec-organizer)
/spec archive [--dry-run|--slug <slug>]     Harvest finished plans into index.PRD (ws-spec-archive)
/spec validate <path-to-spec>               Validate spec format & ACs (ws-spec-format)
/spec import [--dry-run|--limit N]          Bulk import tracker issues (ws-spec-from-provider)
/spec run <slug>                            Classify & execute pipeline (ws-classify-complexity)
```

---

## Steps

### 1. Resolve & Entry Check
- Read `{sharedDir}/config.json` via [`config-resolution.md`](../ws-shared/runtime/config-resolution.md).
- Resolve path tokens: `{specsDir}` (`plans.specsDir`, default `.agents/specs`), `{plansDir}` (`plans.dir`, default `.agents/plans`), `{skillsRoot}`, and `{sharedDir}`.
- If config is missing, stop and prompt to run `ws-configure-project`.
- **Done when:** Path tokens are resolved and verified in context.

### 2. Parse Intent & Subcommand
- Inspect invocation arguments:
  - If a subcommand (`create`, `new`, `list`, `ls`, `board`, `explain`, `view`, `update`, `drift`, `sync`, `status`, `track`, `organize`, `renumber`, `archive`, `validate`, `check`, `import`, `run`, `execute`) is provided, map arguments to the target skill and proceed directly to **Step 4 (Dispatch & Delegate)**.
  - If no subcommand or argument is provided (or user prompted generally to "manage specs"), proceed to **Step 3 (Interactive Menu)**.
- **Done when:** Target action and parameter set are determined.

### 3. Interactive Menu Gate
- Present `user-gate` (host structured choice, recommended first; markdown fallback). Cancel/dismiss $\rightarrow$ STOP immediately without performing mutations.
  1. **Create / Draft new spec (Recommended)** — author ACs, resolve path, and track in index.PRD (`ws-spec-write`)
  2. **List & browse specs / plans** — interactive dual board and lifecycle management (`ws-spec-list`)
  3. **Explain / inspect spec details** — read-only requirements, delivery evidence, UI check, tests (`ws-spec-explain`)
  4. **Update spec requirements (drift)** — sync ACs when code implementation has changed (`ws-spec-update`)
  5. **Sync spec status in index.PRD** — update checkboxes `[x]` and Done log from delivery evidence (`ws-spec-index sync`)
  6. **Track existing spec in index.PRD** — register unindexed spec file into roadmap (`ws-spec-index track`)
  7. **Organize & renumber specs** — enforce chronological `NNNN-` sequence and update links (`ws-spec-organizer`)
  8. **Archive completed plan history** — harvest plan facts to index.PRD and clean plan folders (`ws-spec-archive`)
  9. **Validate spec format & ACs** — schema and authoring lint check (`ws-spec-format`)
  10. **Import backlog from GitHub / ADO** — bulk import remote tracker issues (`ws-spec-from-provider`)
  11. **Run / execute spec pipeline** — classify complexity and launch Spec-to-PR (`ws-classify-complexity` $\rightarrow$ orch)
- **Done when:** User selects exactly one action, or skill terminates on cancel.

### 4. Dispatch & Delegate
Execute the specialized skill mapped from Step 2 or Step 3:

- **Action 1: Create Spec**
  - Prompt user for feature description if omitted.
  - Load [`ws-spec-write`](../ws-spec-write/SKILL.md).
  - Execute creation flow: `ws-spec-write` reformulates requirements $\rightarrow$ resolves destination via `ws-spec-organizer` $\rightarrow$ validates via `ws-spec-format` $\rightarrow$ prompts to track in `index.PRD` via `ws-spec-index track`.
- **Action 2: List / Browse**
  - Load [`ws-spec-list`](../ws-spec-list/SKILL.md) with forwarded flags (`--specs`, `--plans`, `--active`, `--unlinked`).
- **Action 3: Explain / Inspect**
  - Prompt user for target slug, spec path, or issue number if omitted.
  - Load [`ws-spec-explain`](../ws-spec-explain/SKILL.md) with target.
- **Action 4: Update (Drift Sync)**
  - Load [`ws-spec-update`](../ws-spec-update/SKILL.md) with target spec or modified component.
- **Action 5: Sync Status in index.PRD**
  - Load [`ws-spec-index`](../ws-spec-index/SKILL.md) and execute `sync [slug]`.
- **Action 6: Track in index.PRD**
  - Prompt user for slug if omitted.
  - Run `node {skillsRoot}/ws-spec-index/scripts/track_index.cjs --specs-dir {specsDir} --slug {slug}`.
- **Action 7: Organize Specs**
  - Load [`ws-spec-organizer`](../ws-spec-organizer/SKILL.md) and run `organize_specs.cjs [--apply|--dry-run]`.
- **Action 8: Archive Plans**
  - Load [`ws-spec-archive`](../ws-spec-archive/SKILL.md) with `--dry-run` or `--slug <slug>`.
- **Action 9: Validate Format**
  - Prompt user for spec path if omitted.
  - Run `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <specPath>`.
- **Action 10: Import Backlog**
  - Load [`ws-spec-from-provider`](../ws-spec-from-provider/SKILL.md).
- **Action 11: Run / Execute Pipeline**
  - Prompt user for spec slug if omitted.
  - Load [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) on `{specsDir}/{slug}.spec.md`.
  - Launch recommended orchestrator (`ws-spec-to-pr-lite` or `ws-spec-to-pr`).
- **Done when:** Specialized skill or script has been executed.

### 5. Report & Completion
- Summarize the action performed, citing outputs, modified paths, or delegated skill results.
- **Done when:** Completion message displayed to user and skill stops.

---

## Rules
- en-us; harness-neutral; path tokens only (`{specsDir}`, `{plansDir}`, `{sharedDir}`).
- Never merge Specs and Plans into a single set.
- Never duplicate logic owned by specialized skills; delegate deterministically.
- Dismissing or cancelling the `user-gate` must exit cleanly without performing changes.
