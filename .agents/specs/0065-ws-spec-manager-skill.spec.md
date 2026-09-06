---
id: null
slug: ws-spec-manager-skill
title: "ws-spec-manager: unified specification router and lifecycle manager"
source: local
specDate: 2026-09-06
---

# Specification — ws-spec-manager: unified specification router and lifecycle manager

## Description

Introduce `ws-spec-manager` (`.agents/skills/ws-spec-manager/SKILL.md`) as the authoritative, single-entry-point routing manager for all specification-related workflows in the `workflow-skills` harness.

The repository provides a rich ecosystem of 16 specialized `ws-spec-*` skills (including `ws-spec-write`, `ws-spec-format`, `ws-spec-organizer`, `ws-spec-index`, `ws-spec-list`, `ws-spec-explain`, `ws-spec-update`, `ws-spec-archive`, `ws-spec-from-provider`, `ws-spec-provider-local`, and pipeline orchestrators). However, users and agents experience friction in choosing the right skill for a specific task and remembering multiple skill names and slash commands. Furthermore, subtle ambiguities exist between conceptually related skills:
- **Body Requirement Drift vs. Status Sync**: Users confuse updating spec requirements after code modifications (`ws-spec-update`) with updating completion checkboxes and Done-log records in `index.PRD` (`ws-spec-index sync`).
- **Board Inventory vs. Deep-Dive Panorama**: Users confuse browsing all specs and plans on a dual board (`ws-spec-list`) with inspecting an in-depth, read-only delivery panorama and testing instructions for a single spec (`ws-spec-explain`).
- **File Organization & Chronological Prefixing**: While `ws-spec-write` drafts specifications, file naming conventions and chronological `NNNN-` sequence prefixes (`plans.enforceSpecPrefixOrdering`) belong to `ws-spec-organizer`, and registration into the project roadmap belongs to `ws-spec-index track`. Without unified routing, specs risk being created in an untracked or disorderly state.

`ws-spec-manager` solves this by acting as the memorable, unified control center (`/spec`, `/specs`, `/spec-manager`, `ws-spec-manager`). It provides:
1. **Interactive Guided Mode**: When invoked without arguments, displays a structured `user-gate` with 11 distinct actions covering creation, listing, inspection, drift updating, status synchronization, PRD tracking, chronological organizing, plan archiving, formatting validation, backlog importing, and execution.
2. **Direct Subcommand Dispatch**: Supports rapid commands such as `/spec create`, `/spec list`, `/spec explain <slug>`, `/spec update [slug]`, `/spec sync [slug]`, `/spec track <slug>`, `/spec organize`, `/spec archive`, `/spec validate <file>`, `/spec import`, and `/spec run <slug>`.
3. **Strict Boundary Enclosure**: Formalizes the boundary separation so each specialized skill retains a single responsibility without overlapping or competing with others.
4. **Harness Integration**: Integrates directly into `.agents/skills/ws-shared/autoload.md` as the top-level Spec Router entry point and keyword target, and registers under `packages.workflows.skills` in `bin/skill-dependencies.json`.

## Acceptance Criteria

