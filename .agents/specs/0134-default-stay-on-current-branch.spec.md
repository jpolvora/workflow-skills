---
id: null
slug: default-stay-on-current-branch
title: "Configurable default branch strategy: stay on current branch by default in workflows"
source: local
specDate: 2026-09-26
---

# Specification — Configurable default branch strategy: stay on current branch by default in workflows

**State:** draft

## Description

In `ws-spec-to-pr` and `ws-spec-to-pr-lite`, workflow bootstrap (`ws-shared/setup.md` § 5b) presents an interactive `user-gate` on every new workflow start asking whether to create a feature branch from current HEAD, create a feature branch from the base branch, or stay on the current branch. In normal interactive mode, the gate always recommends option 2 (create from base) when on a protected branch or option 1 (create from HEAD) otherwise. Even when developers deliberately check out their target working branch before invoking the workflow, there is no configuration key in `.ws/config.json` to alter this default recommendation or automatically stay on the current branch without interactive gating.

This specification introduces a configurable default branch strategy in `.ws/config.json`:

1. **Configurable Strategy:** Introduce `defaults.branchStrategy` in `config.json` with supported values `"stay"`, `"from-current"`, `"from-base"`, and `"prompt"`. The seeded and fallback default is `"stay"`.
2. **Default Stay Behavior:** When `defaults.branchStrategy` resolves to `"stay"` and the repository is on an attached branch, shared bootstrap records `branchStrategy: stay` and uses the current branch as `state.branch` without requiring manual gate interaction, streamlining workflow starts.
3. **Explicit Prompt Override:** When `defaults.branchStrategy` is set to `"prompt"`, or when a CLI switch (`--prompt-branch`) is provided, bootstrap surfaces the three-choice branch gate. When the configured strategy is `"stay"`, option 3 ("Stay on current branch") is marked `(Recommended)`.
4. **Detached HEAD Safety:** Detached HEAD (`HEAD`) remains an invalid state for `stay`. When detached, bootstrap rejects `stay` and mandates creating or selecting a named branch before proceeding.
5. **Schema and GUI Parity:** Synchronize `config.schema.json`, `config.json.example`, and the desktop editor `Edit-WorkflowSkillsConfig.ps1` to include `defaults.branchStrategy`.

## Acceptance Criteria

- AC1: `config.schema.json` defines `defaults.branchStrategy` as an optional string enum accepting `stay`, `from-current`, `from-base`, and `prompt`.
- AC2: `config.json.example` includes `defaults.branchStrategy` seeded with `stay`.
- AC3: `Edit-WorkflowSkillsConfig.ps1` binds `defaults.branchStrategy` in the Defaults section and passes `node test/test-powershell-config-editor.js`.
- AC4: Shared bootstrap `setup.md` resolves `defaults.branchStrategy` from `config.json` with a default of `stay` when omitted.
- AC5: When `defaults.branchStrategy` resolves to `stay` on an attached HEAD, bootstrap records `branchStrategy: stay` without presenting the feature branch gate.
- AC6: When `defaults.branchStrategy` resolves to `prompt` or when `--prompt-branch` is passed, bootstrap presents the three-choice branch gate.
- AC7: When HEAD is detached, bootstrap rejects `stay` and requires creating a named branch.
- AC8: Standard and lite workflows persist `branchStrategy: stay` and `state.branch` to state files when staying on current branch.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mid-workflow branch switching | Branch strategy is established strictly at bootstrap step 5b |
| Removing feature branch creation capability | Users and projects can choose `from-current`, `from-base`, or `prompt` via config |
| Rewriting git-flow base branch resolution | Base branch detection remains governed by `detect-base-branch.cjs` |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Fallback strategy when omitted in config | `stay` | User requirement specifies staying on current branch by default | y |
| Detached HEAD safety | Reject `stay` and require named branch | Commits cannot be preserved reliably on an anonymous detached HEAD | y |
| Explicit prompt override switch | `--prompt-branch` | Allows ad-hoc branch creation without editing project config | y |
| Auth, tenancy, UI rendering, and database dimensions | N/A because the change is limited to config schema, bootstrap prose, and editor script | No external identity, multi-tenant database, or rendered browser UI | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Limited to `ws-shared/runtime/setup.md`, `config.schema.json`, `config.json.example`, and `Edit-WorkflowSkillsConfig.ps1` | Diff inspection |
| Acceptance criteria | Discrete, unambiguous pass/fail criteria for schema, GUI, and runtime resolution | `validate_spec.cjs --mode=authoring` |
| Negative test scenarios | Red tests for invalid enum values and detached HEAD state | Listed under Negative & Failing Test Scenarios |
| Tool synchronization | Schema-to-GUI parity validated | `node test/test-powershell-config-editor.js` |
| Blockers | No unresolved blockers or external dependencies | Workspace verified |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node test/test-powershell-config-editor.js` passes with zero errors and validates parity for `defaults.branchStrategy`.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0134-default-stay-on-current-branch.spec.md` exits 0.
- Workflow gate history logs `branch-gate | default-stay | stay | {branch} | ISO` when auto-selecting stay from config.

### Negative & Failing Test Scenarios

- Negative 1: Providing an unsupported string value for `defaults.branchStrategy` (e.g. `invalid-choice`) must fail schema validation against `config.schema.json`.
- Negative 2: In a detached HEAD state with `defaults.branchStrategy: stay`, bootstrap must fail closed and refuse to persist `state.branch: HEAD`.
- Negative 3: Adding `defaults.branchStrategy` to `config.schema.json` without updating `Edit-WorkflowSkillsConfig.ps1` must fail `node test/test-powershell-config-editor.js` Test 8.

## Original Issue Context

Raw requirement: "Update configuration of the workflow spec-to-pr lite and full to not by default use the feature branch config. So always stay on current branch by default."

### Prior Work Sweep

Prior specification `0022-workflow-bootstrap-feature-branch.spec.md` (commit `c56043b0`) originally introduced the bootstrap feature-branch gate to prevent accidental commits to base branches, but hardcoded the recommendation to create a feature branch without providing any configuration in `config.json` to customize the default behavior. Commit `cd95e7f7` subsequently refined `autoMode` behavior to default to `stay`, but normal interactive mode remained bound to the forced prompt and feature-branch recommendations.

### Design Intent

The original gate was intended to prevent accidental commits on long-lived branches when users forgot to branch. However, many developer workflows already manage branches prior to invoking the orchestrator (e.g. checking out an assigned task branch or feature branch). Forcing a gate interaction and defaulting to new branch creation creates unnecessary friction. Making `defaults.branchStrategy` configurable and defaulting to `stay` preserves safety (via detached HEAD guard and explicit prompt options) while honoring user choice.

## Notes

Lookup verified that `config.json` currently has no `branchStrategy` key in `defaults`. Stack is `node-skills-package` (Node 22). Configuration changes must maintain parity with PowerShell GUI config editor `Edit-WorkflowSkillsConfig.ps1`.
