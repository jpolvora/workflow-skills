### [2026-08-25] Root AGENTS.md is not byte-capped
- **Layer**: `Harness`
- **Module**: `AGENTS.md / test-context-budget`
- **Severity**: `Medium`
- **PathPattern**: `AGENTS.md, test/test-context-budget.js, .agents/specs/harness-efficiency-and-verifiability.spec.md`
- **Scenario / Context**: Root `AGENTS.md` is the upstream dogfood hub. The installer never copies it to consumers; they load `ws-shared/AGENTS.md`.
- **DO NOT**: Reintroduce `utf8Size('AGENTS.md') <= 40000` in `test-context-budget.js`, or treat root `AGENTS.md` as a packaged consumer always-applied file.
- **INSTEAD DO**: Keep the 14000 B cap on `.agents/skills/ws-shared/AGENTS.md` and the 24000 B cap on `CATALOG.md`. Grow root `AGENTS.md` when the upstream session contract needs it.
