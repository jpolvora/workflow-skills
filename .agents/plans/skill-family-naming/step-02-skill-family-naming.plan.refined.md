---
slug: skill-family-naming
title: "Regroup packaged skill IDs as ws-{family}-{verb} (spec family first)"
status: active
step: 2
workflowId: skill-family-naming-20260902T215014Z
startedAt: "2026-09-02T21:50:14Z"
endedAt: "2026-09-02T21:58:00Z"
acRefs: []
---
# Refined Implementation Plan — Regroup packaged skill IDs as ws-{family}-{verb}

## 0. Summary & Business Rules

**Objective:** Rename packaged `ws-*` skill folders and every live reference so skill IDs read as `ws-{family}-{skillName}` (spec family and plan family), updating the upstream SoT (`.agents/skills/ws-*`), installer dependency graph (`bin/skill-dependencies.json` and hub copy), tests, hubs, harness audit, and documentation.

**Business Rules:**
1. **Specs Family Hard Rule:** Every packaged skill whose ID contains `spec` must start with `ws-spec-` (AC1, AC2, AC10).
2. **Plan Family:** `ws-write-plan` -> `ws-plan-write`, `ws-verify-plan` -> `ws-plan-verify`, `ws-update-plan-implementation` -> `ws-plan-update`, `ws-interview` -> `ws-plan-interview` (AC3, AC4).
3. **Spec Providers Subfamily:** GitHub, Azure DevOps, and local map to `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, `ws-spec-provider-local` (AC2, AC14, AC15).
4. **No Legacy Shims in SoT:** Retired folder IDs must not exist on disk in the upstream SoT (`.agents/skills/`) (AC1, AC2, AC3, AC4, AC13).
5. **Enforcement:** `ws-check-harness` fails closed if any skill or dependency matches `^ws-(?!spec-)[a-z0-9-]*spec` or retired provider IDs (AC10).
6. **Self-Learning Memory Hook:** `ws-spec-update` requires a self-learning memory entry when updating a spec due to missed ACs (AC11).
7. **Integrity & Parity:** SCM provider contract parity is maintained; integrity hashes are regenerated; all harness checks and tests pass with exit code 0 (AC14, AC16).
8. **Memory Traps Addressed:** Ensure stale live-reference patterns account for retired skill folders, avoid redundant scripts, ensure repo-relative paths in handoff payloads, and maintain parity across remote providers.

## 1. Acceptance Criteria Mapping & Scope

| AC | Description | Task | Plan Section |
|---|---|---|---|
| AC1 | Rename spec family skills (`ws-write-spec` -> `ws-spec-write`, `ws-sync-spec` -> `ws-spec-update`, `ws-multi-spec` -> `ws-spec-multi`) | T01 | §2.1 |
| AC2 | Rename spec provider skills (`ws-local-spec-provider` -> `ws-spec-provider-local`, `ws-github-provider` -> `ws-spec-provider-github`, `ws-azure-devops-provider` -> `ws-spec-provider-azure-devops`) | T02 | §2.2 |
| AC3 | Rename plan skills (`ws-write-plan` -> `ws-plan-write`, `ws-verify-plan` -> `ws-plan-verify`, `ws-update-plan-implementation` -> `ws-plan-update`) | T03 | §2.3 |
| AC4 | Rename `ws-interview` -> `ws-plan-interview` | T03 | §2.3 |
| AC5 | Retain already-conforming `ws-spec-*` IDs (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-format`, `ws-spec-index`, `ws-spec-memo`) | T04 | §2.4 |
| AC6 | Update orchestrator references and dispatch tables in `ws-spec-to-pr` and `ws-spec-to-pr-lite` | T05 | §2.5 |
| AC7 | Update `bin/skill-dependencies.json` and hub `skill-dependencies.json` | T04 | §2.4 |
| AC8 | Update documentation and hubs (`AGENTS.md`, `ws-shared/AGENTS.md`, `autoload.md`, `CATALOG.md`, `README.md`, `FEATURES.md`, etc.) | T06 | §2.6 |
| AC9 | Document naming rules in `SKILL_AUTHORING.md` | T06 | §2.6 |
| AC10 | Enforce naming in `ws-check-harness` | T07 | §2.7 |
| AC11 | Add self-learning memory hook to `ws-spec-update/SKILL.md` | T01 | §2.1 |
| AC12 | Update `invocation_names` with short forms across renamed skills | T01, T02, T03 | §2.1, §2.2, §2.3 |
| AC13 | Ensure installer `update` removes old folders; update `test/` suite | T08 | §2.8 |
| AC14 | Remote providers invoke `ws-spec-write` and `ws-spec-provider-local` register | T02 | §2.2 |
| AC15 | `config.json` `providers.active` / `providers.scm` keep `github` \| `azure-devops` \| `local` enum values | T02, T05 | §2.2, §2.5 |
| AC16 | Regenerate integrity, site catalog bump, and verify 0 critical harness findings | T09 | §2.9 |
| AC17 | Archived plan/spec history not rewritten | T06 | §2.6 |

