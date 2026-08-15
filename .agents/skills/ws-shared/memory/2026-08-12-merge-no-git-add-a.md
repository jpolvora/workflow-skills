### [2026-08-12] Merge conflict staging — never git add -A
- **Layer**: Infrastructure
- **Module**: Git / PR conflict resolution
- **Severity**: High
- **Scenario / Context**: Finishing a merge of `develop` into a feature branch to clear a CONFLICTING PR while untracked `{plansDir}` workflow artifacts exist locally
- **DO NOT**: Run `git add -A` (or equivalent blanket stage) to finish a merge. It pulls untracked plan/telemetry/scratch files into the merge commit and pollutes the PR; after push you cannot amend without force-push.
- **INSTEAD DO**: Stage only conflict-resolved paths (`git add <resolved-files>`) plus merge-owned changes already staged by `git merge`. Verify with `git diff --cached --name-only` and `git diff-tree -c --diff-filter=A HEAD` before/after commit. If junk was already pushed, follow up with a delete commit (not amend) and restore locals as untracked via `git show <bad-commit>:path > path`.
