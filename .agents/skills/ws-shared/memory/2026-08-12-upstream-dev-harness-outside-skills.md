### [2026-08-12] Upstream dogfood harness must live outside `.agents/skills/`
- **Layer**: Infrastructure
- **Module**: AGENTS.md / installer / skill-integrity
- **Severity**: High
- **Scenario / Context**: Wanting a frozen session operating contract so upstream authoring does not Read live `ws-*` SKILL.md files
- **DO NOT**: Put a non-packaged skill folder with `SKILL.md` under `.agents/skills/` (any name). `listInstallableSkills` walks every such dir; `packages.full.select: all-skills` and `bin/skill-integrity.json` would hash and ship it. Verbatim concatenation of live skill bodies also creates a second SoT and trips check-harness duplication.
- **INSTEAD DO**: Keep the frozen contract **inlined** in root `AGENTS.md` § Upstream session contract (not a `SKILL.md` anywhere). Do not put a non-packaged skill folder under `.agents/skills/` (any name). Summarize behavioral rules; invoke live scripts by path; load live `ws-*` SKILL.md only when authoring or testing that skill.
