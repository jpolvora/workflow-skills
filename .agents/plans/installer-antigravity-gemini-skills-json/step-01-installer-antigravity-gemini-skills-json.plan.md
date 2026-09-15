---
step: 1
slug: installer-antigravity-gemini-skills-json
workflowId: installer-antigravity-gemini-skills-json
status: completed
startedAt: "2026-09-15T03:30:00Z"
endedAt: "2026-09-15T03:33:13.960Z"
acRefs: []
---
# Implementation Plan — Declarative Antigravity and Gemini Skills Configuration via skills.json

## Executive Summary
This feature upgrades the Gemini CLI and Antigravity IDE global host target (`gemini`) in the `workflow-skills` installer (`bin/install-rules.js`, `bin/cli.js`) from directory-level symlinks/junctions/copies under `$HOME/.gemini/config/skills/` to the official declarative JSON configuration mechanism via `$HOME/.gemini/config/skills.json`. It introduces helper functions in `bin/install-rules.js` to safely read, parse, upsert, and remove entries in `skills.json` (`path: "~/.agents/skills"`, `include_only: ["ws-*"]`), updates `projectSkillsToSecondaryTargets` and `removeSkillsFromSecondaryTargets` in `bin/cli.js`, sweeps legacy `ws-*` directory junctions from `~/.gemini/config/skills/`, preserves all user custom entries and non-workflow skill folders, updates secondary target auto-detection, and adds comprehensive tests in `test/test-install.js`.

## Acceptance Criteria Mapping
- **AC1:** Define helper functions in `bin/install-rules.js` (`getGeminiSkillsJsonPath`, `readGeminiSkillsJson`, `upsertGeminiSkillsJsonEntry`, `removeGeminiSkillsJsonEntry`, `cleanupLegacyGeminiSkills`) to manage `$HOME/.gemini/config/skills.json` with path `~/.agents/skills` and include_only pattern `["ws-*"]`.
- **AC2:** Update global installation and update workflows in `bin/cli.js` so the `gemini` target configures `$HOME/.gemini/config/skills.json` instead of creating directory links or copies in `~/.gemini/config/skills`.
- **AC3:** Automatically detect and remove legacy `ws-*` symlinks, junctions, and directories inside `$HOME/.gemini/config/skills` during `gemini` target configuration to prevent duplicate skill discovery.
- **AC4:** Update global uninstallation in `bin/cli.js` so removing workflow-skills or the `gemini` target deletes the `~/.agents/skills` entry from `$HOME/.gemini/config/skills.json`.
- **AC5:** Preserve pre-existing custom entries, inherits blocks, and comments in `$HOME/.gemini/config/skills.json` and non-workflow skill directories in `~/.gemini/config/skills` across all operations.
- **AC6:** Update secondary target detection in `bin/install-rules.js` so the `gemini` target auto-detects when `~/.gemini`, `~/.gemini/config/skills.json`, or `~/.gemini/config/skills` exists.
- **AC7:** Update CLI documentation in `README.md` and `docs/index.html` describing declarative `skills.json` configuration for Antigravity and Gemini CLI.
- **AC8:** Provide automated tests in `test/test-install.js` covering `skills.json` creation, idempotency, legacy cleanup, custom entry preservation, and uninstallation.

## Negative & Edge Case Scenarios
- **NS1 (Corrupt JSON Recovery):** When `$HOME/.gemini/config/skills.json` contains invalid JSON syntax, create a `.bak.<timestamp>` backup, log a warning, and initialize a valid structure without crashing the installer.
- **NS2 (Legacy Cleanup Scope):** When `$HOME/.gemini/config/skills/` contains legacy `ws-*` items alongside third-party skills (e.g. `atividades`, `my-skill`), remove only `ws-*` and leave third-party skills untouched.
- **NS3 (Uninstallation Removal):** When uninstalling with `--targets gemini`, remove the `~/.agents/skills` entry from `skills.json` while keeping unrelated user entries intact.
- **NS4 (Permission / Read-Only Containment):** When `skills.json` cannot be written due to permissions, an auto-detected target logs an isolated warning without aborting canonical installation.

## Proposed Code Changes

### 1. `bin/install-rules.js`
- Update `GLOBAL_HOST_TARGETS`:
  - `gemini` description and add `configSubpath: path.join('.gemini', 'config', 'skills.json')`.
- Add exports:
  - `getGeminiSkillsJsonPath(homeDir)`
  - `readGeminiSkillsJson(jsonPath)`
  - `upsertGeminiSkillsJsonEntry(homeDir, entry)`
  - `removeGeminiSkillsJsonEntry(homeDir, targetPath)`
  - `cleanupLegacyGeminiSkills(homeDir)`
- Update `detectExistingSecondaryTargets`:
  - Check for `host.configSubpath` file existence in addition to `host.path` and `hostRootPath`.

### 2. `bin/cli.js`
- In `projectSkillsToSecondaryTargets`:
  - When `target.id === 'gemini'`, call `upsertGeminiSkillsJsonEntry` and `cleanupLegacyGeminiSkills`.
  - Report configuration in console output and handle `bestEffort` error containment.
- In `removeSkillsFromSecondaryTargets`:
  - When `target.id === 'gemini'`, call `removeGeminiSkillsJsonEntry`.
- In `printHelp`:
  - Update `--targets` description noting `gemini` configures `~/.gemini/config/skills.json`.

### 3. `test/test-install.js`
- Update Phase 12 tests:
  - Verify targeted gemini install produces valid `skills.json` with `~/.agents/skills` and `["ws-*"]`.
  - Verify legacy `ws-*` cleanup removes old links while preserving custom folders.
  - Verify corrupted `skills.json` creates backup and heals without aborting install.
  - Verify uninstall removes the entry from `skills.json`.
  - Verify auto-detection triggers when `~/.gemini` or `~/.gemini/config/skills.json` exists.
  - Update `--no-symlink` copy tests to target `claude` or `codex`.

### 4. `README.md` & `docs/index.html`
- Update Antigravity / Gemini CLI instructions to document `~/.gemini/config/skills.json`.

## Step-by-Step Implementation Tasks
1. Implement `skills.json` helpers and target definition in `bin/install-rules.js`.
2. Integrate `skills.json` handling into `projectSkillsToSecondaryTargets` and `removeSkillsFromSecondaryTargets` in `bin/cli.js`.
3. Update `test/test-install.js` to cover all new acceptance criteria and negative scenarios.
4. Update documentation in `README.md` and `docs/index.html`.
5. Run automated tests and integrity verification.

## Section 6: Stack & Security Invariants Verification Plan
- **Type Safety & Strict Validation:** Ensure all JSON parsing is safely wrapped in `try ... catch` with schema validation before writing.
- **Path Traversal Prevention:** Ensure all filesystem paths resolve under user's home directory with no unescaped path concatenations.
- **Atomic Operations:** Ensure JSON file writing handles directory creation and error boundaries gracefully.
- **Defect-Class Sweep:** Ensure that any function checking filesystem paths for `gemini` handles both Windows junctions, symlinks, and normal files without throwing `EEXIST`/`ENOENT`.
