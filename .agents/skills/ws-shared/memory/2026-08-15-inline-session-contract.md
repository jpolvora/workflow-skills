### [2026-08-15] Upstream dogfood contract is inlined in root AGENTS.md
- **Layer**: Infrastructure
- **Module**: AGENTS.md / session autoload
- **Severity**: High
- **Scenario / Context**: Session operating rules for this upstream repo (surgical scope, delivery gate, fable, reply shape, memory/changelog, write-spec) must not `Read` live `ws-*` SKILL.md and must not exist as a second skill SoT.
- **DO NOT**: Recreate `.agents/dev-harness/SKILL.md` or any extra `SKILL.md` for dogfood (including under `.agents/skills/`). Do not `Read` live `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog` / `ws-write-spec` / `ws-spec-format` for session autoload.
- **INSTEAD DO**: Apply root `AGENTS.md` § Upstream session contract (compact snapshot; refresh that section in the same PR when those packaged skills change). Invoke live scripts by path. Load a live `ws-*` body only when authoring or testing that skill.
