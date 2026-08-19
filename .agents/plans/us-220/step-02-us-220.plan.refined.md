---
slug: us-220
title: "Add ws-pre-daily skill to upstream (missing from repo)"
status: "plan refined"
---

## 0. Summary & Business Rules
Port `ws-pre-daily` from the local environment into the upstream repository `jpolvora/workflow-skills`.
`ws-pre-daily` is a read-only standup briefing skill providing a quick summary of the last 36 hours (configurable via `--hours`) across git commits, active workflow plan states, and changelogs.
Output categories:
- **Delivered**: commits on base branch (`onBase: true`), terminal plan states, or completed changelog records.
- **Made**: commits not yet on base (`onBase: false`) or in-progress updates.
- **Ongoing**: dirty working tree, active branches with unpushed/unmerged commits, or non-terminal plan states.
- **Next**: concrete next actions derived solely from Ongoing items.
- **Gaps**: missing configurations, missing changelogs, or skipped SCM providers.

The skill is strictly read-only and never modifies repository files, commits, pushes, or SCM objects.

## 1. Definition of Ready & Scope
- AC1: `.agents/skills/ws-pre-daily/SKILL.md` present upstream with version `0.3.24`, portable path tokens, and 4 execution steps.
- AC2: `.agents/skills/ws-pre-daily/references/OUTPUT.md` present upstream defining standard output headings and classification rules.
- AC3: `.agents/skills/ws-pre-daily/scripts/collect_window.py` present upstream, pure Python 3 stdlib with UTF-8 stdio safety.
- AC4: Package registration in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/installed-skills.json`.
- AC5: Hub files (`AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`) include `ws-pre-daily`.
- AC6: Automated tests in `test/test-ws-pre-daily.js` validating window calculation, git log parsing, plan state extraction, and JSON schema.
- AC7: Integrity digests regenerated and full test suite passes with 0 critical errors.

## 2. Technical Design & Architecture
- **Files to Create**:
  - `.agents/skills/ws-pre-daily/SKILL.md`: Frontmatter (`name: ws-pre-daily`, `version: 0.3.24`, `disable-model-invocation: true`, `invocation_names: [pre-daily, ws-pre-daily]`). Four steps: (1) Resolve window, (2) Collect evidence, (3) Enrich SCM, (4) Classify & emit.
  - `.agents/skills/ws-pre-daily/references/OUTPUT.md`: Standard standup template and classification matrix.
  - `.agents/skills/ws-pre-daily/scripts/collect_window.py`: Python CLI supporting `--hours`, `--repo`, `--plans-dir`, `--changelog`, `--author`, `--all-authors`.
  - `test/test-ws-pre-daily.js`: Automated tests for `collect_window.py` and package registration.
- **Files to Modify**:
  - `bin/skill-dependencies.json`: Add `"ws-pre-daily"` to `workflows` package and skill dependencies list.
  - `.agents/skills/ws-shared/installed-skills.json`: Add `"ws-pre-daily"` to installed skills array.
  - `AGENTS.md`: Add `ws-pre-daily` to the skill index table.
  - `.agents/skills/ws-shared/AGENTS.md`: Add `ws-pre-daily` to the skill index table.
  - `package.json`: Include `test/test-ws-pre-daily.js` in test scripts.

## 3. Step-by-Step Implementation Tasks
1. **Task 1 (Skill Files)**:
   - Create `.agents/skills/ws-pre-daily/SKILL.md`, `.agents/skills/ws-pre-daily/references/OUTPUT.md`, and `.agents/skills/ws-pre-daily/scripts/collect_window.py`.
2. **Task 2 (Registry & Hubs)**:
   - Update `bin/skill-dependencies.json` and `.agents/skills/ws-shared/installed-skills.json`.
   - Update `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`.
3. **Task 3 (Automated Tests)**:
   - Create `test/test-ws-pre-daily.js`.
   - Update `package.json` test scripts.
4. **Task 4 (Integrity & Harness)**:
   - Run `node bin/generate-skill-integrity.js`.
   - Run `npm run test` and `ws-check-harness`.

## 4. Test Mapping
- AC1 & AC2: Verified by `test-skill-frontmatter.js` and `test/test-ws-pre-daily.js`.
- AC3 & AC6: Verified by running `test/test-ws-pre-daily.js` against git fixtures and temp plans.
- AC4 & AC5: Verified by `test-install.js` and `test/test-ws-pre-daily.js`.
- AC7: `npm run verify-integrity` and `npm run test` exit 0.

## 5. Invariants
- No external runtime dependencies (Python stdlib only, Node.js built-ins).
- Portable path tokens used everywhere.
