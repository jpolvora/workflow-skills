---
us: ws-spec-to-pr-distributed
step: 7
---
# Testing Plan — ws-spec-to-pr-distributed

## Scope

Changed surface: new `ws-spec-to-pr-distributed` skill (skill body, coordinator script, references, evals),
`ws-check-workflows` registry + simulation, shared-runtime prose re-homing, `ws-spec-to-pr` slim, both dependency
manifests, docs/site/wiki/router sync, version bump, integrity manifest, and the updated baton test suites.

## Unit & integration

| Battery | Command |
|---------|---------|
| Full local suite (138 entries) | `npm run test` (`verification.backendTest`) |
| Baton suites | `node test/test-step-coordinator.js`, `test-step-baton-config.js`, `test-step-baton-claim.js`, `test-step-baton-telemetry.js`, `test-step-baton-monitor.js`, `test-step-baton-specmemo.js` |
| Worker-turn guard | `node test/test-worker-turn-guard.js` |
| New registry test | `node test/test-check-workflows-distributed.js` |
| Harness self-audit | `node test/test-harness-clean.js` |
| Integrity | `npm run generate-integrity` + `npm run verify-integrity` |
| Workflow FSM | `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` |
| Stack invariants | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` |

## Coverage

`npm run coverage` (c8 thresholds: lines 80, branches 68).

## Mutation

`verification.mutationTest` is empty/unset and `defaults.skipMutationTesting` is true → mutation **skipped**.

## Regression sabotage

New regression surface: `test/test-check-workflows-distributed.js` covering AC13/NS6. Invert patch renames the
distributed registry key in `check_workflows.cjs`, runs `backendTest`, and expects a non-zero exit.

## Feature-quality AC checklist

AC1–AC17 mapped in `ac-ledger.json` with file/test evidence; NS1–NS6 each mapped to an observed passing test.
