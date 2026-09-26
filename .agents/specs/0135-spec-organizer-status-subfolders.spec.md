---
id: null
slug: spec-organizer-status-subfolders
title: "Organize specifications into status subfolders (pending, completed, archived)"
source: local
specDate: 2026-09-26
---

# Specification — Organize specifications into status subfolders (pending, completed, archived)

## Description

Today, `ws-spec-organizer` resolves and organizes specifications directly under `{specsDir}` as a flat list (`{slug}.spec.md` or `NNNN-{slug}.spec.md`). In repositories with extensive specification history, dozens or hundreds of specifications accumulate at the root of `{specsDir}`, making it difficult to distinguish active specifications from completed or archived ones.

This feature enhances `ws-spec-organizer` to support organizing specifications into status subfolders under `{specsDir}`:
- `pending/`: Active, draft, todo, or in-progress specifications.
- `completed/`: Delivered, shipped, implemented, or closed specifications.
- `archived/`: Cancelled, superseded, or retired specifications.

### Key Behaviors:
1. **Configurable Status Subfolder Support:**
   A boolean configuration setting, `plans.statusSubfolders` (default: `false` for backwards compatibility), in `.ws/config.json` determines whether newly drafted specifications default to the `pending/` subfolder.
2. **Backward-Compatible Path Resolution:**
   `resolve_spec_path.cjs` checks `{specsDir}` recursively across known status subfolders (`pending/`, `completed/`, `archived/`) as well as the root `{specsDir}/`. If a specification file already exists anywhere under `{specsDir}`, that path is returned. If it does not exist:
   - When `plans.statusSubfolders` is `true` (or when `--status=<status>` is supplied), the path resolves to `{specsDir}/<status>/[NNNN-]{slug}.spec.md` (defaulting to `pending`).
   - When `plans.statusSubfolders` is `false`, it resolves to `{specsDir}/[NNNN-]{slug}.spec.md`.
3. **Global Sequence Prefixing:**
   When `plans.enforceSpecPrefixOrdering` is `true`, sequence number generation (`nextNum`) scans all specifications across `{specsDir}` root and all status subfolders so that four-digit prefixes remain globally unique and monotonically increasing across the entire specification board.
4. **Bulk Status Organization:**
   `organize_specs.cjs` gains `--by-status` (and respects `plans.statusSubfolders`). When organizing by status:
   - Evaluates each specification's status from frontmatter `status:` (`completed`, `archived`, `pending`), fallback frontmatter `issueState:` (`closed` -> `completed`, `open` -> `pending`), or `index.PRD` Done log / checkboxes.
   - Moves `*.spec.md`, companion `*.context.md`, and any associated `*.assets/` directories to the appropriate target subfolder (`pending/`, `completed/`, or `archived/`).
   - Safely updates `spec:` references in `{specsDir}/index.PRD`.
   - Uses two-phase renaming with `git mv` for tracked files and `fs.renameSync` for untracked files, failing closed if any dirty tracked files overlap.
5. **Workflow Completion Transition:**
   When a specification reaches completed status (e.g. via `ws-spec-index sync` at delivery/ship exit or via `organize_specs.cjs --slug <slug> --status completed`), it is moved from `pending/` to `completed/` and its `index.PRD` link is updated accordingly.

## Acceptance Criteria

