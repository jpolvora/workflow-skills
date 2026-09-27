---
id: null
slug: installer-multi-host-global-targets
title: "Installer Multi-Host Global Targets and Symlink Strategy"
source: local
specDate: 2026-09-03
---

# Specification — Installer Multi-Host Global Targets and Symlink Strategy

## Description

The workflow-skills CLI installer (`bin/cli.js`, `bin/install-rules.js`) provides a global installation scope option (`--global`), which historically installed skills exclusively into `$HOME/.agents/skills` (or an explicit path overridden by `WORKFLOW_SKILLS_GLOBAL_DIR`). However, modern developers frequently use multiple coding agent environments concurrently on the same machine, with each host expecting global skills in a distinct configuration location:

- **Canonical Agents:** `$HOME/.agents/skills` (Cursor, OpenCode, Codex, generic agents)
- **Claude Code:** `$HOME/.claude/skills`
- **OpenAI Codex / GPT:** `$HOME/.codex/skills`
- **Google Gemini CLI / Antigravity IDE:** `$HOME/.gemini/config/skills`

Currently, developers wishing to use workflow skills across multiple agent platforms must either manually duplicate folders, juggle environment variables, or re-run the installer repeatedly for each tool. Furthermore, when the CLI is executed from within the upstream source repository, the safety check `assertNotSelfOverwrite` inspects `process.cwd()` rather than the actual global destination, erroneously blocking global installations even when the user intends to install into their home directory.

This feature enhances the installer by introducing multi-host target selection into the global installation workflow before package selection. It allows users to select which agent hosts to target (with `$HOME/.agents/skills` selected by default) and offers automated symlinking (or directory junctions on Windows) from the canonical global root to secondary agent directories, keeping all agent environments in sync with zero duplicated disk usage and seamless copy fallback.

### Design Intent

The original installer assumed a single global skills directory. As the ecosystem fragmented across Claude Code, Gemini/Antigravity, and Codex, maintaining separate installations became a frequent point of friction. The design intent is to make `$HOME/.agents/skills` the canonical global source of truth, while seamlessly projecting individual `ws-*` skills into secondary host directories via granular directory symlinks (or directory junctions on Windows). Granular per-skill symlinks ensure that pre-existing custom and third-party skills in those host directories remain completely undisturbed.

## Acceptance Criteria

- AC1: Define a registry of standard global host skill targets in bin/install-rules.js including canonical .agents, Claude Code, OpenAI Codex, and Gemini Antigravity paths.
- AC2: Present a multi-target selection prompt during interactive global installation before the package selection screen with canonical .agents checked by default.
- AC3: Provide an interactive choice for linking secondary targets to the canonical global skills root via directory symlinks or junctions with fallback to direct copy.
- AC4: Implement individual per-skill directory symlinks for secondary targets to prevent overwriting pre-existing third-party skills in those directories.
- AC5: Ensure assertNotSelfOverwrite evaluates the resolved installation target path rather than working directory when global scope is active.
- AC6: Add non-interactive CLI flags --targets and --symlink allowing scriptable specification of secondary global host destinations.
- AC7: Update the update command to synchronize both canonical skills and all linked or copied secondary host targets recorded in the global manifest.
- AC8: Provide automated tests in test/test-install.js verifying multi-target global installation, symlink creation, copy fallback, and non-interactive target flags.

## Notes

### Prior Work Sweep

- In `bin/install-rules.js`, `resolveGlobalSkillsDir` defaults to `~/.agents/skills` unless `WORKFLOW_SKILLS_GLOBAL_DIR` is set.
- In `bin/cli.js`, `runInteractive` presents scope selection (`1) Project directory`, `2) Global directory`) at lines 1614–1623, then immediately transitions to package selection.
- In `bin/cli.js`, `assertNotSelfOverwrite` at line 556 checks `isBlockedInstallTarget(targetDir, packageRoot)`, where `targetDir` defaults to `process.cwd()`, causing failures when run globally from the repository checkout.
- Automated tests in `test/test-install.js` and `test/test-hybrid-consumer-root.js` test `--global` installation and verify that consumer-owned files remain preserved.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Managing non-workflow third-party skills in target directories | The installer manages only `ws-*` skills and `ws-shared` hubs, leaving third-party skills untouched. |
| Hardcoding host-specific adapter files inside skill bodies | Violates harness portability rules; all host dispatch logic remains in the installer CLI layer. |
| Automatic background process sniffing for running IDEs | Interactive user selection is more reliable than transient process inspection. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical global root location | `$HOME/.agents/skills` | Established industry standard supported across all portable agent harnesses | y |
| Windows symlink implementation | Directory junctions (`fs.symlinkSync(target, link, 'junction')`) | Junctions do not require Windows Developer Mode or administrator privileges | y |
| Granular vs whole-directory symlink | Granular per-skill symlinks | Preserves existing third-party skills in `$HOME/.gemini/config/skills` and `$HOME/.claude/skills` | y |
| Failure handling for symlink creation | Informational notice and fallback to direct directory copy | Guarantees installation succeeds even on restricted or cross-filesystem storage | y |
| Implicit-requirement dimensions | N/A because installer operations are local file system tasks without authentication boundaries, server sessions, or remote database lifecycles | Local file linking and directory copying require no network auth, throttles, or server lifecycle controls | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Host target paths defined | Canonical, Claude, Codex, and Gemini global paths codified in `bin/install-rules.js` | Source code inspection and path resolution unit test |
| Granular symlink mechanism verified | Windows junction and POSIX directory symlink behavior tested on temporary fixture paths | Run automated symlink creation test in `test/test-install.js` |
| Safety guard adjustment verified | `assertNotSelfOverwrite` allows global installs regardless of `cwd` location | Run CLI `--global` install from repository root and verify it does not error |
| Authoring validation passes | Spec exits 0 with `validate_spec.cjs --mode=authoring` | Run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Interactive installer displays the multi-target host selection screen with `[x] 1) Canonical Agents (~/.agents/skills)` pre-checked.
- Symlinked target directories contain directory junctions or symlinks pointing directly to the corresponding folders in `~/.agents/skills/ws-*`.
- Executing `npx --yes github:jpolvora/workflow-skills update --global` updates the canonical global tree and refreshes all linked secondary targets.
- Execution of `node test/test-install.js` passes with zero failures.

### Negative & Failing Test Scenarios

- Symlink permission failure test: when symlink creation throws an `EPERM` error, the installer catches the exception, logs a fallback notice, and successfully completes via direct folder copy.
- Pre-existing non-workflow skill protection: when a secondary target directory contains an unrelated skill (e.g. `atividades`), installing workflow skills does not overwrite, delete, or hide the existing skill.
- Self-overwrite protection remains intact for project-local scope: executing project-local install (`--project`) inside the source repository still aborts with `Refusing to install into the workflow-skills source repository`.
