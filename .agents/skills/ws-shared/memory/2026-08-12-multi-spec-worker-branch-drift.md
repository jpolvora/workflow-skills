### [2026-08-12] Multi-spec worker HEAD can leave the assigned feature branch
- **Layer**: Infrastructure
- **Module**: Git / ws-multi-spec workers
- **Severity**: High
- **Scenario / Context**: A ws-spec-to-pr worker is dispatched onto an already-checked-out feature branch while other workers share the same worktree. Another process may `git checkout develop` (or stash/pop) while this worker is reading skills.
- **DO NOT**: Keep editing after a later `git rev-parse --abbrev-ref HEAD` shows `develop` or any branch other than the assigned feature branch. Do not mix the spec into PR 194 / `develop`.
- **INSTEAD DO**: Re-check `git rev-parse --abbrev-ref HEAD` before mutating files, staging, or committing. If HEAD drifted, `git checkout {assigned-branch}` only (never reset / -D). Stash *other* workers' tracked WIP by explicit path; never `git add -A`.
