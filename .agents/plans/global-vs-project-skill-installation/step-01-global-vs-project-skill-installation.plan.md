---
slug: global-vs-project-skill-installation
title: "Global vs Project Skill Installation Choice"
status: "plan to be refined"
---

## 0. Summary & Business Rules
Provide a first-class feature in `workflow-skills` (`bin/cli.js`, `bin/install-rules.js`, and `install-skills.sh`) allowing users to choose between installing skills globally (in user profile agent directory e.g., `~/.gemini/config/skills` or `~/.agents/skills`) vs locally in the current project directory scope (`.agents/skills`).

Business & Operational Rules:
1. Scope Flag Support: Add CLI options `--global` (`-g`) and `--project` (`-p`) across `install`, `update`, and `uninstall` commands. Default scope remains `--project` (local directory) when omitted.
2. Interactive Prompt: Prompt the user during interactive `npx workflow-skills` execution to select between "Project (.agents/skills in current directory)" and "Global (user global agent directory)".
3. Global Directory Resolution: Cross-platform resolution that respects environment variables `GEMINI_CONFIG_DIR`, `WORKFLOW_SKILLS_GLOBAL_DIR`, or defaults to user profile directories `~/.gemini/config` / `~/.agents`.
4. Independent Global Manifest: Manage global `ws-shared/installed-skills.json` isolated from local project manifests.
5. Override & Precedence Chain: Local project skills in `.agents/skills/` and local configuration in `.agents/skills/ws-shared/` strictly override global skills and global configuration when executing inside a project workspace.
6. Harness Auditor Support: Update `ws-check-harness` (`SKILL.md` and `PHASES.md`) to discover both local and global skills, recognizing local project skills as intentional overrides without issuing false `name:` collision warnings.
7. Automated Integration Tests: Add comprehensive tests in `test/test-install.js` verifying global installation, project installation, update, uninstall, and project override precedence.

## 1. Definition of Ready & Scope
Acceptance Criteria Mapping:
- AC1: CLI `install`, `update`, `uninstall` support `--global` (`-g`).
- AC2: CLI `install`, `update`, `uninstall` support `--project` (`-p`) as default local scope.
- AC3: Interactive CLI mode prompts user to choose installation target scope.
- AC4: Cross-platform global directory path resolution (env vars + `~/.gemini/config` / `~/.agents`).
- AC5: Global `ws-shared/installed-skills.json` manifest isolation.
- AC6: CLI log and summary outputs clearly state target scope (Global vs Project).
- AC7: Project-level skills and `ws-shared/` config override global skills and global config.
- AC8: Automated integration tests in `test/test-install.js` pass cleanly for global, project, and override behaviors.
- AC9: `ws-check-harness` updated for global and mixed install auditing without collision false positives.

Out of Scope:
- Auto-syncing local and global manifests.
- Remote repository synchronization.

## 2. Technical Design & Architecture

### Component & File Edits

#### 1. [MODIFY] `bin/install-rules.js`
- Export `resolveGlobalSkillsDir()` function:
  - Check `process.env.WORKFLOW_SKILLS_GLOBAL_DIR`
  - Check `process.env.GEMINI_CONFIG_DIR` (append `/skills` or resolve root)
  - Fallback to `path.join(os.homedir(), '.gemini', 'config', 'skills')` or `path.join(os.homedir(), '.agents', 'skills')`.
- Export `resolveTargetSkillsDir(options)`:
  - Takes `{ isGlobal: boolean, targetDir: string }`
  - Returns target `.agents/skills` directory or global skills directory.

#### 2. [MODIFY] `bin/cli.js`
- Parse `--global` (`-g`) and `--project` (`-p`) flags from process arguments and command flags.
- Update interactive CLI prompt `promptInstallationScope()` using `readline/promises` to let user pick scope.
- Adapt `targetAgentsDir`, `targetSkillsDir`, and `targetSharedDir` dynamically based on scope selection.
- Ensure `loadInstalledManifest()` and `saveInstalledManifest()` read/write to the selected target `ws-shared/installed-skills.json`.
- Annotate console logs with `[Global]` or `[Project]` scope indicators.

