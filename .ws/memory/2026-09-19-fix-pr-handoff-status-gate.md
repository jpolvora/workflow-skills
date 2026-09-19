### [2026-09-19] Advancement gates must check handoff status, not handoff presence

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** `verifyAdvancement` treated a recorded handoff plus step advance as success, but `finish --status failed` still writes the handoff and still advances `currentStep`, so a worker reporting failure through finish was accepted as advanced, the baton released, and the run proceeded over a failed step — bypassing the retry/block policy that only non-zero exits triggered.
- **DO NOT:** Treat handoff presence (or `currentStep` advance alone) as step success in any advancement gate; assume non-zero exit is the only failure signal.
- **INSTEAD DO:** Require `handoff.status === 'completed'` (explicitly accepting reason-gated `'skipped'`, which throws before writing any handoff when the reason is invalid) and keep the failed-finish e2e case in `test/test-step-coordinator.js` green (exit 2, blocked, no `baton_released`).
