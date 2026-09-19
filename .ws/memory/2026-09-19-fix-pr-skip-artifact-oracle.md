### [2026-09-19] Skip artifact waivers must reuse the canonical pre-advance oracle, not a reason list

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** `verifyAdvancement` accepted `skipped` handoffs (round-2 status gate) but then unconditionally demanded `finishArtifactNames`, while the canonical pre-advance validator waives artifacts for reason-gated skips — so mapped-and-skipped steps (standard plan.exec, testing.report, interview artifacts) returned `missing-artifact`, retried, and blocked. A hand-kept reason list would drift again (it missed `interview-not-required` on first drafting).
- **DO NOT:** Gate skipped steps on artifacts with a separate reason list, or demand artifacts after accepting a skip without consulting the canonical validator.
- **INSTEAD DO:** Waive the artifact demand exactly when `requiredAdvanceArtifacts(pipeline, step+1, afterState)` is empty for a `skipped` handoff, so coordinator and canonical validator share one oracle; keep the waive + negative-control unit cases in `test/test-step-coordinator.js` green.
