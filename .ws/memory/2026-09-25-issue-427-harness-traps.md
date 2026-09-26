### [2026-09-25] Installer suite needs Git Bash first on PATH (WSL bash breaks secrets-hook phase)

- **Layer**: tests
- **Module**: test/test-install.js (secrets pre-commit hook phase)
- **Severity**: High
- **PathPattern**: test/test-install.js
- **Scenario / Context**: `node test/test-install.js --local` spawns `bash` for the secrets-hook phase. On Windows boxes where `C:\Windows\System32\bash.exe` (WSL) shadows Git Bash, the hook resolves neither `node` nor repo tooling (`command -v node` misses `node.exe` under WSL), warns `node not on PATH`, exits 0, and the fail-fast suite exits 1 before later phases run.
- **DO NOT**: Run the installer suite with WSL `bash.exe` first on PATH and treat the hook-phase exit 1 as a product regression.
- **INSTEAD DO**: Prepend `C:\Program Files\Git\bin` to PATH for the suite run so `bash` is Git Bash (resolves `node`/`rg` via `.exe`), then re-run.

### [2026-09-25] Global hub-root AGENTS.md authored files are legacy-migrated, not preserved

- **Layer**: infrastructure
- **Module**: installer (bin/cli.js), ws-shared hub layout
- **Severity**: Medium
- **PathPattern**: bin/cli.js
- **Scenario / Context**: In global scope `consumerHubDir() === managedHubDir()`, so `migrateLegacyFlatHub` processes `ws-shared/AGENTS.md`: generated entrypoints (markers) are preserved for refresh, but marker-less authored files are treated as the retired flat hub document and removed once `runtime/AGENTS.md` exists. Only project-scope `.ws/AGENTS.md` follows the preserve-authored contract.
- **DO NOT**: Assert a global update preserves a consumer-authored `ws-shared/AGENTS.md`, or promise that contract in comments.
- **INSTEAD DO**: Expect marker-less global entrypoints to be legacy-migrated away (`Removed obsolete flat`); assert refresh only for generated entrypoints and idempotency of the canonical pointer.
