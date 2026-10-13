---
step: 7
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T02:02:00Z"
endedAt: "2026-10-13T02:05:00Z"
acRefs: []
---
# Testing report — us-509

## Results

| Command | Exit | Result |
|---------|------|--------|
| `node test/test-ac-ledger.js` | 0 | `test-ac-ledger: ok` — AC1-AC15 and NS1-NS12 assertions green |
| `node test/test-script-ux-golden-path.js` | 0 | `test-script-ux-golden-path: ok` — both `--ac` forms documented |
| `node test/test-per-task-adequacy.js` | 0 | `test-per-task-adequacy: ok` — repeated `--ac` multi-target path unchanged |
| `node test/test-harness-clean.js` | 0 | `Harness OK (upstream clean) — 0 findings` |
| `npm run test` (`backendTest`) | 0 | `run-tests: all 164 entries passed (mode=local)` |

## Coverage of the change

- New assertions: 15 AC-labelled checks, 12 NS-labelled spec negative-scenario
  checks, plus 2 both-form `link --help` checks in the usage lock.
- Regression: existing `test-ac-ledger.js` cases (alias results, findings,
  sabotage, `--files-touched`, state-manifest discovery, plan-index sync) and the
  `test-per-task-adequacy.js` multi-target adequacy case all still pass.

## Fault injection (Step 6b)

13 targeted injections across the parser, target-list, atomicity, help, NOTICE,
boundary, and productFailure branches were all caught; the unpatched control
passes. Evidence: `step-05b-us-509.fresh-verify.md`.

## Mutation

Mutation substep skipped (`defaults.skipMutationTesting: true`,
`verification.mutationTest` empty).

## Flake note

`test/test-subagent-dispatch.js` exhibits its documented
`child started before the kill` 400 ms child-startup race under load; a lone
re-run passed and the full suite passed 164/164. Unrelated to this change.

## Verdict

Testing complete. All required checks green.
