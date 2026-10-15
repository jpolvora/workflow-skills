---
step: 7
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
startedAt: "2026-10-13T04:22:00.000Z"
endedAt: "2026-10-13T04:22:00.000Z"
---
# Testing Plan — us-511

| Layer | Command | Purpose |
|-------|---------|---------|
| Unit (new) | `node test/test-fetch-threads-token-fallback.js` | token chain, failure, secret, shim, JSON contract, docs parity |
| Regression | `node test/test-provider-parity.js` | `activeThreads` literal + provider parity |
| Regression | `node test/test-skills-runtime-resolution.js` | `HUB_SCRIPTS_DIR` candidate chain |
| Install | `node test/test-install.js` | shim paths + integrity install assertions |
| Full | `npm run test` | all 166 entries, local mode |
| Harness | `node test/test-harness-clean.js` | 0 findings |
| Integrity | `npm run verify-integrity` | manifest matches tree |

Testing enabled (`skipTesting: false`). Mutation testing skipped per
`defaults.skipMutationTesting: true`. Browser step not applicable (CLI/library change,
no product UI surface).