## 2. Tasks & Detailed Implementation

### 2.1 T01: Spec Family Moves
- Move `.agents/skills/ws-write-spec` to `.agents/skills/ws-spec-write` (AC1, AC12).
  - Update `.agents/skills/ws-spec-write/SKILL.md` frontmatter: `name: ws-spec-write`, `invocation_names: [ws-spec-write, spec-write, ws-write-spec, write-spec]`.
  - Update banner to `> When this skill is loaded, output "ws-spec-write loaded."` and internal references.
- Move `.agents/skills/ws-sync-spec` to `.agents/skills/ws-spec-update` (AC1, AC11, AC12).
  - Update `.agents/skills/ws-spec-update/SKILL.md` frontmatter: `name: ws-spec-update`, `invocation_names: [ws-spec-update, spec-update, ws-sync-spec, sync-spec]`.
  - Update banner to `> When this skill is loaded, output "ws-spec-update loaded."`.
  - Add self-learning memory requirement: If the spec update was triggered by a bug fix / missed AC, record a memory entry via `ws-self-learning` (`DO NOT` / `INSTEAD DO`) and compile; if wording-only alignment, skip memory and report skip (AC11).
  - Distinguish feature spec update (`ws-spec-update`) from PRD index promotion (`ws-spec-index`).
- Move `.agents/skills/ws-multi-spec` to `.agents/skills/ws-spec-multi` (AC1, AC12).
  - Update `.agents/skills/ws-spec-multi/SKILL.md` frontmatter: `name: ws-spec-multi`, `invocation_names: [ws-spec-multi, spec-multi, ws-multi-spec, multi-spec]`.
  - Update banner and internal references.
- Expected test: V01:spec-family-moved

### 2.2 T02: Spec Provider Moves
- Move `.agents/skills/ws-local-spec-provider` to `.agents/skills/ws-spec-provider-local` (AC2, AC12).
  - Update `.agents/skills/ws-spec-provider-local/SKILL.md` frontmatter: `name: ws-spec-provider-local`, `invocation_names: [ws-spec-provider-local, spec-provider-local, ws-local-spec-provider]`.
  - Update script paths and internal docs.
- Move `.agents/skills/ws-github-provider` to `.agents/skills/ws-spec-provider-github` (AC2, AC12, AC14).
  - Update `.agents/skills/ws-spec-provider-github/SKILL.md` frontmatter: `name: ws-spec-provider-github`, `invocation_names: [ws-spec-provider-github, spec-provider-github, ws-github-provider]`.
  - Ensure fetch-to-spec invokes `ws-spec-write` then `ws-spec-provider-local` register (AC14).
- Move `.agents/skills/ws-azure-devops-provider` to `.agents/skills/ws-spec-provider-azure-devops` (AC2, AC12, AC14).
  - Update `.agents/skills/ws-spec-provider-azure-devops/SKILL.md` frontmatter: `name: ws-spec-provider-azure-devops`, `invocation_names: [ws-spec-provider-azure-devops, spec-provider-azure-devops, ws-azure-devops-provider]`.
  - Ensure fetch-to-spec invokes `ws-spec-write` then `ws-spec-provider-local` register (AC14).
- Confirm `config.json` retains `providers.active` and `providers.scm` enum values `github`, `azure-devops`, `local` (AC15).
- Expected test: V02:provider-family-moved

