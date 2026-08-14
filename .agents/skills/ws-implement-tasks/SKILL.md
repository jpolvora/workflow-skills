---
name: ws-implement-tasks
description: Task implementation & fix executor — builds planned features following task DAGs or applies surgical defect fixes from code review findings.
version: 0.3.17
disable-model-invocation: true
invocation_names:
  - implement-tasks
  - ws-implement-tasks
---

# ws-implement-tasks

> When this skill is loaded, output "ws-implement-tasks loaded."

Execute the coding and testing steps from the plan (build mode) or correct defects from a review or test report (fix mode). Surgical edits only; match stack patterns; no duplication.

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

**Reads:** execution plan (`step-03-*.plan.exec.md`), refined plan (`step-02-*.plan.refined.md`), or draft plan (`step-01-*.plan.md`); `config.json` for layer patterns; consult MEMORY via [`ws-self-learning`](../ws-self-learning/SKILL.md) § Pre-work (expand tokens per [`tools.md`](../ws-shared/tools.md)).

## Invocation

Standalone:

```
/implement-tasks <plan-path> [mode=build|fix] [findings=<path>]
```

Workflow (ws-spec-to-pr Step 4 build; Step 6 / lite Step 3 fix → re-review; Step 7 test failures): orchestrator passes `planPath`, `mode`, and optional `findings` path.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<plan-path>` | required | Execution, refined, or draft plan path |
| `mode` | `build` | `build` or `fix` |
| `findings` | (optional) | Findings report or review comments path |

## Build mode

1. **Load plan** — Parse execution tasks or plan steps; identify files to create/modify and their acceptance criteria.
   - Done when: every task/step has an identified file list and AC.

2. **Consult MEMORY** — Via [`ws-self-learning`](../ws-self-learning/SKILL.md) Pre-work for modules/paths/keywords in the plan; apply Medium+ Solutions before editing.
   - Done when: relevant entries noted or none found.

3. **Scan codebase** — Locate similar patterns in the project layers (`config.json`) for style consistency.
   - Done when: a matching pattern is found, or none exists and this is noted.

4. **Implement** — Write minimal, modular code matching the requirements without scope creep.
   - Done when: every planned file is created or modified per its AC.

5. **Validate** — Run build and unit tests for modified layers from `config.json.verification`.
   - Done when: applicable verification commands exit 0 (or failures are listed in step-output with `status: failed`).

6. **Report** — Return the modified/created file lists and test output details.
   - Done when: the step-output below is populated.

## Fix mode

1. **Intake gaps** — Load findings from `step-06-*.review.md` / `step-06-*.fix.report.md`, `step-07-*.testing.report.md`, or review comment threads.
   - Done when: every finding is enumerated.

2. **Consult MEMORY** — Via [`ws-self-learning`](../ws-self-learning/SKILL.md) Pre-work for the defect class / paths; reuse known Solutions before inventing fixes.
   - Done when: relevant entries noted or none found.

3. **Correct** — Apply minimal, targeted fixes per [ws-karpathy-guidelines](../ws-karpathy-guidelines/SKILL.md).
   - Done when: every enumerated finding has a corresponding edit.

4. **Sweep siblings** — Search modified directories for the same defect class and fix simultaneously.
   - Done when: no sibling occurrence of the fixed defect class remains in modified directories.

5. **Anti-regression test** — Write a unit test covering the corrected defect scenario.
   - Done when: each fixed finding has a covering test.

6. **Validate** — Run project build and test suites from `config.json.verification`.
   - Done when: applicable verification commands exit 0 (or failures are listed in step-output with `status: failed`).

## Output (both modes)

Modify the working tree directly; never commit or push.

### step-output (workflow mode)

```yaml
status: success | partial | failed | needs_user
files_touched:
  created: []
  modified: []
  deleted: []
verification:
  files_on_disk: pass | fail
  build: pass | fail | skipped
  tests: pass | fail | skipped
summary: |
  (Summary text of changes and verifications)
```

## Rules

No commit/push (orch/user owns staging). Surgical scope only. Schema migrations via project CLI only.
