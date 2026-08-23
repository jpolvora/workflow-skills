### [2026-08-23] Always-applied membership tests vs autoload router tables
- **Layer**: Tests
- **Module**: `test-autoload-configure.js` / `autoload.md`
- **Severity**: Medium
- **PathPattern**: `test/test-autoload-configure.js, .agents/skills/ws-shared/autoload.md`
- **Scenario / Context**: Specs skill router and keyword map mention `ws-task-lifecycle`. A test that greps the whole `autoload.md` for that id fails even when the Always-applied table correctly omits the skill (`defaults.autoloadTaskLifecycle` false).
- **DO NOT**: Assert Always-applied omission by matching a skill id against the entire `autoload.md`.
- **INSTEAD DO**: Parse the first `| Skill | Path | Trigger |` table (row regex `\|[^\r\n]*\|`, no DOTALL) and assert membership against that table only.
