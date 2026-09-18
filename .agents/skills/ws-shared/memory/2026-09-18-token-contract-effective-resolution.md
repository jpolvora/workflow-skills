### [2026-09-18] Token contracts must state effective resolution when a fallback exists
- **Layer**: `application`
- **Module**: `ws-shared/runtime/tools.md`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/runtime/tools.md, .agents/skills/ws-check-harness/SKILL.md`
- **Scenario / Context**: A path token (example: `{memoryDir}`) gains a legacy fallback (effective dir), but the token table still documents mechanical expansion to the configured path. Agents following the table miss legacy entries on read and corrupt the effective source on write. A related gap: token references added to skill prose without extending every token map (doc map + executable checker mirror), so audits silently skip them.
- **DO NOT**: Document a token with fallback as mechanical configured-path expansion, and do not add token references without extending all maps.
- **INSTEAD DO**: State the effective-resolution precedence in the token contract (configured wins with entries, else legacy with entries, else configured), and extend the doc map and the executable checker TOKENS mirror together.
