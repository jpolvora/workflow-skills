### [2026-08-27] Idempotent finish output fingerprinting and body preservation

- **Layer**: `harness`
- **Module**: `ws-shared / workflow_state`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Scenario / Context**: `finishFingerprint` previously omitted `summary` and `findings` from the step output, causing non-identical replays with different subagent outputs to be falsely treated as idempotent, while mutating the markdown compact body before JSON restoration.
- **DO NOT**: Check finish idempotency without comparing `summary` and `findingsHistogram(findings)` against `readPriorHandoffOutput(paths.usDir, step)`, or unconditionally mutate `.state.md` body prior to idempotent restore.
- **INSTEAD DO**: Include `outputSummary` and `outputFindings` in `finishFingerprint(state, output)` and only call `compactOutputs(body, step, finishOutput)` on non-idempotent finishes.
