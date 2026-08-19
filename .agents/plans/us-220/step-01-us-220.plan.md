---
slug: us-220
title: "Add ws-pre-daily skill to upstream (missing from repo)"
status: "plan to be refined"
---

## 0. Summary & Business Rules
The goal of this feature is to port the `ws-pre-daily` skill into the canonical upstream repository `jpolvora/workflow-skills`.
`ws-pre-daily` is a read-only standup briefing skill that summarizes activities over a rolling 36-hour window (configurable via `--hours`). It collects git commits, workflow plan states (`*.state.md`), and changelog entries, categorizing them into:
- **Delivered**: commits merged to base (`onBase: true`), terminal plan states, or completed changelog records.
- **Made**: commits not yet on base (`onBase: false`) or in-progress updates.
- **Ongoing**: dirty working tree, active branches with unpushed/unmerged commits, or non-terminal plan states.
- **Next**: concrete next actions derived solely from Ongoing items.
- **Gaps**: missing configurations, missing changelogs, or skipped SCM providers.

The skill is read-only: it never mutates git state, commits, pushes, or makes remote changes.

## 1. Definition of Ready & Scope
### Scope
- Port `.agents/skills/ws-pre-daily/SKILL.md` aligned to version `0.3.24`.
- Port `.agents/skills/ws-pre-daily/references/OUTPUT.md`.
- Port `.agents/skills/ws-pre-daily/scripts/collect_window.py` with pure Python 3 stdlib and UTF-8 safe stdio.
- Register `ws-pre-daily` in `bin/skill-dependencies.json` under `workflows` and `full` packages.
- Register `ws-pre-daily` in `.agents/skills/ws-shared/installed-skills.json`.
- Add routing/table entries in `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`.
- Add comprehensive automated tests in `test/test-ws-pre-daily.js` covering collector execution, time windows, git data, plan parsing, and JSON output schemas.
- Regenerate integrity (`npm run generate-integrity`) and ensure `npm run test` and `ws-check-harness` pass with 0 critical errors.

### Out of Scope
- Modifying `ws-activity-report` clock logic (timesheet vs standup boundary is maintained).
- Adding external npm or pip dependencies.

## 2. Technical Design & Architecture
### Component Architecture
1. **Skill Definition (`.agents/skills/ws-pre-daily/`)**:
   - `SKILL.md`: Frontmatter (`name: ws-pre-daily`, `version: 0.3.24`, `disable-model-invocation: true`, `invocation_names: [pre-daily, ws-pre-daily]`). 4 execution steps: (1) Resolve window, (2) Collect evidence, (3) Enrich SCM, (4) Classify & emit.
   - `references/OUTPUT.md`: Canonical output shape (`## Window`, `## Delivered`, `## Made`, `## Ongoing`, `## Next`, `## Gaps`) and classification matrix.
   - `scripts/collect_window.py`: Python CLI supporting `--hours`, `--repo`, `--plans-dir`, `--changelog`, `--author`, `--all-authors`. Collects git log, status, plans from `*.state.md`, and changelog entries.
2. **Package & Registry Integration**:
   - `bin/skill-dependencies.json`: Add `"ws-pre-daily"` to `packages.workflows.skills` and dependencies if needed.
   - `.agents/skills/ws-shared/installed-skills.json`: Add `"ws-pre-daily"` to the installed list.
   - `AGENTS.md` & `.agents/skills/ws-shared/AGENTS.md`: Add row for `ws-pre-daily`.
3. **Automated Testing (`test/test-ws-pre-daily.js`)**:
   - Spawns Python `collect_window.py` on a git fixture repo.
   - Asserts window filtering, git commits parsing, onBase attribution, dirty file detection, plan state extraction, and changelog parsing.
   - Checks CLI error handling when `--repo` is not a git repository or paths are missing.

## 3. Step-by-Step Plan
1. **Skill Files Setup**:
   - Create `.agents/skills/ws-pre-daily/SKILL.md` (version 0.3.24, proper path tokens).
   - Create `.agents/skills/ws-pre-daily/references/OUTPUT.md`.
   - Create `.agents/skills/ws-pre-daily/scripts/collect_window.py` ensuring UTF-8 stdio compatibility across Windows/Linux.
2. **Registry & Routing Updates**:
   - Update `bin/skill-dependencies.json` and `.agents/skills/ws-shared/installed-skills.json`.
   - Update `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md` skill catalogs.
3. **Automated Test Suite**:
   - Implement `test/test-ws-pre-daily.js`.
   - Integrate `test/test-ws-pre-daily.js` into `package.json` test scripts if appropriate.
4. **Integrity & Validation**:
   - Run `node bin/generate-skill-integrity.js` to update digests in `bin/skill-integrity.json`.
   - Run `npm run test` and verify harness integrity.

## 4. Permissions, Tenancy & i18n
- No database permissions or tenant isolation needed (pure CLI skill).
- Output text uses standard English headings with localization tolerance for user prose.

## 5. Test Coverage
- **AC1 & AC2**: `test-skill-frontmatter.js` & `test-ws-pre-daily.js` verify frontmatter fields and `OUTPUT.md` presence.
- **AC3**: `test-ws-pre-daily.js` executes `collect_window.py` with various flags (`--hours`, `--repo`, `--plans-dir`, `--changelog`, `--all-authors`), validating JSON structure and values.
- **AC4 & AC5**: `test-install.js` and `test-ws-pre-daily.js` verify package registration in `bin/skill-dependencies.json` and presence in hubs.
- **AC6**: `test-ws-pre-daily.js` tests real git repository fixture interactions and plan extraction.
- **AC7**: `npm run test` and `npm run verify-integrity` pass cleanly.

## 6. Invariants (Do Not Violate)
- No host product names in skill files.
- Shipped skills must be portable across project-local and global scopes.
- Python scripts must use stdlib only and handle UTF-8 stdio cleanly.
- `collect_window.py` is strictly read-only and must never mutate repository state.

## 7. Pre-PR Checklist
- [ ] Layer boundaries respected.
- [ ] Portable path tokens `{skillsRoot}`, `{sharedDir}`, `{plansDir}` used throughout.
- [ ] Version stamped as 0.3.24.
- [ ] Test cases cover all ACs.
- [ ] `npm run generate-integrity` and `npm run test` pass.

## 8. Open Questions
None. Scope and implementation requirements are well defined.
