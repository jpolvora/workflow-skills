### [2026-08-17] AC9 resume count must fetch integration ref first
- **Layer**: `Infrastructure`
- **Module**: `ws-spec-to-pr / setup.md §4c / resume pre-check`
- **Severity**: `High`
- **Scenario / Context**: AC9 counted `git rev-list --count origin/{integrationBranch}..HEAD` against the local remote-tracking ref with no fetch. After a remote merge, a stale `origin/develop` still showed uniqueCount > 0, so resume proceeded and could re-implement merged work.
- **DO NOT**: Trust a local `origin/{integrationBranch}` tip for the resume unique-commit gate without refreshing it.
- **INSTEAD DO**: If `{gitRemote}` exists, `git fetch {gitRemote} {integrationBranch}` (same as §5b) before the count. On auth/network failure, skip-check `fetch-failed` and proceed; never mark completed on an unverifiable count. Stay-on-integration still skips the count.