### 2.3 T03: Plan Family Moves
- Move `.agents/skills/ws-write-plan` to `.agents/skills/ws-plan-write` (AC3, AC12).
  - Update `.agents/skills/ws-plan-write/SKILL.md` frontmatter: `name: ws-plan-write`, `invocation_names: [ws-plan-write, plan-write, ws-write-plan, write-plan]`.
- Move `.agents/skills/ws-verify-plan` to `.agents/skills/ws-plan-verify` (AC3, AC12).
  - Update `.agents/skills/ws-plan-verify/SKILL.md` frontmatter: `name: ws-plan-verify`, `invocation_names: [ws-plan-verify, plan-verify, ws-verify-plan, verify-plan]`.
- Move `.agents/skills/ws-update-plan-implementation` to `.agents/skills/ws-plan-update` (AC3, AC12).
  - Update `.agents/skills/ws-plan-update/SKILL.md` frontmatter: `name: ws-plan-update`, `invocation_names: [ws-plan-update, plan-update, ws-update-plan-implementation]`.
- Move `.agents/skills/ws-interview` to `.agents/skills/ws-plan-interview` (AC4, AC12).
  - Update `.agents/skills/ws-plan-interview/SKILL.md` frontmatter: `name: ws-plan-interview`, `invocation_names: [ws-plan-interview, plan-interview, ws-interview, interview]`.
- Expected test: V03:plan-family-moved