- AC1: `.agents/skills/ws-spec-manager/SKILL.md` exists with valid YAML frontmatter containing `name: ws-spec-manager`, `version:` matching `package.json` (`0.3.62`), `description` strictly focused on intent matching/triggers, `disable-model-invocation: true`, and `invocation_names` including `spec-manager`, `ws-spec-manager`, `spec`, and `specs`.
- AC2: Directly below `# ws-spec-manager`, the body contains the loaded banner directive `> When this skill is loaded, output "ws-spec-manager loaded."`.
- AC3: Every numbered state machine step in `SKILL.md` contains a checkable `Done when:` line with empirical exit criteria.
- AC4: Entry check in `SKILL.md` references `config-resolution.md` § Entry check and validates `{sharedDir}/config.json` presence.
- AC5: `ws-spec-manager` implements an interactive `user-gate` menu (structured choice, recommended first) when invoked without subcommands, offering 11 distinct actions:
  1. Create / Draft Spec (`ws-spec-write`)
  2. List & Browse Specs / Plans (`ws-spec-list`)
  3. Explain / View Spec Details (`ws-spec-explain`)
  4. Update Spec Requirements / Drift (`ws-spec-update`)
  5. Sync Spec Status in index.PRD (`ws-spec-index sync`)
  6. Track Existing Spec in index.PRD (`ws-spec-index track`)
  7. Organize & Renumber Specs (`ws-spec-organizer`)
  8. Archive Completed Plan History (`ws-spec-archive`)
  9. Validate Spec Format & ACs (`ws-spec-format`)
  10. Import Backlog from GitHub / ADO (`ws-spec-from-provider`)
  11. Run / Execute Spec Pipeline (`ws-classify-complexity` -> `ws-spec-to-pr-lite` | `ws-spec-to-pr`)
- AC6: `ws-spec-manager` supports direct command arguments (`create`, `list`, `explain <target>`, `update [target]`, `sync [slug]`, `track <slug>`, `organize`, `archive`, `validate <spec>`, `import`, `run <slug>`) that immediately delegate to the specialized skill without prompting the interactive menu.
- AC7: Spec creation flow explicitly enforces the multi-skill creation pipeline: drafting requirements via `ws-spec-write`, path resolution and `NNNN-` prefix ordering via `ws-spec-organizer`, validation via `ws-spec-format`, and optional tracking in `index.PRD` via `ws-spec-index track`.
- AC8: The boundary between body drift synchronization (`ws-spec-update`) and index status synchronization (`ws-spec-index sync`) is clearly defined in `SKILL.md` and `autoload.md`, ensuring zero overlapping responsibilities.
- AC9: The boundary between dual-board browsing (`ws-spec-list`) and single-spec read-only panorama (`ws-spec-explain`) is clearly defined in `SKILL.md` and `autoload.md`, ensuring zero overlapping responsibilities.
- AC10: `.agents/skills/ws-shared/autoload.md` includes `ws-spec-manager` in the `## Specs skill router (progressive disclosure)` table as the top-level unified entry point, and in the `### Keyword -> skill (quick map)` table for keywords `manage specs`, `/spec`, `/specs`, `/spec-manager`, `spec lifecycle`, `spec router`, and `spec menu`.
- AC11: `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` include `"ws-spec-manager"` under `packages.workflows.skills` and declare dependencies on `ws-spec-write`, `ws-spec-list`, `ws-spec-index`, `ws-spec-update`, `ws-spec-explain`, `ws-spec-organizer`, `ws-spec-archive`, `ws-spec-format`, `ws-spec-from-provider`, `ws-classify-complexity`, and `ws-configure-project`.
- AC12: `CATALOG.md`, `.agents/skills/ws-shared/CATALOG.md`, and `SPEC-MANAGEMENT.md` document `ws-spec-manager` as the primary unified specification router.
- AC13: Authoring validation (`node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring`) for this specification file exits with status 0.
- AC14: Automated test suite `test/test-ws-spec-manager.js` exists, runs in Node.js, and validates frontmatter, dependencies, autoload router integration, and direct/interactive dispatch matrix.
- AC15: Integrity verification (`npm run verify-integrity`) passes after regenerating integrity digests (`npm run generate-integrity`).

## Original Issue Context

User prompt (2026-09-06):
"analyze skills that handles/deals with specification files and status/index/completion/updates. Ccreate a routing "manager" skill named ws-spec-manager which is an index that routes all other skills related to most specialized skill spec. This is skill should be added to ws-shared/autoload.md and its main role is to execute the ws-spec-* skills related to handling spec files and its options: when creating specs, route to the skill that also update index.PRD, manage status (completed/pending/executing). When want to see specs, uses ws-spec-list, etc, when update spec or needs to view details of spec, use ws-spec-update or ws-spec-explain. specs created should pass to ws-spec-organizer so files not mess around. I need that skill that is easy to remember to manage my specs, using the best skill for the task. Also analyze the skills and check ambiguity. Make the skills do not overlap each other, turn them focused on its tasks."

