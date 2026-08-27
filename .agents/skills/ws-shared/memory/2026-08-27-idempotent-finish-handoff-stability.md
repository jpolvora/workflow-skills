### [2026-08-27] Idempotent finish handoff stability and duplicate telemetry prevention

- **Layer**: `harness`
- **Module**: `ws-shared / workflow_state`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs;test/test-workflow-state-contract.js`
- **Scenario / Context**: Idempotent finish restored `.state.json` but ran `writeHandoffFile` and telemetry append unconditionally. On replay, `writeHandoffFile` could overwrite rich subagent summary with a thin fallback and duplicate finish events in `.jsonl`.
- **DO NOT**: Unconditionally overwrite `handoff/step-{NN}.json` or append duplicate finish telemetry during an idempotent finish replay.
- **INSTEAD DO**: Guard `writeHandoffFile` and `appendJsonl` with `!isIdempotentFinish` so prior handoff JSON and telemetry are preserved intact.
