---
name: ws-ship-pr
description: End-to-end delivery — push/create PR, wait for code-review feedback, run goal-fix-pr until no open issues, then merge (unless stopBeforeFixPr / no-merge).
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 1.8
disable-model-invocation: true
invocation_names:
  - ship-pr
  - ws-ship-pr
  - 08-ship-pr
---

# ship-pr

Ship the completed workflow from `config.project.workingBranch` (default `develop`) to `config.project.baseBranch` (typically `main`/`master`). Act as a **DevOps Engineer / Release Manager**: validate, push, create the PR via the configured SCM provider, wait for code-review/CI feedback, converge threads via `goal-fix-pr`, and merge only when there are no open issues.

Timing overrides for the wait/converge phase: [GOAL-OVERRIDES.md](GOAL-OVERRIDES.md). Usage examples: [examples.md](examples.md).

## Invocation

Standalone:

```
/ship-pr [commit-title] [base=<branch>] [head=<branch>] [dry-run] [no-merge] [max <n>]
```

Workflow: `spec-to-pr` Step 8 (delivery commit, code review, and testing already done in Steps 6–7) or `spec-to-pr-lite` Step 4 (review already done in Step 3). Dispatched with `workflowMode: true`, `shipAction`, and typically `stopBeforeFixPr: true` (standard Step 8): create/push the PR and STOP; orchestrator Step 9 runs `goal-fix-pr`/`fix-pr`.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `commit-title` | (optional) | Message for any uncommitted changes |
| `base` | `config.project.baseBranch` | Auto-detect `main`/`master` if unset |
| `head` | `config.project.workingBranch` (`develop`) | Branch to push and use as PR head |
| `dry-run` | `false` | Simulate, no commits/push/real PR API calls |
| `no-merge` | `false` | Create PR and run checks, stop before merge |
| `max <n>` | `10` | `goal-fix-pr` iteration cap (ignored when `stopBeforeFixPr`) |
| `workflowMode` | `false` | Orchestrator-set: execute `shipAction` without re-asking |
| `shipAction` | (orchestrator-selected) | `create-pr` \| `push-only` \| `skip` |
| `stopBeforeFixPr` | `false` | Skip Step 6; orchestrator owns fix-PR at Step 9 |

Before executing, restate commit title, head/base branches, SCM provider, mode, `stopBeforeFixPr`, max iterations, and `shipAction`. Resolve branches and provider from `.agents/skills/shared/config.json` only.

## Steps

1. **Preflight**: resolve `workingBranch`/`baseBranch`/`gitRemote`; confirm active branch is `workingBranch`; check `git status` and tracking-branch drift; `git pull {gitRemote} {workingBranch}`; auto-detect base via `scripts/detect-base-branch.sh` if unset; stop on unexpected dirty files outside delivery scope.
   - Done when: branches are resolved and the working tree is clean and pulled.

2. **Code-review loop**: skip entirely if already reviewed under `spec-to-pr` Step 6 or `spec-to-pr-lite` Step 3. Otherwise load [06-code-review](../06-code-review/SKILL.md) against `base` and auto-fix Critical/Warning findings, up to 3 iterations.
   - Done when: review is clean, the 3-iteration cap is reached, or the step was skipped.

3. **Verify**: run `config.json.verification` commands; auto-correct up to 3 times, then stop.
   - Done when: verification passes or the retry cap is reached.

4. **Commit & push**: commit any remaining ship-scope changes (the delivery commit should already exist under `workflowMode`); `git push -u {gitRemote} {workingBranch}`.
   - Done when: the branch is pushed with no uncommitted ship-scope changes left.

5. **Create PR**: resolve `providers.scm` per [`config-resolution.md`](../shared/config-resolution.md) (reject `local`; STOP if unresolved). Load the matching provider skill ([github-provider](../github-provider/SKILL.md) or [azure-devops-provider](../azure-devops-provider/SKILL.md)), run `validate-auth` (STOP on failure, no silent fallback to another provider), then dispatch intent `create-pr --head {workingBranch} --base {baseBranch}` (reuses an existing open PR for the same head to base when present). Capture the PR id and URL.
   - Done when: a PR id and URL are captured or an existing PR was reused. If `stopBeforeFixPr` and `shipAction: create-pr`: print the URL and STOP here (success).

6. **Wait and converge**: skip if `stopBeforeFixPr` (orchestrator dispatches [goal-fix-pr](../goal-fix-pr/SKILL.md) at Step 9 instead). Otherwise apply the mandatory post-push settle window (default **300s**, timing per [GOAL-OVERRIDES.md](GOAL-OVERRIDES.md)), poll required checks and `list-threads`, and dispatch `goal-fix-pr` until `activeThreads == 0` or `max` iterations. Never proceed to merge while threads remain, checks are red, or on an escalate-stop.
   - Done when: `activeThreads == 0` and required checks are green, or the run stopped with the PR URL reported.

7. **Merge**: only when Step 6 converged and checks are green. Dispatch provider intent `merge-pr` with the captured PR id; the provider waits for checks/policies before completing. Skip when `no-merge` is set, or when `stopBeforeFixPr` (merge happens after orchestrator Step 9 converges). Never delete `{workingBranch}` after merging, and never pass provider flags that would.
   - Done when: the PR is merged, or explicitly skipped per `no-merge`/`stopBeforeFixPr`, with `{workingBranch}` intact.

## Output

Print the PR URL alone on its own line:

```markdown
**PR:** {provider-returned-url}
```

In `dry-run`, `push-only`, `skip`, or an early `stopBeforeFixPr` stop, state the outcome clearly (e.g. `PR not created` or `PR created, fix-PR deferred to orchestrator`) instead of a placeholder URL.

## Dependencies

- SCM providers: [github-provider](../github-provider/SKILL.md) · [azure-devops-provider](../azure-devops-provider/SKILL.md) (selected by `providers.scm`)
- Reviewer: [06-code-review](../06-code-review/SKILL.md) · Convergence: [goal-fix-pr](../goal-fix-pr/SKILL.md) · Fixer: [fix-pr](../09-fix-pr/SKILL.md)
- Base detection: `scripts/detect-base-branch.sh` · Artifacts: [ARTIFACTS.md](../spec-to-pr/ARTIFACTS.md)

Language: en-us only.
