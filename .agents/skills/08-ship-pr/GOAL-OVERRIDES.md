# ship-pr — goal-fix-pr timing overrides

Load with [SKILL.md](SKILL.md) Phase 5. Parent loop: [goal-fix-pr](../10-goal-fix-pr/SKILL.md).

## Why wait for code-review (5 minutes+)

Agentic Code Review, CI, and human reviewers often comment **after** the first push. ship-pr **must wait** for that feedback before treating the PR as merge-ready, then run `goal-fix-pr` until there are **no open issues to fix**, and only then merge (Phase 6).

## Overrides

| goal-fix-pr default | ship-pr |
|---------------------|---------|
| Iteration 1 starts after first collect | **300s sleep**, then collect (code-review wait) |
| `sleep 120` post-push heartbeat | **`sleep 300`** |
| Sentinel `AGENT_GOAL_WAKE_fixpr_<N>` | **`AGENT_SHIP_PR_WAKE_<N>`** |
| `max` default 20 | Parse token (default **10**) |

Everything else unchanged: branch sync, fix-pr steps 0–7, auto gates, commit message `fix(#<PR>): auto-fix issues from review threads [...]`, verify build/tests, Escalate stops the pipeline.

## Sleeper rules

- **One** background sleeper at a time; kill on done, stop, or merge.
- `notify_on_output` regex: `^AGENT_SHIP_PR_WAKE_<PR>`.
- `dry-run`: no sleeper; re-collect immediately between simulated iterations.

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "No comments yet — skip 5m" | First 5m is mandatory for review Action / CI. |
| "Use goal-fix-pr 2m" | ship-pr always **300s**. |
| "Merge with open threads" | Merge only when `activeThreads == 0` after goal-fix-pr. |
| "Checks still red — merge anyway" | Phase 6 requires green required checks. |
| "Squash without asking" | Use `--merge` (merge commit), matching repo history. |
