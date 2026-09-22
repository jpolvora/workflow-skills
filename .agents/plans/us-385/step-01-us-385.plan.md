---
step: 1
slug: us-385
workflowId: us-385
status: completed
---

# Plan — us-385: pipeline-aware expected artifacts in ws-monitor

## 1. Goal

Gate `expectedArtifacts` in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
on the pipeline discriminator (`state.workflowType`, projected as `pipeline`) so
healthy `ws-spec-to-pr-lite` runs stop reporting standard-only artifacts as
`critical` missing, while standard and `ws-spec-multi` findings stay identical.

## 2. Design intent (from spec)

- Modification extending the established `dag-disabled` run-shape exception
  pattern (`monitor_snapshot.cjs:475-480`), not a replacement.
- Reuse `state.workflowType`; unknown/legacy values keep the standard contract.
- Monitor stays read-only; no pipeline, numbering, or UI changes.

## 3. Step-by-step

1. `expectedArtifacts`: early lite branch — expect only shared-name lite
   artifacts (`step-00` spec, `step-01` plan, `step-06` review, `step-08` result)
   with lite step thresholds (review at lite Step 3, result at lite Step 4).
2. Standard path unchanged (fall-through for `standard`, `unknown`, legacy).
3. `ws-monitor/SKILL.md` signal map: document the pipeline-branching rule.
4. Regression fixture `test/test-ws-monitor-us385.js`: lite green run yields
   zero missing findings; absent `step-01` plan still critical; standard
   baseline unchanged; CLI snapshot end-to-end.
5. Verify: new test, `test-ws-monitor.js`, `test-ws-monitor-us356.js`,
   `test-step-baton-monitor.js`, `npm run test`, `test-harness-clean.js`,
   `scan_stack_invariants.cjs --stack typescript-node`, integrity regenerate.

## 4. AC mapping

- AC1/AC3/AC5: lite branch selects lite contract, excludes the four
  standard-only names, never adds standard-only names.
- AC2/AC7/AC8: lite `currentStep` 5 + steps 0–4 completed + lite artifacts
  present yields zero missing findings (unit + CLI snapshot).
- AC4: absent lite `step-00`/`step-01` still critical.
- AC6: standard + multi-spec inputs produce identical findings (existing tests).
- AC9: signal-map row. AC10: suites green, no new invariant findings.
