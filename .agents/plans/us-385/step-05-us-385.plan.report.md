---
step: 5
slug: us-385
workflowId: us-385
verificationScore: 10
status: completed
---

# Verify report — us-385

Score: 10/10 (gate: `defaults.minVerifyScore` = 9). Advance approved.

## AC coverage

- AC1/AC3/AC5: lite branch in `expectedArtifacts` selects the lite contract
  from `state.workflowType`; excludes the four standard-only names; expects
  only `step-00` spec, `step-01` plan, `step-06` review, `step-08` result.
- AC2/AC7/AC8: `test/test-ws-monitor-us385.js` drives a lite state
  (`currentStep` 5, steps 0–4 completed) plus telemetry through close and
  asserts zero missing findings via `classifyWorkflow` and CLI `--json`
  snapshot; no banned names in output.
- AC4: absent lite `step-01` plan still yields `critical missing-artifact`.
- AC6: standard + unknown-pipeline inputs keep prior findings
  (`test-ws-monitor.js`, `test-ws-monitor-us356.js`, `test-step-baton-monitor.js` green).
- AC9: signal-map row added to `ws-monitor/SKILL.md`.
- AC10: `npm run tests` 114/114 passed; `test-harness-clean.js` 0 findings;
  `scan_stack_invariants.cjs --stack typescript-node` 0 issues;
  `verify-integrity` OK after regenerate.

## Negative scenarios (spec-linked)

- Lite green run emitting `step-02 plan-interview missing`: fails (now silent).
- Absent lite `step-01` plan emitting nothing: fails (still critical).
- Standard findings changed vs baseline: fails (unchanged, existing tests green).
- `ws-spec-multi` regressed to lite semantics: fails (separate classifier untouched).
