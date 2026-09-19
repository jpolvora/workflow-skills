### [2026-09-10] Resolution-stale checks must compare resolved dirs

- **Layer**: Harness
- **Module**: resolve_consumer_root / resolved-context diagnostics
- **Severity**: Medium
- **PathPattern**: `**/resolve_consumer_root.cjs`; `**/resolve_consumer_root.py`; `test/test-local-first-precedence.js`
- **Scenario / Context**: A mid-run config change switched `plans.dir` while config path, source, branch, worktree, workflow, and state path stayed identical, so `isResolutionStale` returned false and the monitor kept observing the old directory.
- **DO NOT**: Treat config path/source plus branch/worktree/workflow identity as sufficient staleness keys when the diagnostic also carries resolved directories.
- **INSTEAD DO**: Include resolved `plansDir`/`specsDir` (`plans_dir`/`specs_dir` in Python) in the stale comparison so directory-affecting config edits invalidate cached resolution.
