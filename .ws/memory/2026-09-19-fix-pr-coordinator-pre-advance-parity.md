### [2026-09-19] Orchestrator-loop replacements must run the canonical pre-advance oracle

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator success path
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** The coordinator replaced the single-host orchestrator loop but its `verifyAdvancement` re-implemented only the finished step's own contract (handoff status, step advance, finish-artifact presence), never calling `validateSnapshot({ preAdvance: N+1 })` — so the ledger score/alias/commit/fable gates, plan.index, ac-ledger presence, and artifact identity were silently dropped in baton runs. A below-bar pre-step6 result could enter review because step-6 dispatch only re-validates the step5-boundary score. Fixtures masked it by seeding no ledger or index while asserting completion.
- **DO NOT:** Replace an orchestrator loop with a local advancement check that re-implements a subset of the canonical gate; assert close-step completion in coordinator tests without seeding the canonical pre-advance inputs.
- **INSTEAD DO:** Call the shared `validateSnapshot` oracle with `preAdvance: currentStep+1` in the success path (import `plansIndexPath` for the index arg) and fail closed HS-5 (blocked, exit 2) on throw — a gate-weak finish reproduces under retry, so never retry it; seed `ac-ledger.json` + `plan.index.json` in baton e2e fixtures and keep the missing-ledger negative case in `test/test-step-coordinator.js` green.
