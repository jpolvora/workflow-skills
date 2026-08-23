### [2026-08-23] Shared worktree integrity vs other-worker dirty skills

- **Layer**: Harness
- **Module**: skill-integrity / ws-spec-to-pr Step 7
- **Severity**: High
- **PathPattern**: `bin/skill-integrity.json`, `.agents/skills/ws-*/**`, `package.json`
- **Scenario / Context**: Parallel ws-multi-spec workers share one worktree. Step 7 `npm run test` / `npm run verify-integrity` fail when another worker has uncommitted hashed skill files (or `package.json` test-list changes). Regenerating integrity while those files are dirty stamps *their* hashes into this worker's G2-code commit.
- **DO NOT**: Run `npm run generate-integrity` or treat integrity/test red as this slug's defect while other workers' hashed paths are dirty. Do not `git add -A`.
- **INSTEAD DO**: Stash *other* workers' tracked hashed paths by explicit path; regenerate integrity only after the tree is this slug's hashed files; pop the stash after ship. Re-check `git rev-parse --abbrev-ref HEAD` stays on the assigned branch.
