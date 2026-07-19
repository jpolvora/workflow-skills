---
name: ws-ship-pr
description: End-to-end delivery — push/create PR, wait for code-review feedback, run goal-fix-pr until no open issues, then merge (unless stopBeforeFixPr / no-merge).
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 1.7
disable-model-invocation: true
invocation_names:
  - ship-pr
  - ws-ship-pr
  - 08-ship-pr
---

# ship-pr

Responsible for shipping the completed workflow from the configured working branch (`config.project.workingBranch`, default `develop`) to the production base branch (`config.project.baseBranch`, typically `main` or `master`). It automates validation, branch push, PR creation via the SCM provider selected by `config.providers.scm`, **waiting for code-review / CI feedback**, thread convergence via `goal-fix-pr`, and **merge only when there are no open issues to fix**.

## Persona

Act as a **DevOps Engineer / Release Manager** responsible for execution of final branch validation checks, synchronization, branch protection compliance, pull request creation, and clean production merges.

---

## Invocation

### Standalone Mode

```
/ship-pr [commit-title] [base=<branch>] [head=<branch>] [dry-run] [no-merge] [max <n>]
```

### Workflow Mode

| Orchestrator | Step | Notes |
|--------------|------|-------|
| `spec-to-pr` (standard) | **Step 8** | Delivery commit already done (plan + `step-08-{slug}.result.md`). Code review and testing already completed in Steps 6–7. |
| `spec-to-pr-lite` | **Step 4** | Delivery commit already done (plan + result). Code review completed in Step 3. |

Dispatched with `workflowMode: true`, `shipAction`, and typically `stopBeforeFixPr: true` (standard Step 8). When `stopBeforeFixPr: true`, create/push PR and **STOP** — orchestrator Step 9 runs `goal-fix-pr` / `fix-pr`.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `commit-title` | String | (optional) | Custom commit message for any uncommitted changes. |
| `base=<branch>` | String | `config.project.baseBranch` | Target merge branch. Auto-detect `main`/`master` if unset. |
| `head=<branch>` | String | `config.project.workingBranch` (default `develop`) | Branch to push and use as PR head. |
| `dry-run` | Flag | `false` | Simulate without commits, push, or real PR API requests. |
| `no-merge` | Flag | `false` | Create PR and run checks, but stop before merge. |
| `max <n>` | Integer | `10` | Iteration limit for the `goal-fix-pr` convergence loop (ignored when `stopBeforeFixPr: true`). |
| `workflowMode` | Boolean | `false` | Set by orchestrator — execute `shipAction` without re-AskQuestion. |
| `shipAction` | `create-pr` \| `push-only` \| `skip` | — | Orchestrator-selected ship option. |
| `stopBeforeFixPr` | Boolean | `false` | When `true` with `workflowMode`, skip Phase 5 (`goal-fix-pr`); orchestrator owns fix-PR at Step 9. |

Before executing, restate: **commit title**, **working (head) branch**, **base branch**, **SCM provider (`providers.scm`)**, **mode**, **`stopBeforeFixPr`**, **max iterations** (if applicable), **shipAction** (if set). Resolve branches and provider from `.agents/skills/shared/config.json` only — see [`config-resolution.md`](../shared/config-resolution.md).

---

## Workflow integration (spec-to-pr Step 8 / lite Step 4)

1. Prior workflow steps already completed (standard 0–7 or lite 1–3).
2. **Delivery commit is orchestrator-owned** before dispatch: stages refined plan (when present) + `step-08-{slug}.result.md` (standard) or lite result artifact per [`gates.md`](../shared/gates.md). This skill does **not** re-run the delivery gate.
3. **Orchestrator owns the ship AskQuestion** and passes `shipAction: create-pr|push-only|skip` plus `workflowMode: true`.
4. When `workflowMode: true`, **do not** present another approval gate — execute `shipAction` immediately.
5. Standalone `/ship-pr` (no `workflowMode`): may AskQuestion Create PR / Push only / Skip.
6. **Skip Phase 1 (code-review loop)** when already reviewed under either orchestrator (Steps 6 / lite Step 3).
7. When `stopBeforeFixPr: true`: run through PR creation (Phase 4), then **STOP** — do not run Phase 5 (`goal-fix-pr`). Orchestrator advances to Step 9 for thread convergence.

---

## Pipeline Execution

```
0. Preflight → 1. Code-Review Loop (skip if reviewed) → 2. Verification → 3. Commit & Push → 4. PR Creation → 5. Wait code-review + goal-fix-pr (skip if stopBeforeFixPr) → 6. Merge (only if no open issues)
```

**Merge gate (non-negotiable):** Never merge while unresolved review threads / open fixable issues remain, or while required CI checks are failing. Phase 6 runs only after Phase 5 reports convergence (`activeThreads == 0`) — or after orchestrator Step 9 when `stopBeforeFixPr: true`.

### Phase 0 — Preflight Checks
- Resolve `workingBranch` = `config.project.workingBranch` (default `develop`), `baseBranch` = `config.project.baseBranch`, `gitRemote` = `config.project.gitRemote` (default `origin`).
- Ensure active branch is `{workingBranch}` (checkout only with explicit user consent).
- **Check Commit Status:** Run `git status` to verify commit status and check for uncommitted changes, and check tracking branch status to see if the local branch is ahead or behind the remote branch. If the commit has already been pushed, check the remote commit status (CI checks) using the SCM provider.
- **Pull:** Pull the latest changes from the remote tracking branch via `git pull {gitRemote} {workingBranch}`.
- Auto-detect `main`/`master` when `baseBranch` is unset (`scripts/detect-base-branch.sh`).
- Stop if unexpected dirty files outside the delivery scope.

