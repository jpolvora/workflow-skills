# PR-194 round 4

**Commit:** `5092fb0`
**Threads:** PRRT_kwDOTFajc86Yttds, PRRT_kwDOTFajc86Yttet, PRRT_kwDOTFajc86Yttfb, PRRT_kwDOTFajc86YttgJ

## Fixes

1. **@{u} rationale vs --no-track** (Yttds, Yttet, Yttfb)
   ws-ship-pr Step 1 and spec AC9 now match setup.md §5b option 2 (`--no-track`). Pull still gated on `ls-remote`.

2. **ls-remote auth/network** (YttgJ)
   5b STOP + Retry / Proceed with local check only / Cancel (HS-1). Never infer absent from a failed `ls-remote`.

## Verify

`node test/test-feature-branch-gate.js` passed.
`npm run test` passed.
`npm run verify-integrity` OK.
