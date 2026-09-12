---
name: ws-wiki
version: 0.4.22
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
/ws-wiki from-code              Genesis wiki from code/docs when no spec board (aliases: reverse, reconstruct)
/ws-wiki sweep                  Phase 1 sweep/backfill from all top-level specs (aliases: first-time, backfill)
/ws-wiki verify                 Phase 2 wiki-vs-code statement verify (aliases: audit, check-code)
/ws-wiki apply                  Phase 3 findings plan plus batch apply (aliases: reconcile, phase-3)
/ws-wiki sync [slug]            Sync delivered feature or commit diff to living domain wiki pages
/ws-wiki update [target]        Surgically update an individual feature wiki page
/ws-wiki validate               Deterministic validation of links and 3-section heading structures
```

Phase names: Phase 1 is sweep/backfill, Phase 2 is wiki-vs-code statement verify, Phase 3 is findings plan plus batch apply. From-code is an alternate genesis beside sweep (not Phase 4).

---

## Companion procedures (load on demand)

Read the companion **only** when invoking that subcommand. Do not preload companions at skill entry.

| Subcommand | Companion | Load when |
|------------|-----------|-----------|
| `init` | [`INIT.md`](INIT.md) | `/ws-wiki init` |
| `from-code` | [`FROM-CODE.md`](FROM-CODE.md) | `/ws-wiki from-code` (`reverse`, `reconstruct`) |
| `sweep` | [`PHASE-1-SWEEP.md`](PHASE-1-SWEEP.md) | `/ws-wiki sweep` (`first-time`, `backfill`) |
| `verify` | [`PHASE-2-VERIFY.md`](PHASE-2-VERIFY.md) | `/ws-wiki verify` (`audit`, `check-code`) |
| `apply` | [`PHASE-3-APPLY.md`](PHASE-3-APPLY.md) | `/ws-wiki apply` (`reconcile`, `phase-3`) |
| `sync` | [`SYNC.md`](SYNC.md) | `/ws-wiki sync [slug]` |
| `update` | [`UPDATE.md`](UPDATE.md) | `/ws-wiki update [target]` |

Missing `{wikiDir}/index.wiki.md` → STOP with a message to run `/ws-wiki init` first for `from-code`, `sweep`, and `verify`. Do not invent an index.

---

## `/ws-wiki validate`

Run deterministic verification:

```bash
node {skillsRoot}/ws-wiki/scripts/validate_wiki.cjs [--wiki-dir <path>] [--repo-root <path>] [--check] [--json]
```

Checks:
- Wiki directory and `index.wiki.md` exist.
- All relative markdown links resolve to existing files (broken links fail with exit 1).
- All feature subpages contain all three required sections (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`) (malformed headings fail with exit 1).
- Warns on unindexed feature pages.

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

# List from-code investigation areas with candidate paths
node {skillsRoot}/ws-wiki/scripts/list_wiki_from_code_areas.cjs --json --repo-root .
```

---

## Delivery Close Lifecycle Integration

In `ws-spec-to-pr` (Step 8 close) and `ws-spec-to-pr-lite` (Step 4 close), after implementation is completed and product code is committed, `ws-wiki sync` is offered as a post-close documentation sync step alongside `ws-spec-index` and `ws-changelog` to keep living domain documentation permanently synchronized with shipped code.
