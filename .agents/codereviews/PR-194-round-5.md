# PR-194 round 5

**Commit:** `bb2f29f`
**Threads:** PRRT_kwDOTFajc86Yt3TA, PRRT_kwDOTFajc86Yt3T0 (fixed); PRRT_kwDOTFajc86Yt3Uz (comment-only)

## Fixes

1. **autoMode ls-remote auth/network** (Yt3TA, Yt3T0)
   autoMode detached falls back to local-check-only; log `branch-gate | auto | local-check-only`. gates.md auto-gate row notes the same.

2. **index.PRD** (Yt3Uz, score 3)
   No code. Spec Next defers register to workflow start / ws-spec-index. Out of this gate's contract.

## Verify

`node test/test-feature-branch-gate.js` passed.
`npm run test` passed.
`npm run verify-integrity` OK.
