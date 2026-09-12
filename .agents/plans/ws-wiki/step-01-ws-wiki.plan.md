---
slug: ws-wiki
title: "ws-wiki: living project feature wiki and domain knowledge base manager"
status: completed
step: 1
workflowId: ws-wiki-20260912T043312Z
startedAt: "2026-09-12T04:33:12Z"
endedAt: "2026-09-12T04:40:06.127Z"
acRefs: []
---
# Implementation Plan — ws-wiki: living project feature wiki and domain knowledge base manager

## 0. Summary & Business Rules

This plan implements `ws-wiki` as the authoritative manager for living project feature wikis and domain knowledge bases across the `workflow-skills` harness.

Existing harness documents solve distinct, point-in-time problems:
- `CHANGELOG.md`: Chronological delivery history log.
- `index.PRD`: Implementation phases and task completion tracker.
- `*.spec.md`: Bounded, point-in-time contract for a specific delivery package.
- `ws-spec-update`: Surgical drift updater for individual delta specifications.

`ws-wiki` fills the missing operational role: maintaining an up-to-date, unified representation of the product's living domain architecture, screens, forms, business rules, and technical workflows.

### Target Business Rules
1. **Configurable Wiki Root (`plans.wikiDir`)**: The wiki lives at `{specsDir}/wiki/` by default (configurable via `plans.wikiDir`, defaulting to `.agents/specs/wiki`).
2. **Root Index Structure (`index.wiki.md`)**: High-level catalog containing project overview, architectural boundaries, system vision, and domain-grouped feature listings with relative markdown links (`[Feature Name]({domain}/{feature}.md)`).
3. **Domain Subpage Hierarchy (`{domain}/{feature}.md`)**: Bounded-context folders containing individual feature markdown files adhering strictly to a standardized 3-section structure:
   - `## Feature Overview`: Purpose, user journeys, screens, forms, user interactions.
   - `## Business Rules & Logic`: Invariants, validation constraints, permissions, state transitions, edge cases.
   - `## Technical Architecture`: Persistence models, API contracts, backend workflows, side effects, provenance traceability.
4. **Interactive Review Gate**: Before writing wiki additions or modifications to disk, proposed diffs are presented to the user via structured gate. Cancel aborts without file writes.
5. **Deterministic Verification**: Deterministic Node.js scripts `validate_wiki.cjs` and `sync_wiki_index.cjs` validate links, check heading structures, and register new subpages.
6. **Delivery Close Lifecycle Integration**: `ws-spec-to-pr` and `ws-spec-to-pr-lite` offer `ws-wiki sync` during post-close lifecycle alongside `ws-spec-index` and `ws-changelog`.

---

## 1. Definition of Ready & Scope

### Acceptance Criteria Coverage (AC1–AC18)
- **AC1**: `.agents/skills/ws-wiki/SKILL.md` exists with frontmatter `name: ws-wiki`, description, invocation names `ws-wiki` and `wiki`, version `0.4.18`.
- **AC2**: Body in `.agents/skills/ws-wiki/SKILL.md` outputs `ws-wiki loaded.`.
- **AC3**: `/ws-wiki init` scans `README.md`, `AGENTS.md`, `index.PRD` to generate `{specsDir}/wiki/index.wiki.md`.
- **AC4**: `index.wiki.md` organizes project vision, architectural boundaries, and domain-grouped catalog with relative links.
- **AC5**: `/ws-wiki sync [slug]` analyzes touched files and spec criteria from a delivered feature to propose subpage updates.
- **AC6**: Domain pages organized in bounded context folders at `{specsDir}/wiki/{domain}/{feature}.md`.
- **AC7**: Feature pages adhere to the 3-section structure (`## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`).
- **AC8**: Multi-page mapping updates multiple domain pages and links cross-boundary relationships when features span modules.
- **AC9**: In-place refinement updates and reconciles existing business rules rather than appending repetitive historical logs.
- **AC10**: Vibe-coding mode reverse-engineers business rules, validations, and technical changes directly from git diffs and commit messages when no spec exists.
- **AC11**: Proposed wiki diffs presented via approval review gate before writing changes to disk.
- **AC12**: Deterministic script `.agents/skills/ws-wiki/scripts/validate_wiki.cjs` validates wiki existence, broken relative links, and 3-section format.
- **AC13**: Deterministic script `.agents/skills/ws-wiki/scripts/sync_wiki_index.cjs` registers and updates feature links with one-line descriptions in `index.wiki.md`.
- **AC14**: Delivery close lifecycle in `ws-spec-to-pr` and `ws-spec-to-pr-lite` offers `ws-wiki sync` as a post-close documentation sync step.
- **AC15**: Configuration schema in `.agents/skills/ws-shared/runtime/config.schema.json` supports optional `plans.wikiDir` with default value `.agents/specs/wiki`.
- **AC16**: Test suite `test/test-wiki.js` validates script execution, index synchronization, broken link detection, and 3-section heading verification.
- **AC17**: Documentation and catalogs in `CATALOG.md` and `.agents/skills/ws-shared/autoload.md` register `ws-wiki`.
- **AC18**: Authoring validation for `.agents/specs/0075-ws-wiki.spec.md` passes cleanly with exit code zero.

