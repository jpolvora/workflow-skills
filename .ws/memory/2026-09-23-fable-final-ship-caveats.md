### [2026-09-23] Separate tested integration contracts from live external runs
- **Layer**: devops
- **Module**: ws-fable-judge / ws-ship-pr
- **Severity**: High
- **PathPattern**: bin/review-dry-run.cjs; package.json; test/test-review-dry-run.js
- **Scenario / Context**: The final ship audit verified the local dry-run launcher through unit tests and configuration inspection, but the live external reviewer invocation was not run because it requires network access and a selected credential.
- **DO NOT**: Claim the external reviewer completed successfully when only its argument and credential-selection contract was unit-tested.
- **INSTEAD DO**: Report the live invocation as unverified until it runs, while allowing a non-blocking optional preview gate to continue under its configured policy.
