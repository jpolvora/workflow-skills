### [2026-08-27] Dispatch context fail-closed handoff JSON parse and telemetry schema parity

- **Layer**: `harness`
- **Module**: `ws-spec-to-pr / ws-shared`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs;.agents/skills/ws-shared/telemetry.schema.json`
- **Scenario / Context**: `latestHandoff()` in `build_dispatch_context.cjs` caught JSON parse errors on existing handoff files and silently returned empty string. `telemetry.schema.json` was missing `substep`, `bypassed`, and `idempotentReplay` properties emitted by `workflow_state.cjs`.
- **DO NOT**: Silently drop existing handoff context on JSON parse failure during dispatch context generation. Leave emitted telemetry properties off `telemetry.schema.json`.
- **INSTEAD DO**: Throw an explicit error on handoff JSON parse failure so corrupt files fail closed. Declare `substep`, `bypassed`, and `idempotentReplay` in `telemetry.schema.json`.
