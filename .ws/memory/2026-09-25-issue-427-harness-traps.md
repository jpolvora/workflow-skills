### [2026-09-25] Installer suite needs Git Bash first on PATH (WSL bash breaks secrets-hook phase)

- **Layer**: tests
- **Module**: test/test-install.js (secrets pre-commit hook phase)
- **Severity**: High
- **PathPattern**: test/test-install.js
- **Scenario / Context**: `node test/test-install.js --local` spawns `bash` for the secrets-hook phase. On Windows boxes where `C:\Windows\System32\bash.exe` (WSL) shadows Git Bash, the hook resolves neither `node` nor repo tooling (`command -v node` misses `node.exe` under WSL), warns `node not on PATH`, exits 0, and the fail-fast suite exits 1 before later phases run.
- **DO NOT**: Run the installer suite with WSL `bash.exe` first on PATH and treat the hook-phase exit 1 as a product regression.
- **INSTEAD DO**: Prepend `C:\Program Files\Git\bin` to PATH for the suite run so `bash` is Git Bash (resolves `node`/`rg` via `.exe`), then re-run.
