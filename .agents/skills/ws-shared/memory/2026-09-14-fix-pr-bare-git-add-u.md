### [2026-09-14] Bare git add -u stages all tracked dirty files

- **Layer**: Harness
- **Module**: ws-fix-pr / surgical commit
- **Severity**: High
- **PathPattern**: .agents/skills/ws-fix-pr/SKILL.md;.agents/skills/ws-shared/runtime/gates.md
- **Scenario / Context**: Spec 0082 allowed dirty trees. Step 5 said `git add -u --` without a pathspec. On a dirty harness worktree that command stages every tracked modification, not only deleted fix paths.
- **DO NOT**: Run bare `git add -u` / `git add -u --` during fix-pr or G2-code when `preExistingDirty` exists.
- **INSTEAD DO**: `git add -- <paths>` and `git add -u -- <deleted-paths>` using only this batch's scoped list (same as tools.md `commit-code`).
