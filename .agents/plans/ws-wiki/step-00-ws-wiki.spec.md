---
id: null
slug: ws-wiki
title: "ws-wiki: living project feature wiki and domain knowledge base manager"
source: local
specDate: 2026-09-12
status: completed
step: 0
workflowId: ws-wiki-20260912T043312Z
startedAt: "2026-09-12T04:29:23.716Z"
endedAt: "2026-09-12T04:29:23.716Z"
acRefs: []
---
# Specification — ws-wiki: living project feature wiki and domain knowledge base manager

## Description

Introduce `ws-wiki` (`.agents/skills/ws-wiki/SKILL.md`) as the authoritative manager for living project feature wikis and domain knowledge bases within the `workflow-skills` harness.

As software projects evolve through multiple iterations, specifications, and prompt-driven updates, team members and AI coding agents face a chronic problem: project documentation quickly becomes obsolete. Existing documents serve distinct roles that do not solve this challenge:
- `CHANGELOG.md` records an append-only chronological history of deliveries and tasks.
- `index.PRD` tracks roadmap phases, delivery checkboxes, and spec execution status.
- `*.spec.md` files define bounded, point-in-time delivery packages for specific pull requests.
- `ws-spec-update` updates individual delta specifications when code drifts during implementation.

None of these documents maintain a unified, current representation of the product as it actually runs today. For example, when a user management form is created, its initial requirements are delivered via a spec. Weeks later, when a password change feature is added, the original spec remains a historical artifact, while the actual application now behaves differently. Without a living wiki, agents and developers must re-read hundreds of source files and git commits to understand the current business rules, validations, and side effects.

`ws-wiki` solves this by introducing and maintaining a living feature wiki located at `{specsDir}/wiki/` (configurable via `plans.wikiDir`, defaulting to `.agents/specs/wiki/`). The wiki consists of:
1. **Root Index (`index.wiki.md`)**: A high-level catalog containing the product vision, architectural boundaries, and a domain-grouped map of features with relative links to feature subpages.
2. **Domain-Partitioned Subpages (`{domain}/{feature}.md`)**: Dedicated markdown pages organized by bounded context (e.g. `identity/user-management.md`, `billing/invoicing.md`), adhering to a lean, standardized 3-section format:
   - `## Feature Overview`: Purpose, user journeys, screens, forms, and core user interactions.
   - `## Business Rules & Logic`: Invariants, validation constraints, permissions, state transitions, and edge cases.
   - `## Technical Architecture`: Persistence models, API contracts, backend workflows, side effects, and provenance traceability.

`ws-wiki` provides four primary subcommands:
- `/ws-wiki init`: Scans project documentation (`README.md`, `AGENTS.md`, `index.PRD`, `.prd`, `features.md`) to create the initial `index.wiki.md` with domain taxonomy, deferring feature subpages until features are shipped.
- `/ws-wiki sync [slug]`: Discovers touched files and spec criteria from a delivered feature (or commit diff), determines affected domain subpages, synthesizes in-place rule refinements, and updates the wiki after user review gate approval.
- `/ws-wiki update [target]`: Performs targeted surgical updates on an individual feature wiki page.
- `/ws-wiki validate`: Executes deterministic validation via `validate_wiki.cjs` to detect broken relative links, malformed section headings, or unindexed pages.

### Design Intent

Create a dedicated, living feature wiki and domain knowledge base skill that keeps business rules, forms, workflows, and technical architecture continuously synchronized with shipped code, without turning into a changelog or overloading task-tracking PRD indexes.

## Acceptance Criteria

- AC1: File `.agents/skills/ws-wiki/SKILL.md` exists with YAML frontmatter specifying name `ws-wiki`, description, invocation names `ws-wiki` and `wiki`, and matching version.
- AC2: Body in `ws-wiki/SKILL.md` outputs the load banner `> When this skill is loaded, output "ws-wiki loaded."`.
- AC3: Subcommand `/ws-wiki init` scans project documentation including `README.md`, `AGENTS.md`, and `index.PRD` to create `{specsDir}/wiki/index.wiki.md`.
- AC4: Root index file `index.wiki.md` organizes the project overview, system vision, and domain-grouped catalog with relative links to feature pages under domain headings.
- AC5: Subcommand `/ws-wiki sync [slug]` analyzes touched files and spec criteria from a delivered feature to propose updates to domain subpages.
- AC6: Target domain pages are organized in a bounded context hierarchy at `{specsDir}/wiki/{domain}/{feature}.md`.
- AC7: Feature wiki pages adhere to a three-section markdown structure consisting of Feature Overview, Business Rules & Logic, and Technical Architecture.
- AC8: Sync operation supports multi-page mapping to update multiple domain pages and link cross-boundary relationships when a feature spans modules.
- AC9: In-place refinement updates and reconciles existing business rules rather than appending repetitive historical log entries.
- AC10: Vibe-coding mode reverse-engineers business rules, validations, and technical changes directly from git diffs and commit messages when no spec exists.
- AC11: Proposed wiki diffs are presented to the user through an approval review gate before writing changes to disk.
- AC12: Deterministic script `.agents/skills/ws-wiki/scripts/validate_wiki.cjs` validates wiki existence, detects broken relative links, and checks the three-section format.
- AC13: Deterministic script `.agents/skills/ws-wiki/scripts/sync_wiki_index.cjs` registers and updates feature links with one-line descriptions in `index.wiki.md`.
- AC14: Delivery close lifecycle in `ws-spec-to-pr` and `ws-spec-to-pr-lite` offers `ws-wiki sync` as a post-close documentation sync step.
- AC15: Configuration schema in `ws-shared/runtime/config.schema.json` supports optional `plans.wikiDir` with default value `.agents/specs/wiki`.
- AC16: Test suite `test/test-wiki.js` validates script execution, index synchronization, broken link detection, and three-section heading verification.
- AC17: Documentation and catalogs in `CATALOG.md` and `ws-shared/autoload.md` register `ws-wiki` under the documentation and specification tooling catalog.
- AC18: Authoring validation for this specification passes cleanly with exit code zero.

