# us-448 — Testing Plan

1. Run the configured `npm run test` suite.
2. Run targeted layout tests for child outcome, artifact guard,
   supersede resolution, and monitor discovery.
3. Run Node syntax checks for modified CommonJS scripts.
4. Run harness duplicate, cleanliness, integrity, and stack invariant checks.
5. Confirm the worktree contains only the intended product commit plus
   protected pre-existing and workflow artifact changes.
