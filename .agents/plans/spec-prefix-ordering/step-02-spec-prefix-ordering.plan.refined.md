---
slug: spec-prefix-ordering
title: Optional chronological spec filename prefixes and ws-spec-organizer
status: active
step: 2
workflowId: spec-prefix-ordering-20260828T184700Z
startedAt: "2026-08-28T18:47:00Z"
endedAt: "2026-08-28T18:54:37.199Z"
acRefs: []
---
## 0. Summary & Business Rules
- **Objective**: Add `plans.enforceSpecPrefixOrdering` boolean config (default `false`) and a dedicated skill `ws-spec-organizer` with `resolve_spec_path.cjs` and `organize_specs.cjs`.
- **Business Rules**:
  - `plans.enforceSpecPrefixOrdering`:
    - `false` (default) -> new spec-of-record writes use `{specsDir}/{slug}.spec.md`.
    - `true` -> new spec-of-record writes use `{specsDir}/NNNN-{slug}.spec.md` where `NNNN` is `max(existing 4-digit prefixes) + 1` (zero-padded 4 digits, e.g. `0001`).
    - Omitted, non-boolean, or missing config safely resolves to `false`.
  - **Invariants**:
    - Frontmatter `slug` is always the unprefixed slug (`slug: foo`).
    - Workflow plan copies `{plansDir}/{slug}/step-00-{slug}.spec.md` remain completely unprefixed.
    - Sibling `.context.md` companions receive matching prefixes when enabled.
    - Existing paths take precedence: if `{slug}.spec.md` or `NNNN-{slug}.spec.md` already exists on disk, `resolve_spec_path.cjs` returns that existing path without creating double-prefixed stems.
  - **Organizer**:
    - `organize_specs.cjs` supports `--dry-run` (default) and `--apply`.
    - Sorts top-level `{specsDir}/*.spec.md` chronologically: frontmatter `specDate` (YYYY-MM-DD) -> git first-add date -> filesystem `mtime` -> filename tie-break.
    - Uses `git mv` when tracked, `fs.renameSync` when untracked.
    - Rewrites `index.PRD` `spec:` backticks to match on-disk filenames.
    - Ignores `{plansDir}`, `index.PRD`, and subdirectories under `{specsDir}`.
    - Strips existing `^\d{4}-` prefix before assigning sequence numbers, preventing double prefixes.

## 1. Definition of Ready & Scope
- **AC Coverage**:
  - AC1: `config.schema.json` defines `plans.enforceSpecPrefixOrdering` as a boolean with default false.
  - AC2: `config.json.example` seeds `plans.enforceSpecPrefixOrdering` as false with comments.
  - AC3: Runtime resolution treats only explicit JSON `true` as enforce-on; omitted, false, non-boolean, or missing config resolve to false.
  - AC4: `ws-configure-project/INTERVIEW.md` includes gate table, option table (Recommended: false), and write semantics.
  - AC5: `ws-spec-organizer` ships `SKILL.md` with loaded banner `ws-spec-organizer loaded.`, `scripts/resolve_spec_path.cjs`, and `scripts/organize_specs.cjs`; recipes use `node` launchers.
  - AC6: `resolve_spec_path.cjs --slug {slug}` with flag false and no existing file prints `{specsDir}/{slug}.spec.md`.
  - AC7: `resolve_spec_path.cjs --slug {slug}` with flag true and no existing file prints `{specsDir}/NNNN-{slug}.spec.md`.
  - AC8: `resolve_spec_path.cjs` returns existing on-disk path when `{slug}.spec.md` or `NNNN-{slug}.spec.md` exists.
  - AC9: `resolve_spec_path.cjs` with flag true and missing organizer script exits non-zero and writes no spec file.
  - AC10: `ws-write-spec` writes spec-of-record to path from `resolve_spec_path.cjs`; frontmatter `slug` equals unprefixed slug.
  - AC11: `ws-spec-from-provider` skip-existing matches `NNNN-us-{id}.spec.md` alongside `us-{id}.spec.md`.
  - AC12: Provider `fetch-to-spec` and `register_local_spec.cjs` do not write `{plansDir}/{slug}/step-00-{slug}.spec.md` with numeric prefix.
  - AC13: `ws-spec-index` `track` finds prefixed or unprefixed spec files and writes Feature map `spec:` backticks using on-disk filename.
  - AC14: `organize_specs.cjs` with no `--apply` (or `--dry-run`) exits 0 and leaves `{specsDir}` filenames unchanged.
  - AC15: `organize_specs.cjs --apply` assigns `0001`… chronologically, `git mv`s tracked files, and rewrites `index.PRD`.
  - AC16: `organize_specs.cjs --apply` assigns same NNNN to sibling `{slug}.context.md`.
  - AC17: `organize_specs.cjs --apply` does not rename `{plansDir}` trees, `index.PRD`, or nested directories under `{specsDir}`.
  - AC18: Re-running `--apply` on an already prefixed tree does not duplicate prefixes (`0001-0001-`).
  - AC19: `bin/skill-dependencies.json` and `ws-shared/skill-dependencies.json` list `ws-spec-organizer` in Workflows package and as dependency of `ws-write-spec`.
  - AC20: Docs (`FORMAT.md`, `autoload.md`, `tools.md`, `CATALOG.md`, `ws-shared/CATALOG.md`, `FEATURES.md`) describe flag and helper.
  - AC21: Automated tests cover resolve and organize comprehensively.
  - AC22: `npm run generate-integrity` updates checksums.
