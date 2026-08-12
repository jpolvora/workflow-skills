# PR-194 round 1

**Commit:** `9182a06`
**Threads:** 5 (2 unique defects)

## Fixes

1. **@{u} false positive (PRRT_kwDOTFajc86Ysdcw, PRRT_kwDOTFajc86YsdeD)**  
   `ws-ship-pr` pulls only when `git ls-remote --heads {gitRemote} {shipHead}` shows the ref. Do not trust `@{u}`. Create-from-base uses `--no-track`.

2. **autoMode + detached HEAD (PRRT_kwDOTFajc86Ysde3, PRRT_kwDOTFajc86Ysdf9, PRRT_kwDOTFajc86Ysdgo)**  
   autoMode on detached HEAD creates `feat/{slug}` (or checks out existing); never persists literal `HEAD`. gates.md + spec AC8 updated.

## Verify

`node test/test-feature-branch-gate.js` passed (AC1–AC11). Integrity regenerated.
