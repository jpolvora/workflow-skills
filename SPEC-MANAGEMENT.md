# Spec Management Skills Guide

> Human-friendly index of all `ws-*` skills that own the spec lifecycle in this repo.
> SoT remains `.agents/skills/ws-*/SKILL.md` — this file is a router, not a duplicate.

**Roots:**

- Specs (human-facing): `{specsDir}` ← `plans.specsDir` (default `.agents/specs`)
- Plans (workflow runs): `{plansDir}` ← `plans.dir` (default `.agents/plans`)
- Rule: **Specs ≠ Plans** — never merge them into one inventory.

## Lifecycle

```text
write-spec → spec-format → spec-organizer ─┐
                                           ├→ local-spec-provider → spec-list → multi-spec → explain
spec-from-provider (bulk import) ──────────┘         ↓
                                              spec-index ↔ spec-archive
                                                     ↓
                                                sync-spec (drift fix)
```

## Quick Router Table

| Skill | What it does | Use when |
|-------|--------------|----------|
| [`ws-write-spec`](#1-ws-write-spec--author) | Drafts / reformulates `{specsDir}/*.spec.md` from free-text or tracker snapshot | Creating a new spec, turning an issue into testable ACs |
| [`ws-spec-format`](#2-ws-spec-format--schema) | Canonical `*.spec.md` schema + validator | Creating, reviewing, or reformatting a spec; CI authoring gate |
| [`ws-spec-organizer`](#3-ws-spec-organizer--paths) | Spec-of-record path resolver + `NNNN-` organizer | Resolving spec path, enabling chronological prefixes, organizing board |
| [`ws-local-spec-provider`](#4-ws-local-spec-provider--bridge) | Bridge `{specsDir}` ↔ `{us-dir}/step-00-*.spec.md` | Registering a hand-written spec to start a workflow |
| [`ws-spec-from-provider`](#5-ws-spec-from-provider--bulk-import) | Bulk-import GitHub issues / ADO stories → local specs + register | Importing tracker backlog for `ws-spec-list` / `ws-multi-spec` |
| [`ws-spec-list`](#6-ws-spec-list--board) | Dual board Specs vs Plans + manage menu | Listing, picking, Start / Continue / Finish / Cancel / Archive / Remove |
| [`ws-spec-index`](#7-ws-spec-index--prd) | Manages `{specsDir}/index.PRD` init / sync / promote / track | Bootstrapping PRD, syncing shipped status, promoting ideas |
| [`ws-spec-explain`](#8-ws-spec-explain--panorama) | Read-only panorama of one spec / US / issue | Asking status, what it delivers, how to check / test |
| [`ws-sync-spec`](#9-ws-sync-spec--drift-fix) | Surgical body sync when code drifted from AC text | Fixing spec drift after prompt-driven code changes |
| [`ws-spec-archive`](#10-ws-spec-archive--history) | Harvests `{plansDir}` facts → `index.PRD` Archive + cleanup proposal | Archiving shipped plan folders without losing history |
| [`ws-multi-spec`](#11-ws-multi-spec--batch) | Sequential batch delivery over multiple specs | Delivering a queue spec-by-spec with auto lite/standard routing |

---

## Details

### 1. `ws-write-spec` — Author

**Path:** `.agents/skills/ws-write-spec/SKILL.md`

**What:** Writes the spec of record under `{specsDir}` only. Reformulates raw human / tracker text into agentic-ready Description + atomic testable ACs + Out of Scope + Assumptions + DoR + Validation Notes + Original Issue Context. Validates with `validate_spec.cjs --mode=authoring`.

**Use when:**

- `/write-spec "<description>" [slug=...] [--register]`
- `/write-spec --from-issue <json/md> [source=github|azure-devops]`
- Orch Step 0 free-text entry (`source: local`) or tracker reformulation (`source: github|azure-devops`)

**Don't use when:** you need the workflow copy — that is `ws-local-spec-provider --register`. No `{plansDir}` writes here.

<details>
<summary>Inputs / outputs</summary>

- In: description text, or issue snapshot + `slug`, `source`, `output-dir`
- Out: `{specsDir}/{slug}.spec.md` (or `NNNN-{slug}.spec.md` if prefix ordering on) + optional `.context.md` for gray areas
- Standalone ends with `index.PRD` user-gate: **Add to index.PRD (Recommended)** / Skip tracking
</details>

---

### 2. `ws-spec-format` — Schema

**Path:** `.agents/skills/ws-spec-format/SKILL.md` · Schema: `.agents/skills/ws-spec-format/FORMAT.md`

**What:** Canonical format SoT. Other skills reference it, never duplicate it. Three modes: `create` / `review` / `format`.

**Use when:**

- `/ws-spec-format`, create / review / format / validate phrasing
- New writes must pass authoring mode; historical files use compat mode (warn, don't fail)

```bash
node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring|compat <spec>
```

**Don't use when:** drafting free-text content — delegate to `ws-write-spec`.

<details>
<summary>Review checklist</summary>

- Frontmatter (`slug`, `source`, `id`, tracker fields when remote)
- Required sections + AC quality
- Tracker specs need `### Prior Work Sweep` when sweep ran
- Modification specs need `### Design Intent` or greenfield skip reason
- New specs need closure: Out of Scope, Assumptions, DoR, Validation Notes
</details>

---

### 3. `ws-spec-organizer` — Paths

**Path:** `.agents/skills/ws-spec-organizer/SKILL.md`

**What:** Single source of truth for spec-of-record paths. Honors `plans.enforceSpecPrefixOrdering` (`false` → `{slug}.spec.md`, `true` → `NNNN-{slug}.spec.md`). Writers must call it instead of hardcoding paths.

**Use when:**

- Resolving write destination before any spec write
- Organizing an existing board chronologically by `specDate` → git first-add → mtime

```bash
node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug <slug> [--repo-root .] [--context] [--json]
node .agents/skills/ws-spec-organizer/scripts/organize_specs.cjs [--dry-run|--apply] [--json]
```

<details>
<summary>Invariants</summary>

- Frontmatter `slug` always unprefixed
- `{plansDir}/{slug}/` never prefixed
- Companion `.context.md` gets matching prefix
- Existing on-disk path always wins (no double-prefix)
</details>

---

### 4. `ws-local-spec-provider` — Bridge

**Path:** `.agents/skills/ws-local-spec-provider/SKILL.md`

**What:** Filesystem entry + promotion primitive. Normalizes any `*.spec.md` into two ordered artifacts: (1) spec of record under `{specsDir}`, (2) workflow copy `{us-dir}/step-00-{slug}.spec.md`. This `register_local_spec.cjs` is the single promotion path all providers use.

**Use when:**

- `/ws-local-spec-provider fetch-to-spec <path|slug> [--source local|github|azure-devops] [--force]`
- Orch entry when `providers.active=local` or input is `*.spec.md`
- After `ws-write-spec` when workflow needs a `step-00` copy (`--register`)

```bash
node .agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs --input path/to/feature.spec.md --source local
```

**Don't use when:** remote fetch is needed — use GitHub / ADO provider `fetch-to-spec` first, then reformulate via `ws-write-spec`.

---

### 5. `ws-spec-from-provider` — Bulk Import

**Path:** `.agents/skills/ws-spec-from-provider/SKILL.md`

**What:** Batch tracker → local specs. Lists open GitHub issues (all assignees) or open ADO User Stories (`@Me`), skips already-imported ids, confirms via user-gate, then per id: provider snapshot → `ws-write-spec` reformulation → full register.

**Use when:**

```text
/ws-spec-from-provider
/ws-spec-from-provider --dry-run
/ws-spec-from-provider --limit N
```

Importing backlog for `/ws-spec-list` or `/ws-multi-spec`.

**Skip rule:** drops id when `{specsDir}/us-{id}.spec.md`, `NNNN-us-{id}.spec.md`, or `{plansDir}/us-{id}/step-00-*.spec.md` exists. No `--force` here.

<details>
<summary>Flow per id</summary>

1. Provider `fetch-to-spec` phases 1–2 (snapshot + base converter)
2. `ws-write-spec` agentic reformulation (`source: github|azure-devops`)
3. `register_local_spec.cjs --input "{specsDir}/us-{id}.spec.md" --source {github|azure-devops}`
4. Report: imported / skipped / failed
</details>

---

### 6. `ws-spec-list` — Board

**Path:** `.agents/skills/ws-spec-list/SKILL.md` · Actions: `.agents/skills/ws-spec-list/ACTIONS.md`

**What:** Interactive two-board + menu. Keeps Spec set (`{specsDir}/**/*.spec.md`) and Plan set (`{plansDir}/**/*.state.md`) separate, links by slug, prints two tables with global `#` index for Select.

**Use when:**

```text
/ws-spec-list
/ws-spec-list --specs
/ws-spec-list --plans
/ws-spec-list --active
/ws-spec-list --status active|completed|cancelled|failed
/ws-spec-list --unlinked
```

Listing, picking, Start / Continue (hands off to orch), Finish / Cancel / Archive / Remove (confirm required).

**Don't use when:** rewriting AC bodies (`ws-sync-spec`) or editing `index.PRD` content (`ws-spec-index`).

<details>
<summary>Behavior notes</summary>

- Sort Specs: unlinked → linked (alpha). Sort Plans: active → failed → cancelled → completed; archived last
- Cap 25 rows; filter with flags
- `step-00-*.spec.md` is a plan artifact, never a Spec-board row
- Remove spec = delete `{specsDir}` file only; Remove plan = delete `{us-dir}/` only
</details>

---

### 7. `ws-spec-index` — PRD

**Path:** `.agents/skills/ws-spec-index/SKILL.md` · Ref: `.agents/skills/ws-spec-index/REFERENCE.md`

**What:** Owns `index.PRD` content: init / status sync / promote / track. Not code↔spec drift, not plan history harvest, not the dual board.

**Use when:**

```text
/ws-spec-index init [sourcePath]
/ws-spec-index sync [slug]
/ws-spec-index promote <inboxItem>
/ws-spec-index track <slug>
```

- `init`: bootstrap `{specsDir}/index.PRD` from README/PRD/free text (guard: no overwrite without `--force`)
- `sync`: auto-run at delivery/ship exit — requires E1 evidence (delivery commit or PR URL + matching row/slug); idempotent `[ ]` → `[x]` + Done log
- `promote`: Inbox → phase bullet + Next-specs row (+ optional stub spec)
- `track`: deterministic helper for standalone `/write-spec` gate

```bash
node .agents/skills/ws-spec-index/scripts/track_index.cjs --specs-dir {specsDir} --slug {slug}
```

---

### 8. `ws-spec-explain` — Panorama

**Path:** `.agents/skills/ws-spec-explain/SKILL.md` · Report: `.agents/skills/ws-spec-explain/references/REPORT.md`

**What:** Read-only status + delivery panorama for one target. Edits nothing. Collects local evidence (spec of record → step-00 → state → plan → result) + code/remote evidence (Grep/Glob + one SCM provider for issue/PR summary only), classifies `not-started|in-progress|delivered|blocked|unknown`, emits six-heading report.

**Use when:**

```text
/ws-spec-explain <spec-file|#NNN|us-NNN|slug|tracker-URL>
/explain us-217
```

After `ws-ship-pr` / `ws-goal-fix-pr` chain, or when user asks "what does this spec do / how to test".

**Output:** Summary, What it does, What it delivers/delivered, Evidence, How to check (project/UI), How to test.

---

### 9. `ws-sync-spec` — Drift Fix

**Path:** `.agents/skills/ws-sync-spec/SKILL.md`

**What:** Surgical body updater when code drifted from AC text. Resolves spec of record via `ws-spec-organizer`, diffs `git status/diff` scope against spec, drafts in-place edits + Revision History entry, gates on user approval, then applies.

**Use when:**

```text
/ws-sync-spec [target-spec-or-component]
```

Auto-run after task completion (alongside `ws-changelog`, `ws-self-learning`), or standalone when prompt changed controller/route/view/business logic weeks after delivery.

**If no spec found:** reports `No existing spec found` + suggests `ws-write-spec`. Not `ws-spec-index sync` (that is checkboxes vs delivery evidence).

---

### 10. `ws-spec-archive` — History

**Path:** `.agents/skills/ws-spec-archive/SKILL.md` · Schema: `.agents/skills/ws-spec-archive/references/ARCHIVE.md`

**What:** Archives `{plansDir}` workflow history into `{specsDir}/index.PRD` so shipped plan folders can be deleted without losing delivery facts. Complements `ws-spec-index` (status sync) and `ws-cleanup` (untracked scratch).

**Use when:**

```text
/ws-spec-archive
/ws-spec-archive --dry-run
/ws-spec-archive --slug <slug>
```

**Flow:** scan (`scan_plans.cjs`) → enrich (changelog + MEMORY + git log + one provider `sweep-prior-work`) → preview (`apply_archive.cjs --dry-run`) → user-gate (1. Write index only / 2. Write + delete eligible / 3. Dry-run only) → apply → propose commit.

**Rules:** delete only inventory-`eligible` slugs under `{plansDir}`; `{specsDir}/*.spec.md` stay; active/paused dirs stay.

---

### 11. `ws-multi-spec` — Batch

**Path:** `.agents/skills/ws-multi-spec/SKILL.md` · Protocol: `.agents/skills/ws-multi-spec/PROTOCOL.md`

**What:** Sequential multi-spec batch orchestrator with smart complexity + flow auto-detection. Blank scan lists only pending/unfinished specs. Per spec: classify (`ws-classify-complexity`) → `ws-spec-to-pr-lite` (≤3 steps / ≤6 files / ≤2 layers / `complexity: low`) else `ws-spec-to-pr` → fix-pr → merge → next.

**Use when:**

```text
/ws-multi-spec
/ws-multi-spec {specsDir}/13-runner.spec.md {specsDir}/14-editor.spec.md
/ws-multi-spec {plansDir}/ws-multi-spec/ms-20260725T220000Z.state.md
```

Batch queues. Interactive pick-one delegates to `ws-spec-list`.

**Invariants:** one worker at a time; base-branch sync before/after each; every PR through `ws-goal-fix-pr` (`activeThreads == 0`) + explicit SCM merge before next; pause on failure (Resume/Skip/Abort).

---

## See Also

- Format SoT: `.agents/skills/ws-spec-format/FORMAT.md`
- Router: `.agents/skills/ws-shared/autoload.md`
- Hub: `AGENTS.md` · Consumer hub: `.agents/skills/ws-shared/AGENTS.md`
- Related (not spec-management): `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-write-plan`, `ws-verify-plan`, `ws-cleanup`, `ws-spec-memo`
