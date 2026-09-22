---
step: 8
slug: us-385
workflowId: us-385
status: completed
shipStatus: pending
---

# Result — us-385

`ws-monitor` no longer reports `critical` missing-artifact false positives on
healthy `ws-spec-to-pr-lite` runs: `expectedArtifacts` branches on
`state.workflowType`, selecting a lite contract (shared-name `step-00` spec,
`step-01` plan, `step-06` review, `step-08` result) for `lite` and the
unchanged standard contract otherwise.

## Files touched

- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (lite branch)
- `.agents/skills/ws-monitor/SKILL.md` (signal-map row)
- `test/test-ws-monitor-us385.js` (new regression fixture)
- `test/test-suites.json` (suite registration)
- `bin/skill-integrity.json` (regenerated)

## Verification

- `node test/test-ws-monitor-us385.js`: pass.
- `npm run tests`: 114/114 passed.
- `node test/test-harness-clean.js`: 0 findings.
- `scan_stack_invariants.cjs --stack typescript-node`: 0 issues.
- `npm run verify-integrity`: OK.

## Timing

- Implement + verify + review + testing: single worker session.
