# fixPrPlan gate — PR #471 round 1 (CI test failures, no threads)

- **PR:** 471 (`develop` → `main`)
- **Batch:** CI `test` checks failed (2 runs); `review` passed; 0 active threads
- **Diagnosis:** `test-step-context-budgets.js` spawns the dispatch builder and
  harness measure with temp-fixture `--repo-root`s that carry only
  `.ws/config.json`. Enhancing/target `SKILL.md` resolution is repoRoot-local
  else `$WORKFLOW_SKILLS_GLOBAL_DIR`/home-global; fixtures have neither, so CI
  (no ambient global install) fails with `SKILL.md not found for
  ws-senior-developer`. The author machine global install masked it locally.
  Classification: **diff-regression** (new suite), not baseline, not flake.
- **Fix (test-only, no product change):** set
  `process.env.WORKFLOW_SKILLS_GLOBAL_DIR = <repo>/.agents/skills` at the top
  of `test/test-step-context-budgets.js` so spawned children resolve skill
  bodies from the repo tree. Matches the established hermetic pattern in
  `test-hybrid-consumer-root.js:57`.
- **Files:** `test/test-step-context-budgets.js` only (comment + 1 line).
- **Forbidden:** no product-file edits, no resolve calls (no threads), no
  unrelated scope.
- **Verify:** new suite green under simulated empty ambient global; full
  `npm run test` 152/152 green; push and re-check CI.
- **Proactive sweep:** same-class scan of builder/measure spawns with fixture
  repoRoots — hybrid suite already hermetic, research/context/audit suites use
  the real repoRoot, ws-monitor only names the script in fixture strings.
  `proactiveFixed: []`, `proactiveSkipped: []` (no live hits).
