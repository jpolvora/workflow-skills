### [2026-09-08] Ship audit leak-scan observability
- **Layer**: `Tooling`
- **Module**: `ws-ship-pr / ws-secrets-leak-review`
- **Severity**: `High`
- **PathPattern**: `bin/**;.agents/skills/ws-ship-pr/**;test/**`
- **Scenario / Context**: An ignore-aware search invocation failed on a Windows path form during a pre-ship leak audit. Known secret-pattern checks and sensitive-file globs returned no high-confidence findings, but the optional connection-string and internal-host pass was not fully observed.
- **DO NOT**: Claim a complete leak audit from partial pattern coverage when a scanner invocation failed.
- **INSTEAD DO**: Record the failed pattern pass as `UNVERIFIABLE`, retry with a supported ignore-aware path form or inspect the changed-file scope manually, and retain the ship-gate caveat until evidence is complete.