### Negative Scenarios
- **NS1**: Broken relative links in `index.wiki.md` or feature pages cause `validate_wiki.cjs` to fail with exit code 1.
- **NS2**: Missing required section headings in feature pages cause `validate_wiki.cjs` to fail with exit code 1.
- **NS3**: Cancelling the review gate in `ws-wiki sync` terminates execution without disk modifications.
- **NS4**: Executing `ws-wiki` in an unconfigured project triggers standard entry check gate.

### Out of Scope
- Overwriting or replacing `CHANGELOG.md` or `index.PRD`.
- Arbitrary multi-level nested folders deeper than `{domain}/{feature}.md`.
- Auto-committing wiki updates without user approval.

---

## 2. Technical Design & Architecture

### Component Hierarchy
```
.agents/skills/ws-wiki/
├── SKILL.md                          # Authoritative skill instructions, subcommands, workflows
└── scripts/
    ├── validate_wiki.cjs             # Deterministic link checker & heading validator
    └── sync_wiki_index.cjs           # Index registration & feature catalog updater

.agents/skills/ws-shared/
├── runtime/
│   └── config.schema.json            # Added plans.wikiDir property
├── templates/
│   └── config.json.example           # Added plans.wikiDir seed property
└── autoload.md                       # Catalog registration

.agents/skills/ws-spec-to-pr/
└── STEP-DISPATCH.md                  # Added ws-wiki sync to Step 8 post-close lifecycle

.agents/skills/ws-spec-to-pr-lite/
└── SKILL.md                          # Added ws-wiki sync to Step 4 post-close lifecycle

bin/
└── skill-dependencies.json           # Added ws-wiki package dependency entry

test/
└── test-wiki.js                      # Unit & integration tests for scripts & lifecycle
```

### Script Contracts
1. `validate_wiki.cjs`:
   - Inputs: `--wiki-dir <path>`, `--repo-root <path>`, `--check`, `--json`.
   - Resolves wiki directory (falls back to `.agents/specs/wiki`).
   - Checks that `index.wiki.md` exists.
   - Extracts all markdown links `[text](target)`: verifies target relative file paths exist. Missing file -> logs error, sets exit code 1.
   - Scans all `{domain}/*.md` files: checks for `## Feature Overview`, `## Business Rules & Logic`, `## Technical Architecture`. Missing section -> logs error, sets exit code 1.
   - Checks that all feature subpages are linked in `index.wiki.md`.
   - Exits 0 on valid wiki, 1 on errors.

2. `sync_wiki_index.cjs`:
   - Inputs: `--wiki-dir <path>`, `--domain <domain>`, `--feature <feature>`, `--description <desc>`, `--file <relPath>`, `--title <title>`.
   - Locates or creates `index.wiki.md`.
   - Finds or creates domain section `## Domain: <domain>` (or `## <domain>`).
   - Inserts or updates bullet `- [{title}]({domain}/{feature}.md): {description}`.
   - Preserves existing formatting, comments, and other domain sections.

---

## 3. Step-by-Step Plan

### Task T01: Configuration Schema & Template Extensions (AC15)
- Update `.agents/skills/ws-shared/runtime/config.schema.json` to define `plans.wikiDir` (string, default: `".agents/specs/wiki"`, description).
- Update `.agents/skills/ws-shared/templates/config.json.example` with `plans.wikiDir: ".agents/specs/wiki"`.
- Verify `node test/test-powershell-config-editor.js` passes.

### Task T02: Deterministic Scripts Implementation (AC12, AC13, NS1, NS2)
- Implement `.agents/skills/ws-wiki/scripts/validate_wiki.cjs`:
  - Argument parsing (`--wiki-dir`, `--repo-root`, `--json`, `--check`).
  - Validation rules: wiki dir exists, `index.wiki.md` exists, relative links resolve, subpages contain 3 required headings, unindexed page checks.
  - Return exit code 0 on valid, 1 on failures with actionable error messages.
- Implement `.agents/skills/ws-wiki/scripts/sync_wiki_index.cjs`:
  - Argument parsing (`--wiki-dir`, `--domain`, `--feature`, `--title`, `--description`, `--file`).
  - Idempotent index parsing and domain-grouped link formatting.

### Task T03: Skill Specification & Workflow Orchestration (AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, NS3, NS4)
- Create `.agents/skills/ws-wiki/SKILL.md`:
  - YAML frontmatter: `name: ws-wiki`, description, version: `0.4.18`, `disable-model-invocation: true`, `invocation_names: [ws-wiki, wiki]`.
  - Load banner: `> When this skill is loaded, output "ws-wiki loaded."`.
  - Subcommands: `init`, `sync`, `update`, `validate`.
  - Step-by-step algorithms for `init` (scanning project files), `sync` (analyzing touched files/spec, multi-page mapping, in-place rule refinement, vibe-coding synthesis from git diff, user gate diff review), `update` (targeted updates), and `validate`.