## Original Issue Context

User prompt and brainstorming session (2026-09-12):
"I realize that we can add a feature WIKI auto generated/curated with progressively update a wiki page of the project we are working (consumer). If starting a new project from scratch, we can generate the initial wiki page {specsDir}/wiki/index.wiki.md by inpect project files (agents.md, readme.md, product.prd, features.md, etc scanning .prd and .md files of the project for initial contextualization and feeding a template wiki (template.wiki.md). The wiki page presents the initial idea of the product, goals, features, roadmap, etc. Then while we are developing new features / delivering PR through or specs (managed specs) or vibe coding (prompting, commits, PR), we progressively update the wiki. The wiki could have a indexed link of subpages with progressive discovery / updatable that adds dedicated pages for details of a feature. The feature description will include domain model details, business rules, etc. So after every PR delivered, the business rules/domain info/features/forms/screens/lists/business processes will always stay wiki synced."

### Prior Work Sweep

- `ws-spec-index`: Manages `index.PRD` with phase checklists, spec statuses, and Done logs, but does not document living domain models or business rules.
- `ws-spec-update`: Adjusts individual delta `*.spec.md` files when code drifts, but does not provide a consolidated product knowledge base.
- `ws-changelog`: Summarizes completed tasks into a chronological log, but does not curate living system behavior.
- `ws-spec-organizer`: Manages spec paths and sequence prefixes without generating domain-level documentation.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing `CHANGELOG.md` with the wiki | Changelogs provide a chronological audit history whereas the wiki represents current living product architecture |
| Replacing `index.PRD` tracking | `index.PRD` tracks implementation phases and delivery status while the wiki documents domain knowledge |
| Auto-committing wiki updates without user review | User gate ensures human verification before modifying project documentation |
| Arbitrary unstructured multi-level nested folders | Hierarchy is bounded to `{domain}/{feature}.md` to preserve readability |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Storage path | `{specsDir}/wiki/` | Sits alongside specifications and plans under version control | y |
| Feature page template | 3-section format | Provides sufficient depth without overwhelming documentation fatigue | y |
| Bootstrapping mode | Index-only generation | Prevents premature stub generation before features are delivered | y |
| Review gate | Interactive confirmation | Guarantees human oversight before living documentation is updated | y |
| Vibe-coding synthesis | Git diff analysis | Enables documentation synchronization even when specs are omitted | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill `ws-wiki`, scripts, tests, and configuration schema | Git diff inspection |
| Atomic criteria | AC1–AC18 testable with binary pass/fail outcomes | Automated test suite and validation scripts |
| Failure modes | Missing config, broken relative links, invalid headings, cancelled gate | Handled cleanly with negative tests |
| Observation telemetry | Load banner, sync plan diffs, validation summary reports | Console stdout inspection |
| Open blockers | None | User approved all architectural decisions during grilling |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Load banner output: `ws-wiki loaded.`
- Interactive diff preview: displays markdown additions and modifications prior to user confirmation.
- Validation output: report of validated pages, verified relative links, and any structural warnings.

### Negative & Failing Test Scenarios

- Broken Relative Link Detection: `validate_wiki.cjs` fails with exit code 1 when `index.wiki.md` links to a non-existent subpage.
- Malformed Heading Detection: `validate_wiki.cjs` fails with exit code 1 when a feature page omits one of the three required sections.
- Cancelled Review Gate: Selecting Cancel in the review gate terminates `ws-wiki sync` without modifying files on disk.
- Missing Project Configuration: Executing `ws-wiki` in an unconfigured project triggers the standard entry check gate.
