# Execution Plan & Task DAG — Global vs Project Skill Installation Choice

**Source Plan:** `.agents/plans/global-vs-project-skill-installation/step-01-global-vs-project-skill-installation.plan.md`  
**Execution Mode:** `parallel` (3 execution levels, 4 tasks)

## Execution Levels

### Level 1
- **T1: Install Rules Global Directory Resolution**
  - **Files:** `bin/install-rules.js`
  - **Acceptance:** AC4 — Export `resolveGlobalSkillsDir()` and `resolveTargetSkillsDir(opts)` handling `WORKFLOW_SKILLS_GLOBAL_DIR`, `GEMINI_CONFIG_DIR`, and `~/.gemini/config/skills` / `~/.agents/skills` fallbacks.
  - **Dependencies:** None

### Level 2
- **T2: CLI Scope Flags, Interactive Prompt & Manifest Management**
  - **Files:** `bin/cli.js`, `install-skills.sh`
  - **Acceptance:** AC1, AC2, AC3, AC5, AC6 — Parse `--global`/`-g` and `--project`/`-p` flags; prompt user interactively when unflagged; target global vs project `ws-shared/installed-skills.json`; log target scope.
  - **Dependencies:** T1

- **T3: Harness Auditor Global & Mixed Mode Support Verification**
  - **Files:** `.agents/skills/ws-check-harness/SKILL.md`, `.agents/skills/ws-check-harness/PHASES.md`
  - **Acceptance:** AC9 — Audit `{globalSkillsRoot}` token map and project override precedence over global skills.
  - **Dependencies:** T1

### Level 3
- **T4: Integration Test Suite for Global vs Project Skill Installation**
  - **Files:** `test/test-install.js`
  - **Acceptance:** AC8 — Automated integration tests covering `--global` and `--project` install/update/uninstall and local override precedence.
  - **Dependencies:** T2, T3
