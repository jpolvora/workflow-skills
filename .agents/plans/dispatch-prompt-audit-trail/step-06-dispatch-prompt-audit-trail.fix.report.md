# Review fix report — dispatch-prompt-audit-trail (round 1/3)

- **Finding:** CR-001 [Warning] — P2 re-dispatch guard threw unconditionally, wedging internal retry/batch substeps on audited steps.
- **Fix:** `workflow_state.cjs` — internal retry substeps (`scoreAndRefine`, `reviewFix`, `fixPrPlan`, `fixPrExec`) inherit the prior entry's `promptPath`/`promptSha256` (entry + event) when re-dispatched without fresh flags; prior-sha event field set only on explicit fresh-flag re-dispatch; fresh re-dispatches and `dag` node dispatches without flags still fail closed. Hardened to require both prior fields present before inheriting.
- **Recipe:** `STEP-DISPATCH.md` audit paragraph documents inheritance vs fail-closed behavior.
- **Regression tests:** `test-dispatch-prompt-audit.js` — fixPrPlan substep inherits (exit 0, entry + event provenance, no prior-sha field); dag substep without flags still exits non-zero.
- **Verification:** new suite green; full suite 147/147 green (post-fix, post-integrity-regen); stack scan 0 issues; `test-context-budget` green; ledger score restored to 10/10 at `step5` after hash refresh.
- **Remaining:** none. CR-001 closed in round 2.