### 2.4 T04: Dependency Graph Updates
- In `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` (AC7):
  - Rename package definitions to new IDs:
    - `ws-write-spec` -> `ws-spec-write`
    - `ws-sync-spec` -> `ws-spec-update`
    - `ws-multi-spec` -> `ws-spec-multi`
    - `ws-local-spec-provider` -> `ws-spec-provider-local`
    - `ws-github-provider` -> `ws-spec-provider-github`
    - `ws-azure-devops-provider` -> `ws-spec-provider-azure-devops`
    - `ws-write-plan` -> `ws-plan-write`
    - `ws-verify-plan` -> `ws-plan-verify`
    - `ws-update-plan-implementation` -> `ws-plan-update`
    - `ws-interview` -> `ws-plan-interview`
  - Update `dependencies` arrays across all packages pointing to old IDs.
  - Retain conforming `ws-spec-*` packages (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-spec-format`, `ws-spec-index`, `ws-spec-memo`) (AC5).
- Expected test: V04:dependencies-valid

### 2.5 T05: Orchestrators and Shared Scripts Update
- In `.agents/skills/ws-spec-to-pr/SKILL.md`:
  - Update pipeline steps table:
    - Step 0: `ws-spec-write` (was `ws-write-spec`)
    - Step 1: `ws-plan-write` (was `ws-write-plan`)
    - Step 2: `ws-plan-interview` (was `ws-interview`)
    - Step 5: `ws-plan-verify` (was `ws-verify-plan`)
    - Providers: `ws-spec-provider-github`, `ws-spec-provider-azure-devops`, `ws-spec-provider-local`
    - Post: `ws-plan-update`
- In `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`:
  - Update step dispatch paths, commands, and subagent prompts to reflect new IDs (AC6).
- In `.agents/skills/ws-spec-to-pr-lite/SKILL.md`:
  - Update lite steps table:
    - Step 0: `ws-spec-write`
    - Step 1: `ws-plan-write`
    - Providers: `ws-spec-provider-*`
- In `.agents/skills/ws-shared/setup.md`:
  - Update provider resolution: map `local` to `ws-spec-provider-local`, `github` to `ws-spec-provider-github`, `azure-devops` to `ws-spec-provider-azure-devops` (AC15).
  - Update scripts and commands pointing to renamed skills.
- In `.agents/skills/ws-shared/config-resolution.md`:
  - Update references to provider skills (AC15).
- In `.agents/skills/ws-shared/scm-provider-contract.md`:
  - Update references to `ws-spec-provider-github` and `ws-spec-provider-azure-devops` (AC14, AC15).
- In `.agents/skills/ws-spec-to-pr/scripts/`:
  - Update references in `github-issue-to-spec.py`, `ado-workitem-to-spec.py`, `build_dispatch_context.cjs`, etc.
- In `.agents/skills/ws-shared/scripts/`:
  - Update references in `resolve_consumer_root.cjs`, `setup.cjs`, `ws-doctor`, etc.
- Expected test: V05:orchestrator-dispatch-valid

### 2.6 T06: Documentation and Hub Alignment
- Update `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`:
  - Update skill inventory tables, routing tables, and task dispatch (AC8).
- Update `.agents/skills/ws-shared/autoload.md`:
  - Update specs vocabulary, router table, keywords, and ASCII flow (AC8).
- Update `CATALOG.md` (root and `.agents/skills/ws-shared/CATALOG.md`):
  - Update task router and bounded skill inventory (AC8).
- Update `README.md`, `FEATURES.md`, and `.agents/skills/ws-shared/tools.md` (AC8).
- Update `.agents/skills/ws-spec-format/SKILL.md` and `FORMAT.md` (AC8).
- In `SKILL_AUTHORING.md`:
  - Document `ws-{family}-{skillName}` rule (AC9).
  - Document specs-family hard rule: `ws-spec-*` only (AC9).
  - Document `ws-spec-provider-{backend}` subfamily rule (AC9).
  - List in-scope rename table and deferred optional families (`ws-check-*`, `ws-fable-*`, `ws-goal-*`) (AC9).
- Note: Do not rewrite `{plansDir}` archives or historical changelog entries (AC17).
- Expected test: V06:docs-aligned

### 2.7 T07: Harness Audit Enforcement
- In `.agents/skills/ws-check-harness/scripts/check_harness.js` (or relevant phase script):
  - Add check failing closed (critical error) when:
    - Any packaged skill folder name matches `^ws-(?!spec-)[a-z0-9-]*spec` (token `spec` not immediately following `ws-`) (AC10).
    - Any packaged skill folder name equals retired provider IDs `ws-github-provider`, `ws-azure-devops-provider`, `ws-local-spec-provider` (AC10).
    - Any ID in `bin/skill-dependencies.json` matches the forbidden patterns (AC10).
- Expected test: V07:harness-rule-enforced

### 2.8 T08: Installer, Test Suite, and Cleanup
- In `bin/consumer-migration.js` / `bin/cli.js`:
  - Ensure installer `update` logic prunes retired directories (`ws-write-spec`, `ws-sync-spec`, `ws-multi-spec`, `ws-local-spec-provider`, `ws-github-provider`, `ws-azure-devops-provider`, `ws-write-plan`, `ws-verify-plan`, `ws-update-plan-implementation`, `ws-interview`) so only the new folders exist on disk (AC13).
- In `test/`:
  - Update tests that hardcoded retired skill IDs (`test-install.js`, `test-consumer-migration.js`, `test-harness.js`, `test-skills-audit.js`, etc.) to use the new names (AC13).
- Expected test: V08:tests-passing

### 2.9 T09: Integrity Regeneration and Verification
- Run `npm run generate-integrity` to recompute SHA256 hashes of all updated skills (AC16).
- Run `npm run verify-integrity` to confirm checksums match (AC16).
- Run `npm run test` to ensure full test suite passes (AC16).
- Run `node .agents/skills/ws-check-harness/scripts/check_harness.js` across Phases 0–5c to verify 0 critical findings and 0 hub drift (AC16).
- Expected test: V09:integrity-and-harness-clean

## 3. Verification & Testing Strategy

### Automated Tests
- `npm run test`: runs full suite including updated tests in `test/`.
- `node .agents/skills/ws-check-harness/scripts/check_harness.js`: verifies harness rules and integrity.
- `npm run verify-integrity`: validates `skill-integrity.json`.

### Verification Steps
- V01: Spec family moved without leaving retired folders.
- V02: Spec provider skills moved and retain parity.
- V03: Plan family moved without leaving retired folders.
- V04: Dependency graph free of old IDs and cycles.
- V05: Orchestrator tables and dispatch scripts resolve new IDs.
- V06: Docs and hubs aligned with new names.
- V07: `ws-check-harness` enforces `ws-spec-*` and blocks retired IDs.
- V08: All tests pass with exit code 0.
- V09: Integrity verified; 0 critical harness errors.
