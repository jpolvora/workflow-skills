---
id: 220
slug: us-220
title: "Add ws-pre-daily skill to upstream (missing from repo)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/220"
specDate: 2026-08-19
---

# Specification — Add ws-pre-daily skill to upstream (missing from repo)

## Description

Port and integrate the missing `ws-pre-daily` skill from the local environment into the canonical upstream repository `jpolvora/workflow-skills`.
`ws-pre-daily` is a read-only standup briefing skill designed to quickly analyze and summarize the last 36 hours (configurable) across git commits, active workflow plan states, and changelogs, categorizing activities into Delivered, Made, Ongoing, Next, and Gaps.

### Scope & Technical Architecture
1. **Skill Definition & Package Layout:**
   - Create `.agents/skills/ws-pre-daily/SKILL.md` specifying skill metadata, invocation syntax (`/pre-daily`, `--hours`, `--all-authors`, `--tz`), parameter rules, and 4-step execution flow.
   - Set skill version to match current upstream release version (`0.3.24`).
   - Create `.agents/skills/ws-pre-daily/references/OUTPUT.md` defining output sections and classification criteria.
   - Create `.agents/skills/ws-pre-daily/scripts/collect_window.py` (pure Python 3 stdlib with UTF-8 stdio safety) to gather git history, plan states (`*.state.md`), and changelog entries within the rolling window.
2. **Registry & Hub Integration:**
   - Register `ws-pre-daily` in `bin/skill-dependencies.json` under `workflows` and `full` packages.
   - Register `ws-pre-daily` in `.agents/skills/ws-shared/installed-skills.json` and hub templates.
   - Update `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md` skill catalogs and routing tables.
3. **Automated Verification:**
   - Add automated test coverage in `test/test-ws-pre-daily.js` validating evidence collection, argument parsing, output classification, and error handling for missing paths.
   - Run integrity digest generation (`npm run generate-integrity`) and verify with `npm run test` and `ws-check-harness`.

## Acceptance Criteria

- AC1: `.agents/skills/ws-pre-daily/SKILL.md` is present upstream with valid YAML frontmatter (`name: ws-pre-daily`, `version: 0.3.24`, `disable-model-invocation: true`, `invocation_names: [pre-daily, ws-pre-daily]`), portable path tokens (`{skillsRoot}`, `{sharedDir}`, `{plansDir}`), and 4 clear execution steps.
- AC2: `.agents/skills/ws-pre-daily/references/OUTPUT.md` is present upstream defining standard output headings (`## Window`, `## Delivered`, `## Made`, `## Ongoing`, `## Next`, `## Gaps`) and deterministic classification rules.
- AC3: `.agents/skills/ws-pre-daily/scripts/collect_window.py` is present upstream, executable via standard Python 3 (stdlib only, UTF-8 stdio safety), and supports `--hours`, `--repo`, `--plans-dir`, `--changelog`, `--author`, and `--all-authors` returning valid JSON.
- AC4: `bin/skill-dependencies.json` and `.agents/skills/ws-shared/installed-skills.json` include `ws-pre-daily` in packages (`workflows`, `full`).
- AC5: Hub files (`AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, and any relevant catalog indexes) list `ws-pre-daily` in the skill routing table.
- AC6: Automated tests in `test/test-ws-pre-daily.js` verify `collect_window.py` execution against git fixtures, confirming accurate time filtering, commit attribution, dirty status detection, plan state extraction, and JSON schema output.
- AC7: Harness validation passes (`npm run verify-integrity` and `npm run test`) with zero critical harness or integrity errors.

## Original Issue Context

```markdown
## Summary

`ws-pre-daily` exists in the local install (`C:\Users\jpolv\.agents\skills\ws-pre-daily`) but is **missing from the upstream repo** `jpolvora/workflow-skills`. It should be created/added upstream so it ships with the rest of the `ws-*` workflow skills.

## Current state

- **Local version:** `0.3.22`
- **Sibling skills upstream version:** `0.3.23` (e.g. `ws-activity-report`)
- **Upstream presence:** `ws-pre-daily` is absent from `.agents/skills/` and from `ws-shared/installed-skills.json`.

## Files to port

The local skill has three files:

```
ws-pre-daily/
├── SKILL.md
├── references/
│   └── OUTPUT.md
└── scripts/
    └── collect_window.py
```

- `SKILL.md` — read-only standup for a rolling 36h window; prints Delivered / Made / Ongoing / Next. Invocations: `/pre-daily`, `--hours`, `--all-authors`, `--tz`.
- `references/OUTPUT.md` — stable output headings + classification table.
- `scripts/collect_window.py` — git / plan / changelog evidence collector (Python, stdlib only).

## Notes / follow-ups

- Bump version to `0.3.23` to match the rest of the suite (or align with current upstream version).
- Register the skill in `ws-shared/installed-skills.json` (and any manifest/index that enumerates shipped skills).
- The skill references `../ws-activity-report/SKILL.md` and `ws-shared/config.json` path tokens, consistent with siblings — no new dependencies.
```

## Notes

- Upstream version is currently 0.3.24; ensure SKILL.md and package manifests reflect 0.3.24.
- `collect_window.py` uses stdlib only (`subprocess`, `argparse`, `json`, `datetime`, `pathlib`, `re`).
- Zero external dependencies introduced.
