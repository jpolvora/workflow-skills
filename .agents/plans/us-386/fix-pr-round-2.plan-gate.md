# Fix-PR round 2 gate — PR #394 (Step 9)

Date: 2026-09-22. Active threads at entry: 2 (both score 8, WARNING, same root finding).
Resolved so far: 1 (round-1 matrix). Round-1 fix commit: 6d48db8.

## Threads 2a/2b — hook not wired into the executable transition (STEP-DISPATCH.md:174, lite SKILL.md:47)

Reviewer claim: prose hook + pure helper, but no orchestrator instruction invokes the helper, presents the gate, records the decision, or dispatches the collector at terminal state. VERDICT: valid — in this repo the orch instruction IS the executable, so the fix is a concrete runbook (exact argv → gate → collector invoke → telemetry token) at each terminal branch.

### Plan (gate-only)

1. STEP-DISPATCH.md: replace the prose hook paragraph with a numbered runbook: run `resolve_proof_of_work.cjs` with effective config/slug/project-root (+ capability flags + `--gate-decision` from the gate); normal-mode gate first when manual; on `start` invoke the `proof-of-work` collector with the resolved folder and log `started:{folder}`; on `skip` log `skipped:{reason}`; omitted/false short-circuits at skip:disabled; never in ws-ship-pr; never commit evidence.
2. Lite SKILL.md Step 5 row Done criteria += run the same sequence (helper → gate → collector/telemetry) after merged/zero-threads.
3. Extend `test-proof-of-work.js`: assert the runbook verbs (helper argv, `--gate-decision`, `started:`/`skipped:` telemetry, collector invoke) in both orch docs.
4. Verify: new test, editor test, scan, full suite, integrity regen + verify.
5. Commit `fix(#386): wire post-completion runbook into terminal transitions [review-round-2]`, push, reply both threads, resolve both via mutation, re-check CI + threads.
