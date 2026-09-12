---
name: ws-wiki
version: 0.4.19
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

`ws-wiki` manages a consolidated, living feature wiki at `{specsDir}/wiki/` (configurable via `plans.wikiDir`, defaulting to `.agents/specs/wiki/`).

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
/ws-wiki sync [slug]            Sync delivered feature or commit diff to living domain wiki pages
/ws-wiki update [target]        Surgically update an individual feature wiki page
/ws-wiki validate               Deterministic validation of links and 3-section heading structures
```

---

## Modes & Workflows

### 1. `/ws-wiki init`

Bootstrap the living wiki from existing project context:

1. **Scan Project Files**: Inspect `README.md`, `AGENTS.md`, `index.PRD`, `.prd`, `features.md`, and architectural documentation.
2. **Synthesize Domain Taxonomy**: Identify the project's core vision, bounded contexts, and key domain modules (e.g. `identity`, `catalog`, `billing`, `harness`).
3. **Generate Root Index**: Write `{specsDir}/wiki/index.wiki.md` containing:
   - `# Project Living Feature Wiki & Domain Knowledge Base`
   - `## System Vision & Overview`
   - `## Architectural Boundaries`
   - `## Domain Catalog` with empty domain sections or seed placeholders.
4. **Guard**: If `{specsDir}/wiki/index.wiki.md` already exists, do not overwrite without explicit user confirmation. Defer feature subpages until features are delivered.

### 2. `/ws-wiki sync [slug]`

Synchronize shipped code changes to living domain wiki subpages:

1. **Discover Context & Evidence**:
   - If `slug` provided: load `{us-dir}/step-00-{slug}.spec.md` (or `{specsDir}/{slug}.spec.md`), committed diff `git diff {baseBranch}...HEAD`, and touched files list.
   - **Vibe-Coding Mode (no spec)**: When no spec exists, analyze `git diff HEAD~1` (or specified range) and recent commit messages to reverse-engineer business rules, validation constraints, data model changes, and API contracts directly from code.
2. **Domain Mapping & Multi-Page Partitioning**:
   - Determine which bounded context domain(s) the feature belongs to (e.g., `identity`, `billing`).
   - If a feature spans multiple modules (e.g. `orders` touches `inventory` and `notifications`), map updates across multiple domain subpages and establish cross-boundary markdown links between them.
3. **In-Place Rule Refinement**:
   - Read the existing `{specsDir}/wiki/{domain}/{feature}.md` if present.
   - Update, reconcile, and refine existing business rules and technical architecture in place. Do **not** append repetitive chronological change logs.
   - If creating a new page, adhere strictly to the 3-section structure (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`).
4. **Approval Review Gate**:
   - Present the synthesized wiki diffs to the user via structured `user-gate`:
     1. **Apply wiki updates (Recommended)**
     2. **Cancel**
   - If **Cancel** is selected: STOP, terminate immediately without writing changes to disk.
5. **Write & Index**:
   - On approval, write the updated feature markdown files.
   - Invoke `sync_wiki_index.cjs` to register/update the feature link and one-line description in `{specsDir}/wiki/index.wiki.md`.
   - Run `validate_wiki.cjs` to verify structural integrity.

### 3. `/ws-wiki update [target]`

Perform targeted surgical updates on an individual feature page `{domain}/{feature}.md`:
- Loads target page, updates specific business rules or technical contracts, preserves other sections, and validates upon save.

### 4. `/ws-wiki validate`

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
```

---

## Delivery Close Lifecycle Integration

In `ws-spec-to-pr` (Step 8 close) and `ws-spec-to-pr-lite` (Step 4 close), after implementation is completed and product code is committed, `ws-wiki sync` is offered as a post-close documentation sync step alongside `ws-spec-index` and `ws-changelog` to keep living domain documentation permanently synchronized with shipped code.
