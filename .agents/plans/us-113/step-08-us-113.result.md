# Delivery Result — US-113

## Summary
Fixed issue #113 where `workflow-skills update` (and `update --include-new`) failed post-verification when the consumer workspace contained custom repo-local skills.

## Key Changes
1. `bin/cli.js`: Updated `verifyIds` in `runUpdate()` to filter `afterManifest.skills` by `upstreamSet.has(n)` so custom consumer skills are omitted from upstream integrity verification.
2. `test/test-install.js`: Added test coverage verifying `runUpdate()` with custom repo-local skills present.

## Verification
- Ran `npm run tests -- --local` — all tests passed including Phase 2b custom skill update test.
