# Implementation Plan — Installer Multi-Host Global Targets and Symlink Strategy

## Executive Summary
This feature enhances the `workflow-skills` CLI installer (`bin/install-rules.js`, `bin/cli.js`) to support multiple global host destinations (Canonical `.agents`, Claude Code, OpenAI Codex, and Gemini / Antigravity), allowing cross-agent projection via granular directory symlinks (Windows junctions / POSIX directory symlinks) with graceful fallback to copying. It also fixes `assertNotSelfOverwrite` to evaluate resolved global target destinations, adds CLI flags `--targets` and `--symlink`, updates the `update` command to synchronize secondary targets, and adds comprehensive automated tests in `test/test-install.js`.

## Acceptance Criteria Mapping
- **AC1:** Define registry of standard global host skill targets (`GLOBAL_HOST_TARGETS`, `getGlobalHostTargets`, `resolveHostTargetPath`) in `bin/install-rules.js`.
- **AC2:** Interactive multi-target selection prompt during global installation in `bin/cli.js`.
- **AC3:** Interactive prompt for linking secondary targets via symlinks/junctions vs direct copy.
- **AC4:** Granular per-skill directory symlink/junction implementation with cross-platform fallback.
- **AC5:** Update `assertNotSelfOverwrite` to inspect resolved destination path when global scope is active.
- **AC6:** Add non-interactive `--targets` and `--symlink`/`--no-symlink` flags to installer and update CLI args.
- **AC7:** Update `update` command to read `globalTargets` from `installed-skills.json` and sync all secondary targets.
- **AC8:** Automated tests in `test/test-install.js` verifying multi-target installation, symlink creation, copy fallback, and CLI flags.

## Proposed Code Changes

### 1. `bin/install-rules.js`
- Define `GLOBAL_HOST_TARGETS`:
  - `canonical`: `~/.agents/skills` (Default: true)
  - `claude`: `~/.claude/skills`
  - `codex`: `~/.codex/skills`
  - `gemini`: `~/.gemini/config/skills`
- Add export `getGlobalHostTargets(homeDir)` returning target objects with absolute paths.
- Add export `resolveHostTargetPath(idOrPath, homeDir)` resolving named ID or custom path.
- Add export `createSkillSymlinkOrCopy(srcPath, destPath, options)` with Windows junction support and `EPERM`/`EXDEV` copy fallback.

### 2. `bin/cli.js`
- Fix `assertNotSelfOverwrite`: evaluate `isGlobal ? resolveGlobalSkillsDir() : path.resolve(targetDir)`.
- Support `--targets <csv>` and `--symlink`/`--no-symlink` in `parseInstallArgs`.
- In `runInteractive`: when global scope is active, prompt for multi-host target selection before package selection screen, followed by symlink vs copy strategy.
- In `runInstall` and `runUpdate`: project installed skills into selected secondary targets and record `globalTargets` in `installed-skills.json`.
- In `runUpdate`: iterate over recorded `globalTargets` and sync all secondary host targets.

### 3. `test/test-install.js`
- Add Phase 12 tests:
  - Multi-target installation creates canonical skills and secondary symlinks/junctions.
  - Per-skill granular linking preserves pre-existing third-party skills in secondary directories.
  - Fallback from symlink failure to folder copy on simulated exception.
  - Non-interactive `--targets canonical,claude --no-symlink` flags.
  - Global install from repository root succeeds without self-overwrite block.

## Negative & Edge Case Scenarios
- **NS1 (Symlink permission failure):** Catches symlink exception and falls back cleanly to directory copy.
- **NS2 (Pre-existing non-workflow skill protection):** Non-`ws-*` directories in target folders are preserved untouched.
- **NS3 (Self-overwrite protection for project-local):** Project-local install from repository root continues to be blocked.

## Verification Tasks
- [ ] Task 1: Codify host target registry and link helper in `bin/install-rules.js`.
- [ ] Task 2: Fix `assertNotSelfOverwrite` and parse `--targets` / `--symlink` flags in `bin/cli.js`.
- [ ] Task 3: Implement multi-target interactive selection and secondary projection in `bin/cli.js`.
- [ ] Task 4: Support secondary target updates in `runUpdate` in `bin/cli.js`.
- [ ] Task 5: Add automated tests in `test/test-install.js`.
- [ ] Task 6: Run verification suite (`npm test`, `verify-integrity`).
