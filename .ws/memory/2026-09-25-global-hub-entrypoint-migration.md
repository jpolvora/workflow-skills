### [2026-09-25] Global hub-root AGENTS.md authored files are legacy-migrated, not preserved

- **Layer**: infrastructure
- **Module**: installer (bin/cli.js), ws-shared hub layout
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: In global scope `consumerHubDir() === managedHubDir()`, so `migrateLegacyFlatHub` processes `ws-shared/AGENTS.md`: generated entrypoints (markers) are preserved for refresh, but marker-less authored files are treated as the retired flat hub document and removed once `runtime/AGENTS.md` exists. Only project-scope `.ws/AGENTS.md` follows the preserve-authored contract.
- **DO NOT**: Assert a global update preserves a consumer-authored `ws-shared/AGENTS.md`, or promise that contract in comments.
- **INSTEAD DO**: Expect marker-less global entrypoints to be legacy-migrated away (`Removed obsolete flat`); assert refresh only for generated entrypoints and idempotency of the canonical pointer.
