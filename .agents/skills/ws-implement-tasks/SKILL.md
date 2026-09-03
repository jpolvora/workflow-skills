---
name: ws-implement-tasks
description: Task implementation & fix executor — builds planned features following task DAGs or applies surgical defect fixes from code review findings.
version: 0.3.58
disable-model-invocation: true
invocation_names:
  - implement-tasks
  - ws-implement-tasks
---

# ws-implement-tasks

> When this skill is loaded, output "ws-implement-tasks loaded."

Execute the coding and testing steps from the plan (build mode) or correct defects from a review or test report (fix mode). Surgical edits only; match stack patterns; no duplication.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

**Reads:** `{us-dir}/plan.index.json` AC slices via `plan_index.cjs read --ac` when that file exists (do not read a `superseded: true` step-01). Else execution plan (`step-03-*.plan.exec.md`), refined plan, or draft plan; `config.json` for stack layers; consult knowledge via [`tools.md`](../ws-shared/tools.md) **`read-memory`** / [`ws-self-learning`](../ws-self-learning/SKILL.md) § Pre-work (expand tokens per [`tools.md`](../ws-shared/tools.md)).

## Invocation

Standalone:

```
/implement-tasks <plan-path> [mode=build|fix] [findings=<path>]
```

Workflow (ws-spec-to-pr Step 4 build; Step 5 `scoreAndRefine` second pass; Step 6 / lite Step 3 fix → re-review; Step 7 test failures): orchestrator passes `planPath`, `mode`, and optional `findings` path.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `<plan-path>` | required | Execution, refined, or draft plan path |
| `mode` | `build` | `build` or `fix` |
| `findings` | (optional) | Findings report or review comments path |

## Build mode

1. **Load plan** — Parse execution tasks or plan steps; identify files to create/modify and their acceptance criteria.
   - Done when: every task/step has an identified file list and AC.

2. **Consult memory (`read-memory`)** — Via [`ws-self-learning`](../ws-self-learning/SKILL.md) Pre-work for 3–8 modules/paths/keywords in the plan (every enabled backend: local files and/or spec-memo vault); apply Medium+ Solutions before editing; record search keywords, backends queried, and hits.
   - Done when: relevant entries noted or none found; keywords + backends recorded for `step-output.memory_consult`.

3. **Scan codebase** — Locate similar code in the project layers (`config.json`) for style consistency.
   - Done when: a matching pattern is found, or none exists and this is noted.

4. **TDD cycle** — For each task: write **failing tests first** against unmodified code; run them; if they pass, flag a **false-positive** test hazard and do not treat the task as done. Then apply the minimal code correction that turns the tests green. Then check the task ACs and any spec DoR items the task claims to satisfy. Link covering tests for spec `### Negative & Failing Test Scenarios` into `{us-dir}/ac-ledger.json` via `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --negative NS{n} --test {...}` (observed + exit 0). **Standard orch only:** uncovered `negativeScenarios` are scored by `ws-plan-verify` (Step 5) and cap the ledger at 8 (`knownDefect`). **Lite orch:** no verify step runs—treat linking as mandatory implement evidence, not a deferred Step 5 gate.
   - Done when: a red baseline was observed (or a false-positive was recorded), then green after the correction, every planned file matches its AC, and every spec Negative & Failing Test Scenario has an observed ledger link.

5. **Fix the Entire Defect Class** — After Implement (build mode), repo-wide search/grep for the same defect pattern or vulnerability class (not style-only). Fix same-class siblings in scope; list remaining hits or exemptions (path + reason) in `step-output.summary`. Fix mode step 4 widens sibling sweep from modified directories to **repo-wide same pattern** with the same exemption rule.
   - Done when: search performed; remaining hits listed or justified.

6. **Validate** — Run build and unit tests for modified layers from `config.json.verification`.
   - Done when: applicable verification commands exit 0 (or failures are listed in step-output with `status: failed`).

7. **Report** — Return the modified/created file lists and test output details.
   - Done when: the step-output below is populated.

## Fix mode

1. **Intake gaps** — Load findings from `step-06-*.review.md` / `step-06-*.fix.report.md`, `step-07-*.testing.report.md`, or review comment threads.
   - Done when: every finding is enumerated.

2. **Consult memory (`read-memory`)** — Via [`ws-self-learning`](../ws-self-learning/SKILL.md) Pre-work for the defect class / paths (every enabled backend); reuse known Solutions before inventing fixes.
   - Done when: relevant entries noted or none found.



3. **Correct** — Apply minimal, targeted fixes per [ws-karpathy-guidelines](../ws-karpathy-guidelines/SKILL.md).
   - Done when: every enumerated finding has a corresponding edit.

4. **Sweep siblings (repo-wide defect class)** — Search **beyond modified directories** (repo-wide grep of the same defect/pattern) for the same vulnerability/pattern; fix simultaneously or name exemptions (path + reason).
   - Done when: no same-class sibling occurrence remains unfixed without a named exemption.

5. **Anti-regression test** — Write a unit test covering the corrected defect scenario.
   - Done when: each fixed finding has a covering test.

6. **Validate** — Run project build and test suites from `config.json.verification`.
   - Done when: applicable verification commands exit 0 (or failures are listed in step-output with `status: failed`).

## Output (both modes)

Modify the working tree directly; never commit or push.

### step-output (workflow mode)

```yaml
status: success | partial | failed | needs_user
memory_consult:
  keywords: []
  hits: []
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


## ScoreAndRefine second pass

When the orchestrator dispatches this skill for optional polish (Pass 1 score already ≥ `defaults.minVerifyScore` (default 9), `scoreAndRefine` flag): follow [`gates.md`](../ws-shared/gates.md) § Score & Refine gate item 4. Load the **full** Pass 1 diff, every plan task, and every AC — not only flagged task ids. Simplify overengineered implementations that still meet the AC. Delete unused files, tests, methods, and classes **this workflow introduced** that have no remaining code or doc references. Do not delete pre-existing unused code outside `files_touched`. Do not drop ACs. Re-run configured verification.

- Done when: each AC still met; unused workflow-introduced artifacts removed or justified in `summary`; verification green.

## Rules

No commit/push (orch/user owns staging). Surgical scope only. Schema migrations via project CLI only.

## Subagent contract

- Implement only assigned task ids, AC ids, and writable paths (scoreAndRefine second pass: assigned set is the full Pass 1 `files_touched` unless Option 3 named a subset). Prefer `plan.index.json` slices over a full superseded plan.
- Consult injected memory before mutation.
- Run the named configured verification commands after each task batch.
- Never write workflow state or ledger files; return structured evidence to the orchestrator.
- Report exact touched files, memory consult, checks, and remaining gaps.
- After step finish, orch persists `{us-dir}/handoff/step-{NN}.json`.
