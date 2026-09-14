### [2026-09-14] Fix-pr must detect pull overlap and protect inseparable anchors

- **Layer**: Harness
- **Module**: ws-fix-pr / dirty-tree preflight and surgical commit
- **Severity**: High
- **PathPattern**: .agents/skills/ws-fix-pr/SKILL.md;.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md;.agents/skills/ws-shared/runtime/gates.md;.agents/skills/ws-shared/runtime/tools.md
- **Scenario / Context**: Review round 3 found that “pull when safe” had no deterministic remote-path check, and an inseparable mixed hunk on a preExistingDirty fix path could be left unstaged while a score 6–10 thread was still resolved as fixed.
- **DO NOT**: Pull based on a guess about dirty-path overlap. Do not resolve a score 6–10 thread as fixed when its anchor cannot be separated from unrelated WIP, and do not use comment-only resolution as a substitute for a missing landed commit.
- **INSTEAD DO**: Fetch the source branch, compare `git diff --name-only HEAD..FETCH_HEAD` with normalized `preExistingDirty` paths, and pull only with no intersection. Stage anchor hunks through a non-interactive scoped patch / `git apply --cached`; if inseparable, leave the thread open or escalate with `path + reason`. Comment-only resolution is for 0–5 threads only.
