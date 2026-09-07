---
Layer: Harness
Module: packaging / autoload / check-harness
Severity: High
PathPattern: bin/skill-dependencies.json;.agents/skills/ws-shared/autoload.md;.agents/skills/ws-check-harness/PHASES.md
---

### [2026-09-07] Do not vendor spec-memo runtime skills into this package

- **Scenario / Context**: Consumer ws-check-harness reported phantom routes for ws-memo / ws-session-tracking after a workflows install. Those ids are owned by spec-memo, not this SoT.
- **DO NOT**: Add them to packages.workflows or Extra, add Layer rows with `.agents/skills/ws-memo/SKILL.md` literals, or list them in Always-applied as mandatory.
- **INSTEAD DO**: Keep `externalSkills` + skip-when-absent companion section; treat missing local bodies as harness intentional omission; load from `{globalSkillsRoot}` when present. Every Always-applied writer (`ensure_autoload_md`, `write_root_agents`) must drop those ids; `--check` must not emit Install/missing-skill guidance after the companion warning.