### Prior Work Sweep

- Prior spec guide `SPEC-MANAGEMENT.md` documents 11 individual spec skills and their lifecycle, but lacks an executable routing skill that unifies them under one command.
- `ws-spec-organizer` resolves `NNNN-` paths via `resolve_spec_path.cjs` and organizes files via `organize_specs.cjs`.
- `ws-spec-index` manages `index.PRD` via subcommands `init`, `sync`, `promote`, and `track`.
- `ws-spec-list` provides interactive dual-board browsing of specs and plans.
- `ws-spec-update` handles code ↔ spec requirement drift.
- `ws-spec-explain` delivers read-only status and testing panoramas.
- `ws-spec-archive` harvests plan history to `index.PRD` and proposes plan folder cleanup.

### Design Intent

Create an ergonomic, predictable meta-instruction skill (`ws-spec-manager`) that serves as the single memorable entry point (`/spec`) for managing specifications, routing seamlessly to specialized skills without duplicating their logic or fragmenting the user experience.

## Notes

- `ws-spec-manager` is a routing/dispatcher skill; it does not replace the specialized scripts or skills, but coordinates their invocation.
- Dismissing or cancelling the `user-gate` in `ws-spec-manager` must cleanly exit without performing actions.
- The skill belongs to `packages.workflows.skills` so all consumers installing the standard workflows package receive it automatically.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Re-implementing spec writing or validation logic inside `ws-spec-manager` | `ws-spec-write` and `ws-spec-format` remain the single sources of truth |
| Replacing `ws-spec-list` interactive board UI | `ws-spec-list` already handles the dual board; `ws-spec-manager` routes to it |
| Automatic background execution without user request | Spec management is user-invoked (`disable-model-invocation: true`) |
| Modifying core git operations or SCM providers | Delegated to `ws-spec-provider-*` and `ws-ship-pr` |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Package membership | `packages.workflows.skills` | Core workflow capability needed by all spec-driven users | y |
| Model invocation | `disable-model-invocation: true` | Invoked explicitly by human users via `/spec`, `/specs`, or `/spec-manager` | y |
| Command prefix | `/spec` and `/ws-spec-manager` | Short, easy to remember, standard slash command ergonomics | y |
| Concurrency / Authentication | N/A because routing and dispatch operate on local files and CLI tools | Pure local routing protocol | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill `ws-spec-manager`, docs, tests, packaging registration | Git diff inspection |
| Atomic criteria | AC1–AC15 verifiable as pass/fail | Automated test suite and validation scripts |
| Failure modes | Cancel gate, missing config, invalid subcommand | Handled cleanly with negative tests |
| Observation telemetry | Load banner `ws-spec-manager loaded.`, dispatch logs | Console stdout inspection |
| Open blockers | None | User approved implementation plan |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Skill load banner: `ws-spec-manager loaded.`
- Menu display: Host structured choice with 11 categorized actions.
- Dispatch confirmation: Informational output stating the targeted skill and forwarded arguments.

### Negative & Failing Test Scenarios

- **Cancel Gate No-Op**: Selecting Cancel / Dismiss from the interactive `user-gate` terminates execution immediately without calling any sub-skills or modifying filesystem state.
- **Unrecognized Subcommand Handling**: Invoking `/spec unknown-command` displays an error message listing supported subcommands and falls back to presenting the interactive menu.
- **Missing Config Gate**: Invoking `ws-spec-manager` in an unconfigured project without `{sharedDir}/config.json` triggers the entry check gate advising the user to run `ws-configure-project`.