### Phase 1 — Code-Review Loop (auto-fix)
- Load [code-review](../06-code-review/SKILL.md) vs base branch.
- Fix Critical/Warning up to 3 iterations.
- **Skip entirely** when already reviewed under `spec-to-pr` (Step 6) or `spec-to-pr-lite` (Step 3).

### Phase 2 — Project Verification
- Run `config.json.verification` commands; auto-correct up to 3 times, then stop.

### Phase 3 — Commit & Push
- Under `workflowMode`, delivery commit (plan + result) should already exist — commit only **remaining** ship-scope changes if any.
- Commit with a professional message when needed.
- **Push:** Push local commits to the remote branch via `git push -u {gitRemote} {workingBranch}`.

### Phase 4 — PR Creation (SCM provider)

1. Resolve `providers.scm` per [`config-resolution.md`](../shared/config-resolution.md) from the SCM configuration:
   - Read `providers.active` / `providers.scm` from `.agents/skills/shared/config.json`.
   - If `providers` absent: enabled GitHub → `github`; else enabled ADO → `azure-devops`; else STOP and require explicit `providers.scm`.
   - If `scm` absent: if active is `github`|`azure-devops` → scm=active; if active=`local` → parse `project.repoUrl` host; else STOP.
   - Reject `scm: "local"`.
2. Load the SCM provider skill:
   - `github` → [github-provider](../github-provider/SKILL.md)
   - `azure-devops` → [azure-devops-provider](../azure-devops-provider/SKILL.md)
3. Run provider `validate-auth` when needed; **STOP** on failure (no silent fallback to another provider).
4. **Create PR:** Dispatch provider intent `create-pr` with `--head {workingBranch}` `--base {baseBranch}` (title/body from commit context or flags). Provider reuses an existing open PR for the same head→base when present.
5. Capture PR id and URL from the provider. Do **not** embed raw `gh pr create` / `az repos pr create` recipes here — follow the loaded provider skill.
6. When `stopBeforeFixPr: true` and `shipAction: create-pr`: print PR URL and **STOP** (success) — orchestrator Step 9 owns monitoring and merge.

### Phase 5 — Wait for code-review + goal-fix-pr (Monitor PR)

- **Skip when `stopBeforeFixPr: true`** — orchestrator dispatches [goal-fix-pr](../10-goal-fix-pr/SKILL.md) at Step 9 (same wait → converge → merge order); this skill stops after Phase 4.
- **Wait for code-review feedback first** (do not merge yet):
  1. Mandatory post-push settle window: **300s** (see [GOAL-OVERRIDES.md](GOAL-OVERRIDES.md)) so Agentic Code Review / CI / humans can comment.
  2. Poll SCM: required checks status + `list-threads` (via `providers.scm`). If checks still running, keep watching (provider `merge-pr` / checks watch helpers — do not hardcode platform CLIs here).
  3. If `activeThreads > 0` **or** new review comments arrived: proceed to convergence. If still zero threads after the settle window + one re-collect, still run the goal-fix-pr heartbeat (see goal-fix-pr initial zero-thread case) before treating the PR as clean.
- **Converge:** Dispatch [goal-fix-pr](../10-goal-fix-pr/SKILL.md) until `activeThreads == 0` or `max` iterations (thread list/resolve via `providers.scm` inside `09`/`10`). Timing overrides: [GOAL-OVERRIDES.md](GOAL-OVERRIDES.md).
- **Do not enter Phase 6** while `activeThreads > 0`, escalate stops, or required checks are red. Cap/`escalate` → STOP and report PR URL (no merge).

### Phase 6 — Merge (SCM provider)

1. **Preconditions:** Phase 5 converged (`activeThreads == 0`) **and** required checks are green (or policy allows). If either fails, STOP — do not merge.
2. **Merge at the End:** Using the same loaded SCM provider from Phase 4, dispatch intent `merge-pr` with the captured PR id.
3. The provider waits for checks/policies (GitHub: checks watch; Azure DevOps: policy/status wait) then completes the merge. Do **not** hardcode `gh pr checks` / `gh pr merge` / `az repos pr update` in this skill’s happy path.
4. Skip this phase when `no-merge` is set (PR created and checks/threads handled; stop before merge).
5. Skip when `stopBeforeFixPr: true` (merge handled after orchestrator Step 9 completes goal-fix-pr with zero open issues).

> [!IMPORTANT]
> **Branch Deletion Rule:** Never delete `{workingBranch}` after merging. Keep it for future delivery loops. Do not pass provider flags that delete the configured working branch (e.g. `gh pr merge --delete-branch`).
> **Open-issues rule:** Merge only after code-review wait + `goal-fix-pr` reports no open threads/issues to fix.

---

## Final Output

Print the PR URL returned by the SCM provider (GitHub or Azure DevOps) alone on its own line at the end:

```markdown
**PR:** {provider-returned-url}
```

In `dry-run`, `push-only`, `skip`, or `stopBeforeFixPr` early stop: state outcome clearly (`PR not created` / `PR created — fix-PR deferred to orchestrator`) plus explanation (no placeholder URL).

---

## Dependencies

- **SCM providers:** [github-provider](../github-provider/SKILL.md) · [azure-devops-provider](../azure-devops-provider/SKILL.md) — selected by `providers.scm`
- **Reviewer:** [code-review](../06-code-review/SKILL.md)
- **Convergence:** [goal-fix-pr](../10-goal-fix-pr/SKILL.md)
- **Fixer:** [fix-pr](../09-fix-pr/SKILL.md)
- **Base Detection:** `scripts/detect-base-branch.sh`
- **Artifacts:** [ARTIFACTS.md](../spec-to-pr/ARTIFACTS.md)
