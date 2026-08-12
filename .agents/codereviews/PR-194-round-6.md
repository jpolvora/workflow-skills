# PR-194 round 6

**Commit:** `cb8078d`
**Threads:** PRRT_kwDOTFajc86YuEuH, PRRT_kwDOTFajc86YuEvG

## Fixes

1. **checkout-existing remote-only** (both threads)
   Fetch `{gitRemote} {name}` then checkout when local list is empty but ls-remote shows the ref. autoMode checkout-existing uses the same recipe.

## Verify

`node test/test-feature-branch-gate.js` passed.
`npm run test` passed.
`npm run verify-integrity` OK.
