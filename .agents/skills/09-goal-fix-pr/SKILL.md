---
name: 09-goal-fix-pr
description: Loop fix-pr until zero open threads — auto-approve gates, commit/push, re-check after 5 minutes.
version: 1.0
disable-model-invocation: true
---

# goal-fix-pr

Criterion-driven loop over [`fix-pr`](../08-fix-pr/SKILL.md). Stops on **convergence** — zero open threads on the PR — or user abort.

## Parse

```
/goal-fix-pr <PR-NUMBER> [dry-run] [max <n>]
```

| Token | Example | Effect |
|-------|---------|--------|
| `<PR-NUMBER>` | `15` | PR number on GitHub/Azure DevOps |
| `dry-run` | `/goal-fix-pr 15 dry-run` | No commit, push, or real `resolve_thread` |
| `max <n>` | `max 10` | Iteration ceiling (default **20**) |

Malformed → show usage above.

Restate before acting: **PR number**, **success criteria**, **mode** (Drive + post-push heartbeat), **max iterations**, **dry-run**.

## Success criteria

**Convergence:** after `collect`, `len(activeThreads) == 0`.

- **GitHub:** `gh pr view --json comments --jq '[.comments[] | select(.isResolved == false)] | length'` → count
- **Azure DevOps:** `fix_pr_azure_context.py collect` → `activeThreads` count

## Prerequisites

- Repository checked out; PR branch available.
- **GitHub:** `gh` available + token `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN`.
- **Azure DevOps:** `.agents/skills/azure-devops/azure-devops.config.json` + `AZURE_DEVOPS_PAT`.
- Local branch = PR head before each round ([`fix-pr` step 0](../08-fix-pr/SKILL.md)).

## Automation overrides (fix-pr)

This skill **overrides** human confirmations from the cooperative flow. When running under `goal-fix-pr`:

| fix-pr gate | Behavior |
|-------------|----------|
| Plan confirmation / "execute?" | **Auto-yes.** Save `plan-gate.md` and `plan-exec.md` in `runs/pr-<N>/`, proceed without `AskQuestion`. |
| Commit + resolve + push | **Auto** (unless `dry-run`). Order: validate → local commit → resolve threads → push. |
| **Escalate** threads | **Stop** iteration, report thread IDs and wait for human — do not auto-approve product ambiguity. |
| CI Auto-Fix `in_progress` | **Inform** the user; do not block automatically (same rule as fix-pr). |

Everything else remains: branch sync, per-thread analysis, surgical correction, guardrails [`senior-developer`](../../senior-developer/SKILL.md).

## Core loop

Copy and update each iteration:

```
Goal: fix-pr PR-<N> until convergence
Success: activeThreads == 0
Iteration: <n>/<max>
- [ ] branch sync (PR head)
- [ ] collect + count
- [ ] fix-pr round (if > 0)
- [ ] verify build/tests + code-review
- [ ] commit + resolve + push (if code changed)
- [ ] wait 5m + re-collect
```

### 1. Baseline (iteration 1)

**GitHub:**

```bash
mkdir -p .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>

gh pr view <PR-NUMBER> --json headRefName,baseRefName,state,url

REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_NUMBER/comments?per_page=100" \
  > .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>/context.json
```

**Azure DevOps:**

```bash
mkdir -p .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>

python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py collect \
  --pr-id <PR-NUMBER> --output .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>/context.json
```

Count `activeThreads`. If **0** → final report and **stop** (PR already converged).

If `gh pr view` indicates PR is **merged/closed**, stop and inform the user.

### 2. Act — fix-pr round

1. Load [`fix-pr/SKILL.md`](../08-fix-pr/SKILL.md) and execute **steps 0–7** for the current active threads, applying **Automation overrides** above.
2. One round = sync branch → investigate/fix → validate → commit → resolve threads → push (or simulation in dry-run).
3. Commit message: `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`.
4. Thread resolution:

**GitHub:**

```bash
REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_NUMBER/comments/$THREAD_ID/replies" \
  -f body="<root cause + fix; LLM Model: <identifier>>"
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py resolve-thread \
  --pr-id <PR-NUMBER> --thread-id <THREAD_ID> --model "<model-id>" \
  --comment "<root cause + fix>"
```

In **dry-run**, do not invoke resolve or `git push`; simulate in the log.

5. If classification results only in **Escalate** → stop the goal and list blocked threads.

### 3. Verify (mandatory)

No claim of progress without fresh evidence:

| Check | Evidence |
|-------|-----------|
| Build/tests | Output from build/test commands (see `config.json.verification` or tools.md aliases) |
| Auto-review | Status **"No feedback"** from skill [`code-review`](../06-code-review/SKILL.md) |
| Publish/Push | Commit hash + push confirmation (or dry-run log) |
| Resolved threads | resolve exit 0 (or documented skip in dry-run) |

3× identical failure on the same check → stop and escalate.

### 4. Post-push heartbeat (5 minutes)

After commit/push or round with resolve-only (no code changed), arm a sleeper of 300s (5 min) before the next collect — new comments from CI/reviewer might arrive after the push.

Unique sentinel per session: `AGENT_GOAL_WAKE_fixpr_<PR-NUMBER>`.

```bash
sleep 300
echo 'AGENT_GOAL_WAKE_fixpr_<PR-NUMBER> {"reason":"post-push","prompt":"Re-collect PR-<PR-NUMBER> and continue goal-fix-pr loop"}'
```

- `notify_on_output` with regex `^AGENT_GOAL_WAKE_fixpr_<PR-NUMBER>`.
- Track PID; kill upon completion or when user requests stop.
- Do **not** duplicate sleepers — one at a time.

### 5. Re-collect and re-arm

On wake (or immediately if dry-run without push):

1. Re-collect threads (appropriate platform) → count `activeThreads`.
2. **0** → **done** (convergence).
3. **> 0** and `n < max` → iteration `n+1` (return to step 2; include branch sync).
4. **n ≥ max** → stop, report remaining threads, request larger `max` or human intervention.

## Mode

| Phase | Mode |
|------|------|
| Analysis + correction + push | **Drive** |
| Post-push wait | **Watch** (5m timer) |

Iteration 1 runs **now** after arming the first sleeper (only after real push; in dry-run, immediate re-collect without waiting).

## Stop

| Condition | Action |
|----------|------|
| `activeThreads == 0` | Final report + kill sleeper |
| User says stop | Kill sleeper, summarize progress |
| Escalate thread | Stop, list blocks |
| `n >= max` | Stop, list active threads |
| Collect fails | Stop — do not improvise API |

## Final report

1. Iterations executed and stop criteria.
2. Threads handled per round (fixed / resolved / escalated).
3. Links to reports `.cursor/codereviews/PR-<N>-round-*.md` (if generated).
4. Commits (hash + message) and push confirmation.
5. Final `activeThreads` count with evidence from the last `collect`.
6. LLM Model used in resolutions.
7. PR URL.

## Dependencies

| Resource | Path |
|---------|------|
| Correction flow | [`fix-pr/SKILL.md`](../08-fix-pr/SKILL.md) |
| Collect threads (GitHub) | `gh api "repos/.../pulls/.../comments"` |
| Resolve thread (GitHub) | `gh api "repos/.../pulls/.../comments/.../replies"` |
| Collect/resolve (Azure DevOps) | `.agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py` |
| Code review | [`code-review/SKILL.md`](../06-code-review/SKILL.md) |
| Goal/loop pattern | [`goal-loop`](../goal-loop/SKILL.md) (sentinel + converge) |

Walkthroughs: [`examples.md`](examples.md).