- **Negative Scenarios**:
  - NS1: Flag true and `resolve_spec_path.cjs` absent: command exits non-zero; no `{specsDir}` file created.
  - NS2: `organize_specs.cjs` without `--apply`: exit 0; fixture filenames unchanged.
  - NS3: Fixture spec already named `0003-demo.spec.md`: resolve `--slug demo` returns that path, not `0004-0003-demo.spec.md`.
  - NS4: `ws-spec-from-provider` skip: `{specsDir}/0002-us-99.spec.md` exists -> id 99 is skipped.
  - NS5: `--apply` while a target `NNNN-*.spec.md` already exists as a different slug: fail closed, no partial `git mv`.

## 2. Technical Design & Architecture
- **Component 1: Config & Schema**:
  - [MODIFY] `.agents/skills/ws-shared/config.schema.json` -> add `plans.properties.enforceSpecPrefixOrdering` (`type: "boolean"`, `default: false`).
  - [MODIFY] `.agents/skills/ws-shared/config.json.example` -> add `enforceSpecPrefixOrdering: false` under `plans`.
  - [MODIFY] `.agents/skills/ws-configure-project/INTERVIEW.md` -> add Section 4/Plans Gate with gate table, options table, write semantics.
- **Component 2: New Skill `ws-spec-organizer`**:
  - [NEW] `.agents/skills/ws-spec-organizer/SKILL.md` (YAML frontmatter, description, invocation, loaded banner).
  - [NEW] `.agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs` (cli flags: `--slug`, `--repo-root`, `--context`, `--json`).
  - [NEW] `.agents/skills/ws-spec-organizer/scripts/organize_specs.cjs` (cli flags: `--repo-root`, `--dry-run`, `--apply`, `--json`).
- **Component 3: Integrations with Existing Skills**:
  - [MODIFY] `.agents/skills/ws-write-spec/SKILL.md` -> use `resolve_spec_path.cjs`.
  - [MODIFY] `.agents/skills/ws-spec-from-provider/SKILL.md` -> skip-existing checks `NNNN-us-{id}.spec.md`.
  - [MODIFY] `.agents/skills/ws-spec-index/scripts/track_index.cjs` & `SKILL.md` -> resolve on-disk spec filename.
  - [MODIFY] `.agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs` & `SKILL.md` -> ensure plansDir stay unprefixed.
- **Component 4: Package Manifests & Dependencies**:
  - [MODIFY] `bin/skill-dependencies.json` & `.agents/skills/ws-shared/skill-dependencies.json` -> add `ws-spec-organizer` to `workflows` package and `ws-write-spec` dependencies.
- **Component 5: Documentation**:
  - [MODIFY] `CATALOG.md` & `.agents/skills/ws-shared/CATALOG.md` -> add `ws-spec-organizer` to Task router and Layer 2 list.
  - [MODIFY] `.agents/skills/ws-spec-format/references/FORMAT.md` -> document `NNNN-{slug}.spec.md` filename format.
  - [MODIFY] `.agents/skills/ws-shared/autoload.md` -> document spec prefix vocabulary & resolver.
  - [MODIFY] `.agents/skills/ws-shared/tools.md` -> document `resolve_spec_path.cjs` and `organize_specs.cjs`.
  - [MODIFY] `FEATURES.md` -> add spec prefix ordering feature.
