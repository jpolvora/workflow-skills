### [2026-08-15] Stale orch resume after feature already on develop
- **Layer**: Infrastructure
- **Module**: ws-spec-to-pr / resume / feature-branch checkout
- **Severity**: High
- **Scenario / Context**: An `status: active` plan on develop (testing-executor-model Step 8, shipAction create-pr) was resumed. Product commits were already ancestors of origin/develop (0 unique commits on the feature branch; 51 behind). Checking out `state.branch` dropped develop-tracked `{plansDir}` artifacts because those files are committed on develop but not on the stale feature branch.
- **DO NOT**: Create a PR or rebase/implement on a resumed feature branch without `git log origin/develop..HEAD` / `git rev-list --left-right --count origin/develop...HEAD`. Do not assume `{us-dir}` files survive `git checkout {state.branch}` when they are tracked on the starting branch.
- **INSTEAD DO**: If the feature tip has 0 commits not in develop/main, mark the leftover workflow `completed` (already merged) and start new work from develop. Before checkout, copy or restore plan artifacts if they live only on the current branch. Restore HEAD to `develop` after closing the leftover run.
