---
id: null
slug: global-vs-project-skill-installation
title: "Global vs Project Skill Installation Choice"
source: local
specDate: 2026-08-01
---

# Specification — Global vs Project Skill Installation Choice

## Description

Add support to the `workflow-skills` CLI tool (`bin/cli.js`) and installer shims (`install-skills.sh`) to allow users to select between installing, updating, and uninstalling skills globally (user-level scope) or locally (project directory scope). 

Currently, skills are installed strictly in the current working directory (`process.cwd()/.agents/skills`). Giving users the option to install skills globally allows them to share agent skills across multiple projects without duplicating skill files in every workspace repository, while preserving local project overrides when desired.

Global skills must strictly adhere to project-level overrides: when operating inside a project workspace, any local skill or configuration present in `.agents/skills/` and `.agents/skills/ws-shared/` takes precedence over the global counterparts.

## Acceptance Criteria

- AC1: The CLI `install`, `update`, and `uninstall` commands support `--global` (and short flag `-g`) to target the global customizations directory scope instead of the current working directory.
- AC2: The CLI `install`, `update`, and `uninstall` commands support `--project` (and short flag `-p`) to explicitly target the local project directory scope (default when no scope flag is provided).
- AC3: In interactive CLI mode, the prompt asks the user to choose the target scope ("Project directory (.agents/skills)" vs "Global directory (user profile)").
- AC4: The global directory is resolved consistently across operating systems (prioritizing `WORKFLOW_SKILLS_GLOBAL_DIR` when set, or defaulting to user profile global agent skills directory `~/.agents/skills`).
- AC5: Global skill management maintains an isolated `ws-shared/installed-skills.json` manifest in the global target path without interfering with local project manifests or repo files.
- AC6: CLI logs and summary outputs explicitly specify the target scope (Global vs Project) upon installation, update, or uninstallation.
- AC7: Skill resolution respects local workspace overrides: any skill or `ws-shared` configuration defined in the project's `.agents/skills/` takes precedence over globally installed skills and global configuration.
- AC8: Automated integration tests (in `test/`) verify global installation, project installation, update/uninstall commands, and confirm that project-level skill definitions and configurations successfully override global installations.
- AC9: `ws-check-harness` is updated to support auditing global skills and mixed installs (global + local project skills), recognizing local project skills as intentional overrides over global skills without reporting false collision warnings.

## Notes

- Global installation must follow the portable harness neutrality guidelines — consumer global data directories must be isolated and avoid writing unauthorized repository files.
- Updating or uninstalling in global scope must not alter project-level skills or vice versa.
- Precedence chain: explicit user turn > project-level `.agents/skills/` (and `.agents/skills/ws-shared/`) > global skills (`~/.agents/skills`).
