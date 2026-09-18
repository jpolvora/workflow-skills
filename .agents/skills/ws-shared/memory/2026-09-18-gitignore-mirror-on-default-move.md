### [2026-09-18] Moving generated-file defaults must move ignore coverage too
- **Layer**: `application`
- **Module**: `ws-cleanup`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-cleanup/references/PATTERNS.md, .agents/skills/ws-cleanup/scripts/list_disposable.cjs`
- **Scenario / Context**: A default output location moved (example: generated MEMORY.md + memory/ from the managed hub dir to the repo root). The old location was covered by the managed hub .gitignore, which cannot reach the new parent dir, and the installer never writes repo-root files — so fresh consumers showed generated files as untracked with no suggestion mechanism listing them.
- **DO NOT**: Move a generated-file default without updating ignore coverage, and do not fix only the advisory doc while the hardcoded suggestion mirror in the cleanup script still omits the new paths.
- **INSTEAD DO**: Ship the new ignore patterns in both mirrors together (advisory PATTERNS.md fence + list_disposable.cjs suggestPatterns) and lock them with a test assertion on the emitted suggestions.
