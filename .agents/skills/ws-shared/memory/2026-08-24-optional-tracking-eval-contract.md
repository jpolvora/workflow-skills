### [2026-08-24] Optional tracking files need conditional eval contracts
- **Layer**: `Harness`
- **Module**: `ws-task-lifecycle / evals / test-ws-task-lifecycle`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-task-lifecycle/evals/evals.json, .agents/skills/ws-task-lifecycle/SKILL.md, test/test-ws-task-lifecycle.js`
- **Scenario / Context**: PR 239 review. SKILL.md made FEATURES.md optional via `tracking.featuresMdEnabled`, but eval id 1 and the test still locked in "FEATURES.md before PLAN.md" unconditionally. Agents that correctly skip FEATURES.md fail eval.
- **DO NOT**: Add an opt-out branch to a SKILL without updating the machine-checked eval contract and its test assertions. Default-path-only eval is insufficient once the SKILL adds an explicit opt-out.
- **INSTEAD DO**: Gate the FEATURES.md assertion on `tracking.featuresMdEnabled is not false`, add an eval case for the `false` branch, and assert both branches in the test.
