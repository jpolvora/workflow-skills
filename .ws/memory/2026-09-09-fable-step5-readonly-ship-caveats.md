### [2026-09-09] Mechanical harness 5a is not a full Phases 0-5c walk

- **Layer**: Infrastructure
- **Module**: ws-ship-pr / specialized-subagents
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs;test/test-specialized-subagents-compiler.js
- **Scenario / Context**: Pre-ship audit of the host-readonly compiler fix.
- **DO NOT**: Treat mechanical Phase 5a script exits as a full ws-check-harness Phases 0-5c walk.
- **INSTEAD DO**: Credit Phase 5a + check_workflows (via npm test) with an explicit caveat; keep auditVerdictsBlockShip as refuted so caveats do not block push.
