### [2026-09-19] Baton releases need the claim lock plus a fresh-read check

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator baton release
- **Severity:** High
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** `releaseOwnBaton` compared the holder against a pre-read snapshot and wrote outside the baton lock with no revision check, so a claim that won the lock between the read and the write was silently erased (holder=null over a live claim) and two workers executed the same step — on failure paths (same step re-claimed after expiry) and on the success path (next step claimed post-advance, then re-claimed by the staler). The earlier holder check fixed only the single-threaded case; existing tests asserted nothing about serialization.
- **DO NOT:** Add a baton-affecting state write outside `withBatonLock`, or treat a holder comparison against a pre-lock read as a concurrency guard.
- **INSTEAD DO:** Perform every release read-check-write inside `withBatonLock` on freshly re-read disk state with the same retry/backoff as the claim (the holder re-check under the shared lock is the CAS); keep the held-lock unit case in `test/test-step-coordinator.js` green (matching holder preserved under a held lock, released once it frees).