### Task T04: Orchestrator Post-Close Lifecycle Integration (AC14)
- Update `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` Step 8 close lifecycle to offer `ws-wiki sync` alongside `ws-spec-index`.
- Update `.agents/skills/ws-spec-to-pr-lite/SKILL.md` Step 4 close lifecycle to offer `ws-wiki sync` alongside `ws-spec-index`.

### Task T05: Catalogs, Dependencies, and Autoload Registration (AC17)
- Update `bin/skill-dependencies.json` to register `ws-wiki` in `packages.workflows.skills` and define dependencies.
- Update `CATALOG.md` to list `ws-wiki` in `Layer 5 — Utility & meta` and in the Task router.
- Update `.agents/skills/ws-shared/autoload.md` to register `ws-wiki` under documentation/specification tools.

### Task T06: Automated Test Suite & Package Verification (AC16, AC18)
- Implement `test/test-wiki.js`:
  - Test `validate_wiki.cjs` on clean wiki fixture (exits 0).
  - Test `validate_wiki.cjs` on broken relative link (exits 1, NS1).
  - Test `validate_wiki.cjs` on missing 3-section headings (exits 1, NS2).
  - Test `sync_wiki_index.cjs` index insertion, updates, and idempotency.
  - Test CLI flags (`--help`, `--json`).
- Update `package.json` to include `test/test-wiki.js` in `scripts.tests:harness-efficiency`.
- Run `npm run test` and `node bin/generate-skill-integrity.js --check` to verify complete harness integrity.

---

## 4. Permissions, Tenancy & i18n

- **Permissions & RBAC**: File system operations only; respects read-only gates before file modification.
- **Tenancy**: Single-repository scope.
- **i18n**: En-us only for skill prose, banners, scripts, reports, and generated wiki documents per harness contract.

---

## 5. Test Coverage

| AC | Test Name | Target / Method |
| :--- | :--- | :--- |
| AC1, AC2 | `V01:skill-frontmatter-and-banner` | `test/test-skill-frontmatter.js` & `test/test-wiki.js` checking YAML frontmatter and load banner |
| AC3, AC4 | `V02:wiki-init-and-index-structure` | `test/test-wiki.js` verifying `index.wiki.md` layout and domain groupings |
| AC5, AC6, AC7 | `V03:wiki-sync-and-subpage-structure` | `test/test-wiki.js` verifying 3-section headings and `{domain}/{feature}.md` paths |
| AC8, AC9, AC10 | `V04:wiki-sync-refinement-and-vibe` | `test/test-wiki.js` verifying in-place refinement and diff-based discovery |
| AC11 | `V05:wiki-gate-cancellation` | `test/test-wiki.js` verifying gate cancellation leaves disk untouched (NS3) |
| AC12 | `V06:validate-wiki-script` | `test/test-wiki.js` verifying `validate_wiki.cjs` pass/fail exits (NS1, NS2) |
| AC13 | `V07:sync-wiki-index-script` | `test/test-wiki.js` verifying `sync_wiki_index.cjs` link insertion and updates |
| AC14 | `V08:orchestrator-close-integration` | `test/test-wiki.js` verifying presence in `STEP-DISPATCH.md` and `ws-spec-to-pr-lite` |
| AC15 | `V09:config-schema-wikiDir` | `test/test-wiki.js` verifying schema validation for `plans.wikiDir` |
| AC16 | `V10:test-suite-execution` | `node test/test-wiki.js` exits 0 |
| AC17 | `V11:catalog-and-autoload-registration` | `test/test-doc-sync.js` and `test/test-wiki.js` verifying CATALOG.md and autoload.md |
| AC18 | `V12:spec-authoring-validation` | `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs .agents/specs/0075-ws-wiki.spec.md --mode authoring` exits 0 |

---

## 6. Stack & Security Invariants Verification Plan

- **Node 22 / CJS runtime**: All scripts written as CommonJS (`.cjs`) using standard Node.js built-ins (`fs`, `path`, `crypto`). No unapproved external npm dependencies.
- **Defensive Path Traversal**: Resolves paths against `repoRoot` and `{specsDir}/wiki/` to prevent directory traversal outside the project tree.
- **Fail-Closed Gate Contract**: Review gates default to non-destructive termination on cancel (NS3).
- **Integrity Lock**: Upstream skill integrity (`npm run generate-integrity`) must be updated and checked (`npm run verify-integrity`) upon completing all edits.

---

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (scripts in `scripts/`, schema in `ws-shared/`, tests in `test/`).
- [x] Deterministic validation scripts implemented.
- [x] Schema and template synchronized (`plans.wikiDir`).
- [x] Orchestrator post-close life-cycle updated.
- [x] Catalogs and dependencies synchronized (`bin/skill-dependencies.json`, `CATALOG.md`, `autoload.md`).
- [x] All 18 ACs and 4 NSs mapped to specific tests.
- [x] Clean test execution (`npm run test`).

---

## 8. Open Questions

None. All architectural decisions, directory structures, and subcommand boundaries were approved during the initial specification grilling session.
