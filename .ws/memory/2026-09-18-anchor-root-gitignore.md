### [2026-09-18] Anchor root gitignore suggestions to the repo root
- **Layer**: `application`
- **Module**: `ws-cleanup`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-cleanup/references/PATTERNS.md, .agents/skills/ws-cleanup/scripts/list_disposable.cjs`
- **Scenario / Context**: Root-targeted gitignore suggestions were emitted unanchored (`MEMORY.md`, `memory/`), so accepting them ignored same-named paths at every depth (example: `src/memory/`) and legitimate source silently never got committed.
- **DO NOT**: Suggest bare filenames or dir names for root-targeted ignores, and do not add suggestion patterns without asserting their exact anchored form in tests.
- **INSTEAD DO**: Anchor root suggestions with a leading slash (`/MEMORY.md`, `/memory/`) in both the advisory doc fence and the executable suggestion mirror, and assert the anchored strings in the cleanup test.
