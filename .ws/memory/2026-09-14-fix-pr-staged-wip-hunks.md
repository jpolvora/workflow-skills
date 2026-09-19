### [2026-09-14] Fix-pr must separate staged WIP before hunk staging

- **Layer**: Harness
- **Module**: ws-fix-pr / surgical commit
- **Severity**: High
- **PathPattern**: .agents/skills/ws-fix-pr/SKILL.md;.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md;.agents/skills/ws-shared/runtime/gates.md;.agents/skills/ws-shared/runtime/tools.md
- **Scenario / Context**: Review round 4 found that `git diff -- <path>` compares the worktree with the index and hides staged leftovers, so `git apply --cached` can add the fix while unrelated staged harness hunks on the same path remain in the commit.
- **DO NOT**: Treat a path-scoped name list as proof that staged content is safe. Do not stage fix hunks without checking both the index and worktree against HEAD.
- **INSTEAD DO**: Inspect `git diff HEAD -- <path>`, `git diff --cached -- <path>`, and `git status --porcelain -- <path>`. If the index holds unrelated WIP, use `git restore --staged -- <path>` to keep it in the worktree before non-interactive hunk staging; if the anchor cannot be separated, leave the score 6–10 thread open or escalate with `path + reason`.
