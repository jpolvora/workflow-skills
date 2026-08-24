### [2026-08-24] Shared hub AGENTS.md has a 14000 B budget
- **Layer**: `Harness`
- **Module**: `ws-shared/AGENTS.md / test-context-budget`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/AGENTS.md, test/test-context-budget.js`
- **Scenario / Context**: PR 239 CI. Restoring `resolve_consumer_root.py` in the hub scripts table pushed `ws-shared/AGENTS.md` over 14000 UTF-8 bytes. Local `npm test` was not re-run after that docs-only commit; GitHub `test` failed while review was green.
- **DO NOT**: Lengthen hub `AGENTS.md` without checking `test-context-budget.js` (`utf8Size('.agents/skills/ws-shared/AGENTS.md') <= 14000`). Do not skip `node test/test-context-budget.js` after hub prose edits.
- **INSTEAD DO**: Keep required filenames, then shorten adjacent table cells until the file is under 14000 B. Re-run context-budget before push.
