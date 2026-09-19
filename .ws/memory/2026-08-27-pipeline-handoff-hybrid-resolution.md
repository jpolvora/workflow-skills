### [2026-08-27] Pipeline handoff hybrid resolution and defaults interview documentation

- **Layer**: `harness`
- **Module**: `ws-check-harness / ws-configure-project`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs;.agents/skills/ws-configure-project/INTERVIEW.md`
- **Scenario / Context**: New Phase 5a check resolved pipeline `SKILL.md` paths strictly via `path.join(repoRoot, '.agents', 'skills', id, 'SKILL.md')`, failing hybrid consumers with global skills. New config keys (`providerCompat`, `contextHygiene`, `reviewJury`) were listed in `INTERVIEW.md` defaults bullets without explicit interview gate subsections.
- **DO NOT**: Hardcode local `.agents/skills` paths in harness validation scripts when `resolveSkillMdPath` exists for hybrid/global resolution. Add new config keys to schema/example without matching interview gate tables in `ws-configure-project/INTERVIEW.md`.
- **INSTEAD DO**: Use `resolveSkillMdPath(context, skillId)` in harness checks so hybrid consumers pass. Add dedicated gate tables, option tables, and write semantics for every new config key under `ws-configure-project/INTERVIEW.md`.
