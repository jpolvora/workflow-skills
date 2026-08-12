# PR-194 round 3

**Commit:** `9787c4c`
**Threads:** PRRT_kwDOTFajc86Ytc0q, PRRT_kwDOTFajc86Ytc1M, PRRT_kwDOTFajc86Ytc2D (one defect class)

## Fixes

1. **Remote-only feat/{slug} collision (all 3 threads)**
   Existence check now uses `git branch --list` + `git ls-remote --heads {gitRemote} feat/{slug}` (not stale `refs/remotes/...`). Alternate names re-checked before `checkout -b`. autoMode detached uses the same check (checkout-existing vs create).

## Verify

`node test/test-feature-branch-gate.js` passed (AC1–AC11).
`npm run test` passed.
`npm run verify-integrity` OK.
Local diff review: no Critical/Warning.