- **Component 6: Test Suite**:
  - [NEW] `test/test-spec-prefix-ordering.js`.
  - [MODIFY] `package.json` -> wire `test/test-spec-prefix-ordering.js` in `scripts.tests:harness-efficiency`.

## 3. Step-by-Step Plan
1. **Config & Schema**:
   - Edit `.agents/skills/ws-shared/config.schema.json`.
   - Edit `.agents/skills/ws-shared/config.json.example`.
   - Edit `.agents/skills/ws-configure-project/INTERVIEW.md`.
2. **Implement ws-spec-organizer**:
   - Create `.agents/skills/ws-spec-organizer/SKILL.md`.
   - Create `.agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs`.
   - Create `.agents/skills/ws-spec-organizer/scripts/organize_specs.cjs`.
3. **Integrate writers and providers**:
   - Update `ws-write-spec/SKILL.md`.
   - Update `ws-spec-from-provider/SKILL.md`.
   - Update `ws-spec-index/scripts/track_index.cjs` & `SKILL.md`.
   - Update `ws-local-spec-provider/scripts/register_local_spec.cjs`.
4. **Update Manifests & Dependencies**:
   - Update `bin/skill-dependencies.json` & `.agents/skills/ws-shared/skill-dependencies.json`.
5. **Update Documentation**:
   - Update `CATALOG.md`, `ws-shared/CATALOG.md`, `FORMAT.md`, `autoload.md`, `tools.md`, `FEATURES.md`.
6. **Tests & Quality Gates**:
   - Create `test/test-spec-prefix-ordering.js`.
   - Wire in `package.json`.
   - Run `node test/test-spec-prefix-ordering.js`.
   - Run `npm run build-site` and `npm run generate-integrity`.
   - Run full `npm test`.

## 4. Permissions, Tenancy & i18n
- Pure Node scripts operating on local workspace files. All paths resolved repo-relative POSIX.

## 5. Test Coverage
- AC1: `config.schema.json` validation test.
- AC2: `config.json.example` presence test.
- AC3: Resolution fallback tests (`null`, `undefined`, `"true"`, `false` -> `false`; `true` -> `true`).
- AC4: `ws-configure-project/INTERVIEW.md` table verification.
- AC5: `ws-spec-organizer/SKILL.md` frontmatter & loaded banner test.
- AC6: `resolve_spec_path.cjs` with `false` outputs `{specsDir}/{slug}.spec.md`.
- AC7: `resolve_spec_path.cjs` with `true` outputs `{specsDir}/0001-{slug}.spec.md` (or next max).
- AC8: `resolve_spec_path.cjs` existing path resolution without double prefix.
- AC9: Missing organizer script exit code verification (NS1).
- AC10: `ws-write-spec` resolution integration test.
- AC11: `ws-spec-from-provider` skip-existing matching prefixed spec (NS4).
- AC12: Plan directory `{plansDir}/{slug}/step-00-{slug}.spec.md` unprefixed test.
- AC13: `ws-spec-index` `track` links on-disk filename in `index.PRD`.
- AC14: `organize_specs.cjs` dry-run no-op test (NS2).
- AC15: `organize_specs.cjs --apply` chronological ordering and `index.PRD` rewrite test.
- AC16: `organize_specs.cjs --apply` context companion prefix matching test.
- AC17: `organize_specs.cjs` isolation test (plansDir and subdirs untouched).
- AC18: `organize_specs.cjs` idempotent re-run without prefix duplication (NS3).
- AC19: `bin/skill-dependencies.json` package membership and dependency test.
- AC20: Documentation consistency tests.
- AC21: Full integration suite execution.
- AC22: Checksum integrity verification.
- NS5: Target collision fail-closed test.

## 6. Invariants (Do Not Violate)
- Frontmatter `slug` must remain unprefixed.
- `{plansDir}/{slug}/` folder and files must remain unprefixed.
- Default for `plans.enforceSpecPrefixOrdering` is `false`.
- `ws-spec-organizer` is a Workflows package skill (not Extra).

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Schema definitions updated.
- [x] All 22 ACs and 5 Negative Scenarios tested.
- [x] Full test suite green.
- [x] Integrity checksums regenerated.

## 8. Open Questions
- None. (All binding design decisions resolved).
