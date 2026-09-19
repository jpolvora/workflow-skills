### [2026-09-06] Framework trap seeding must write persistent memory files with valid schemas
- **Layer**: harness
- **Module**: ws-configure-project / auto_configure.cjs
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/auto_configure.cjs`
- **Scenario / Context**: Auto-configuring project repositories and seeding framework-specific traps.
- **DO NOT**: Inject free-form text or unformatted headings directly into `MEMORY.md` without corresponding markdown files in `memory/`, which causes `self_learning.cjs --compile` to discard or fail validation on seeded traps.
- **INSTEAD DO**: Format framework traps with valid dated headings (`### [YYYY-MM-DD]`), `Layer`, `Severity`, `DO NOT:`, and `INSTEAD DO:` fields, and write them directly into `.agents/skills/ws-shared/memory/framework-trap-${framework}.md` before synchronizing `MEMORY.md`.