#### 3. [MODIFY] `install-skills.sh`
- Support `--global` (`-g`) and `--project` (`-p`) arguments, passing them through to `node bin/cli.js`.

#### 4. [MODIFY] `.agents/skills/ws-check-harness/SKILL.md` & `PHASES.md`
- Include `{globalSkillsRoot}` path token resolution.
- Enforce local project skill override precedence over global skills during harness audits.

#### 5. [MODIFY] `test/test-install.js`
- Add integration test suite for global install, global update, global uninstall, and mixed local-override resolution.

## 3. Step-by-Step Plan

1. **Step 1: Installer Core & Target Directory Resolution (`bin/install-rules.js`)**
   - Implement `resolveGlobalSkillsDir()` and `resolveTargetSkillsDir(opts)`.
   - Unit test path resolution logic across env var overrides and fallback defaults.

2. **Step 2: CLI Scope Flags & Interactive Prompt (`bin/cli.js` & `install-skills.sh`)**
   - Add flag parsing for `--global` / `-g` and `--project` / `-p`.
   - Add interactive prompt selection when running CLI without flags.
   - Update target directory paths and manifest storage locations based on scope.
   - Update user-facing success/summary logs with scope annotations.

3. **Step 3: Harness Auditor Global & Mixed Mode Support (`ws-check-harness`)**
   - Update `ws-check-harness/SKILL.md` token map with `{globalSkillsRoot}`.
   - Update `ws-check-harness/PHASES.md` Phase 0 and Phase 4 to skip `name:` collision errors when local project skills override global skills.

4. **Step 4: Integration Testing (`test/test-install.js`)**
   - Add `testGlobalInstallFlow()` to verify global CLI installation in a isolated temp dir.
   - Add `testMixedOverrideFlow()` to verify local project skill overrides global skill definitions.
   - Run `npm run tests` to ensure 100% test pass rate.

## 4. Permissions, Tenancy & i18n
- Scope isolation: Global installation writes exclusively into the designated global agent directory (e.g. `~/.gemini/config/skills` or `GEMINI_CONFIG_DIR`) and never writes unauthorized files to external projects.
- Project isolation: Local project installations write to cwd `.agents/skills/` and local `ws-shared/`.

## 5. Test Coverage

- **AC1 & AC2 (CLI Scope Flags):** `test-install.js` executes CLI with `--global` and `--project` flags and verifies target install directory paths.
- **AC3 (Interactive Prompt):** Unit test / CLI mock test for interactive readline scope selection.
- **AC4 (Path Resolution):** Test env var override (`WORKFLOW_SKILLS_GLOBAL_DIR`) vs default home dir resolution.
- **AC5 (Manifest Isolation):** Verify global `ws-shared/installed-skills.json` is created at global path without touching cwd.
- **AC6 (CLI Logs):** Assert output strings contain scope context annotations (`[Global]` / `[Project]`).
- **AC7 (Precedence Override):** Verify local project skill in `.agents/skills/` overrides global skill.
- **AC8 (Automated Tests):** `npm run test` executes full test suite including global and mixed test runs.
- **AC9 (Check Harness):** Run `ws-check-harness` against a workspace with mixed global+local skills and confirm zero false collision errors.

## 6. Invariants (Do Not Violate)
- `commitPlanFilesOnlyAtStep8`: Plan artifacts are committed at Step 8 delivery, not earlier.
- Harness neutrality: Shipped CLI and skills must remain host and IDE neutral.
- Portability: Do not hardcode machine-specific absolute paths.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Domain entities and mappings encapsulated.
- [x] Schema migrations created (N/A for CLI).
- [x] Authorization checks applied.
- [x] i18n keys declared (N/A).
- [x] Test cases cover all ACs (AC1 - AC9).

## 8. Open Questions
None. Scope and criteria are fully specified.
