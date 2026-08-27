### [2026-08-27] Fable ship audit — research-driven pipeline quality

- **Layer:** harness
- **Module:** ws-ship-pr / research-driven-pipeline-quality
- **Severity:** High
- **PathPattern:** .agents/skills/ws-shared/scripts/workflow_state.cjs;bin/install-rules.js;test/**
- **Scenario / Context:** Pre-ship fable-judge on uncommitted W1–W7 implementation. Fresh `npm run test` exit 0; `verify-integrity` OK; secrets scan clean; workflows PASS. Full interactive `ws-check-harness` Phases 0–5c were not agent-walked (mechanical Phase 5a + workflows only).
- **DO NOT:** Credit a full harness audit from mechanical script exits alone when CATALOG Before-ship row 8 requires Phases 0–5c, or ship while claiming orch Step 6 review already ran.
- **INSTEAD DO:** Treat mechanical Phase 5a + `check_workflows` + green `npm run test` as evidence with an explicit caveat on the prepare board; run or credit a `develop`…`main` local review before merge; keep `auditVerdictsBlockShip: refuted` so caveats do not block push.
