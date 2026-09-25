---
step: 7
slug: us-414-run-state-integrity
workflowId: us-414-run-state-integrity-20260924T170500Z
status: completed
startedAt: "2026-09-24T21:38:27.027Z"
endedAt: "2026-09-24T21:38:27.027Z"
acRefs: []
---
# Testing report — us-414-run-state-integrity

Executor model chain per config: testingModel unset → executionModel unset →
session (inline worker run, no subagent dispatch).

## Verification aliases (`config.json verification`)

| Alias | Command | Result |
|-------|---------|--------|
| `backendTest` | `npm run test` (`node test/run-tests.cjs`, mode=local) | exit 0 — all 131 entries passed; hub config byte-identity verified |

Recorded in ledger as `ev-alias-backendtest`
(`alias=backendTest,command=npm run test,exitCode=0`).

## New coverage

`test/test-run-state-integrity.js` exit 0 (27 asserts): fail-closed unknown
preset dispatch/`--preset` (NEG1/AC1), no cross-preset model resolution,
preset-name → id recording on dispatch + finish (AC2), ship writeback persist +
invalid status + pr-only replay update (NEG2/AC3), round-artifact-or-reason
checker incl. reason-less marker rejection (NEG3/AC4), bare-`dag` rejection on
finish/dispatch/bypass + `dag-disabled` acceptance (AC5).

## Regression set (all exit 0, observed this run)

- `test-models-preset-and-per-step.js` (contract updated to fail-closed, surfaced decision)
- `test-dispatch-provenance.js`
- `test-workflow-state-contract.js`
- `test-script-ux-golden-path.js`
- `test-terminal-close-us395.js`
- `test-update-state-yaml.js`
- `test-step-coordinator.js`
- `test-liveness-checkpoints.js`
- `test-enable-dag.js`

## Harness (ws-check-harness Phases 0–5c)

All phase scripts exit 0: `detect_install_mode`, `check_duplicates`,
`measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`,
`check_unique_runtime`, `check_harness_links`, `check_hub_separation`.
`node test/test-harness-clean.js`: 0 findings ("Harness OK (upstream clean)").
`npm run verify-integrity`: OK (v0.4.70).

Post-review-fix note: the Step 6 fingerprint fix touched
`workflow_state.cjs`, so integrity was regenerated (`e52ed76d…`) and the full
suite re-ran green on the final tree before this report.

## Browser / mutation

Not applicable (no UI surface; `skipMutationTesting: true` in config).

`Learning: N/A (standard implementation)`.
