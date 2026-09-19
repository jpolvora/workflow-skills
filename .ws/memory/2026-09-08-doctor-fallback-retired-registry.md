### [2026-09-08] Doctor fallback retired registry parity
- **Layer**: `Tooling`
- **Module**: `ws-doctor` standalone and hybrid retired-artifact diagnostics
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-doctor/scripts/doctor.js;test/test-ws-doctor.js`
- **Scenario / Context**: When the optional shared runtime is absent, `ws-doctor` uses a local retired-artifact fallback. A partial fallback registry can miss renamed legacy skill folders even though the canonical runtime registry detects them.
- **DO NOT**: Maintain the standalone fallback retired-skill list as a subset of the canonical registry or test only the runtime-backed path.
- **INSTEAD DO**: Mirror every canonical retired skill ID in the fallback and exercise all renamed IDs through a fixture that omits the shared runtime helper.
