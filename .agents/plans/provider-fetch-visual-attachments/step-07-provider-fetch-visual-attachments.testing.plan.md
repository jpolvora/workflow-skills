# Step 07 Testing Plan: Provider fetch visual attachments

## Scope
Visual attachment ingest for `fetch-to-spec` (GitHub + Azure DevOps parity).

## Commands
| Area | Command |
|------|---------|
| Unit/feature | `node test/test-visual-attachment-ingest.js` |
| Parity | `node test/test-provider-parity.js` |
| Integrity | `npm run verify-integrity` |
| Full suite | `npm run test` (`verification.backendTest`) |

## AC observability
- Mock HTTP covers helper, both converters, register copy, partial failure, allowlist, size limits.
- Parity asserts INTENTS document assets sidecar / Visual References.

## Mutation
Skipped (`defaults.skipMutationTesting: true`, no `verification.mutationTest`).

## Regression sabotage
Skipped — mutation not run; feature tests use dedicated mock fixtures (no invert patch declared).

## UI/E2E
Not applicable (Node/Python CLI skills package).