- AC1: `config.schema.json` and `config.json.example` define `plans.statusSubfolders` as an optional boolean property with default `false`.
- AC2: `resolve_spec_path.cjs` searches the root `{specsDir}` and known status subfolders (`pending`, `completed`, `archived`), returning an existing path regardless of which subfolder contains the file.
- AC3: When a specification does not exist and `plans.statusSubfolders` is `true`, `resolve_spec_path.cjs` resolves the new file path under `{specsDir}/pending/`.
- AC4: When `plans.enforceSpecPrefixOrdering` is `true`, `resolve_spec_path.cjs` computes the next four-digit prefix by inspecting existing prefixes across the root `{specsDir}` and all status subfolders.
- AC5: `organize_specs.cjs` supports a `--by-status` flag that categorizes specifications into `pending/`, `completed/`, and `archived/` subfolders based on frontmatter status, frontmatter issueState, and index.PRD status.
- AC6: When `organize_specs.cjs` moves a specification to a status subfolder, it moves companion `*.context.md` files and `*.assets/` directories to the same subfolder.
- AC7: When `organize_specs.cjs` moves specifications across directories, it updates matching `spec:` paths in `{specsDir}/index.PRD` to reflect the new relative subfolder locations.
- AC8: `ws-spec-index sync` moves a specification from `pending/` to `completed/` when evidence satisfies completion and `plans.statusSubfolders` is enabled.
- AC9: `organize_specs.cjs --by-status` fails closed without making filesystem mutations when dirty tracked paths overlap the planned source or target files.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Organizing `{plansDir}` directories into status subfolders | Plans under `{plansDir}` remain flat by slug and are managed by workflow state and `ws-spec-archive` |
| Arbitrary user-defined status subfolder names | Fixed standard folder names (`pending`, `completed`, `archived`) ensure portable inter-skill contracts |
| Automatic retro-active migration on install or update | Existing repositories must not undergo silent directory restructuring on package update |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Subfolder layout default | `plans.statusSubfolders: false` | Preserves existing flat `{specsDir}` behavior unless explicitly configured | y |
| Target subfolder names | `pending`, `completed`, `archived` | Matches standard specification lifecycle states requested by the user | y |
| Default subfolder for new specs | `pending` | New specifications start in draft or in-progress state | y |
| Index references format | Relative path from `{specsDir}` (e.g. `pending/0001-slug.spec.md`) | Allows tools and markdown viewers to resolve linked files unambiguously | y |
| Stack invariants and security | Node 22 CommonJS (`.cjs`) without external shell dependencies or new interpreters | Skill harness constraint strictly prohibiting Python and bash business logic | y |
| Auth, tenancy, i18n, and UI | N/A because the change modifies CLI path resolvers and file organization scripts | No web UI, network authentication, or multi-tenant database involved | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Scope boundary | Changes scoped to `ws-spec-organizer` (`resolve_spec_path.cjs`, `organize_specs.cjs`), `ws-spec-index`, `config.schema.json`, and `config.json.example` | Code review and git diff inspection |
| Acceptance criteria | Deterministic pass/fail conditions for path resolution, prefix calculation, and file moves | Automated Node test suite (`test/test-spec-organizer.js`) |
| Failure modes | Red test scenarios for duplicate slugs across subfolders and dirty git working tree | Negative test execution in `test/` |
| Observation telemetry | Named commands and exit codes documented under Validation & Observation Notes | Command execution check |
| Zero open blockers | All architectural decisions resolved with backward compatibility defaults | Spec review |
| Stack invariants | Scripts implemented in CommonJS Node 22 without new Python or native dependencies | Verification via `npm run test` and `ws-check-harness` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0135-spec-organizer-status-subfolders.spec.md` exits 0.
- `node .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug existing-slug --json` returns the existing subfolder path when located under `pending/`, `completed/`, or `archived/`.
- `node .agents/skills/ws-spec-organizer/scripts/organize_specs.cjs --dry-run --by-status --json` emits proposed renames without filesystem mutations.
- `node test/test-spec-organizer.js` passes with 100% assertions green.

### Negative & Failing Test Scenarios

- Negative 1: When a specification exists in both `{specsDir}/pending/` and `{specsDir}/completed/` with the same slug, `resolve_spec_path.cjs` must throw an ambiguous spec error and exit with code 2.
- Negative 2: When `organize_specs.cjs --by-status --apply` encounters a dirty tracked file among the files to be moved, it must abort immediately with a non-zero exit code without moving any files.
- Negative 3: When `plans.statusSubfolders` is false, `resolve_spec_path.cjs` for a new slug must not place the file in `pending/`, preserving flat `{specsDir}/{slug}.spec.md` resolution.
- Negative 4 (stack): Any helper written in Python or generating bytecode under `.agents/skills/` must fail `ws-check-harness` critical audit.

## Original Issue Context

**User Request Transcript:**
- "Update ws-spec-organizer skill to have subfolders according to their pending, completed or archived status. One subfolder for each status."
- "I mean, organize each specification according to its status. For example, if I complete implement some of the specification, then in the end I would like to organize them to a completed status folder."

### Prior Work Sweep

- SCM provider check: `gh` CLI was unauthorized (`401 Unauthorized`), so remote issue search was skipped per harness protocol.
- Local repository inspection: `git log` inspection shows `ws-spec-organizer` was introduced in commit `a83a6d26` (PR #256) implementing `plans.enforceSpecPrefixOrdering` and chronological `NNNN-` prefixes. No prior work exists for status-based subfolder partitioning under `{specsDir}`.

### Design Intent

`0053-spec-prefix-ordering.context.md` line 30 explicitly deferred nested directory structures under `{specsDir}` to prevent initial scope bloat. Flat organization was the initial standard. This specification delivers status-based subfolder organization (`pending/`, `completed/`, `archived/`) as an opt-in enhancement (`plans.statusSubfolders: true`), while ensuring existing flat boards continue to function seamlessly without modification.

## Notes

- Lookup findings: Codebase lookup confirms `resolve_spec_path.cjs` currently scans only top-level files in `specsDir`. `ws-spec-list` already globs `{specsDir}/**/*.spec.md` and handles subfolders cleanly. `track_index.cjs` currently expects flat files or exact filenames; updating `findSpecFile` to search subfolders or delegate to `resolve_spec_path.cjs` aligns both tools.
- MEMORY lookup: No conflicting anti-regression traps found for spec organization. Standard rules apply: Node 22 CommonJS runtime, CRLF worktree replacement handling, and safe git operations.
