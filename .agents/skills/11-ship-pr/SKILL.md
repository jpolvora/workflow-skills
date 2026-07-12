---
name: 11-ship-pr
description: End-to-end delivery — verify branch state, commit, push, create PR develop → main/master, run goal-fix-pr loops, and merge.
version: 1.1
disable-model-invocation: true
---

# ship-pr

Responsible for shipping the completed workflow from the development branch (`develop`) to the production base branch (`main` or `master`). It automates validation, branch push, PR creation, thread convergence monitoring, and final merging.

---

## Invocation

```
/ship-pr [commit-title] [base=<branch>] [dry-run] [no-merge] [max <n>]
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `commit-title` | String | (optional) | Custom commit message for any uncommitted changes. |
| `base=<branch>` | String | `main` or `master` | Target merge branch. Auto-detected using `detect-base-branch.sh` if omitted. |
| `dry-run` | Flag | `false` | Run checks and simulate creation/merging without staging commits, pushing code, or triggering real PR API requests. |
| `no-merge` | Flag | `false` | Complete branch updates and PR creation/checks, but stop before final merge. |
| `max <n>` | Integer | `10` | Iteration limit for the underlying `goal-fix-pr` thread convergence loop. |

Before executing, restate the parsed parameters: **commit title**, **target base branch**, **mode** (dry-run/no-merge), and **max iterations**.

---

## us-workflow Integration (Step 13)

When running as **Step 13** of the `us-workflow` orchestrator (triggered when the `--full` flag is active):

1. Steps 0–12 are already completed, meaning the implementation has been locally reviewed, verified, and structured into a delivery commit.
2. The orchestrator prompts the user for approval:
   - **Create PR and start monitoring:** executes push, creates PR, starts convergence monitoring, and merges.
   - **Push only (no PR):** pushes `develop` to remote, but stops there.
   - **Skip (done):** completes the step without pushing or PR updates.
3. The code-review and auto-fix stages within the ship-pr pipeline are **skipped** during workflow execution because Step 9 (code-review) and Step 10 (implement-tasks) have already performed them.

---

## Pipeline Execution

The pipeline executes sequentially through the following phases:

```
0. Preflight → 1. Code-Review Loop → 2. Verification → 3. Commit & Push → 4. PR Creation → 5. goal-fix-pr loop → 6. Merge
```

### Phase 0 — Preflight Checks
- Ensure the active branch is `develop`.
- Perform a `git pull origin develop` to pull down remote updates.
- Auto-detect the target base branch (`main` or `master`) using `detect-base-branch.sh`.
- Check for port conflicts or dirty configurations in `config.json`. Stop and escalate if unexpected files are modified.

### Phase 1 — Code-Review Loop (auto-fix)
- Load [code-review](../06-code-review/SKILL.md) to score modified files relative to the base branch.
- If findings exist, execute surgical fixes for Critical/Warning items (up to 3 iterations).
- Skip if already reviewed under `us-workflow`.

### Phase 2 — Project Verification
- Run verification tests defined in `config.json.verification`. If any test fails, attempt automated correction (up to 3 times before stopping).

### Phase 3 — Commit & Push
- Commit any local styling, configuration, or index updates using a clean, professional description (e.g. `docs(catalog): update skills index`).
- Push local branch commits using `git push -u origin develop`.

### Phase 4 — PR Creation
- Check if a Pull Request from `develop` to the base branch is already open.
- If not, create it: `gh pr create --head develop --base "$SHIP_PR_BASE"`.
- Retrieve the PR number and URL.

### Phase 5 — goal-fix-pr Convergence Loop
- Wait 5 minutes (300s) post-push to allow CI checks and initial reviewer feedback to register.
- Dispatch the [goal-fix-pr](../09-goal-fix-pr/SKILL.md) loop to continuously address, fix, and resolve feedback threads until `activeThreads == 0` (or `max` iterations are exhausted).

### Phase 6 — Merge
- Verify checks pass: `gh pr checks --watch`.
- Merge the Pull Request: `gh pr merge --merge`.

> [!IMPORTANT]
> **Branch Deletion Rule:** Never delete or request deletion of the source branch (`develop`) after merging, regardless of branch name or target base. The branch must remain active for future development loops.

---

## Final Output

Every execution of `ship-pr` must output the Pull Request URL on its own line at the end of the summary:

```markdown
**PR:** https://github.com/<owner>/<repo>/pull/<PR-NUMBER>
```

In `dry-run` or when stopped early, return `PR not created` with a detailed explanation instead of a placeholder URL.

---

## Dependencies

- **Reviewer:** [code-review](../06-code-review/SKILL.md)
- **Convergence:** [goal-fix-pr](../09-goal-fix-pr/SKILL.md)
- **Fixer:** [fix-pr](../08-fix-pr/SKILL.md)
- **Base Detection:** `scripts/detect-base-branch.sh`
