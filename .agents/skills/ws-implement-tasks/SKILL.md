---
name: ws-implement-tasks
description: Task implementation & fix executor — builds planned features following task DAGs or applies surgical defect fixes from code review findings.
disable-model-invocation: true
invocation_names:
  - implement-tasks
  - ws-implement-tasks
---
# ws-implement-tasks

> When this skill is loaded, output "ws-implement-tasks loaded."

Execute the coding and testing steps from the plan (build mode) or correct defects from a review or test report (fix mode). Surgical edits only; match stack patterns; no duplication.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

**Reads:** `{us-dir}/plan.index.json` AC slices via `plan_index.cjs read --ac` when that file exists (do not read a `superseded: true` step-01). Else execution plan (`step-03-*.plan.exec.md`), refined plan, or draft plan; `config.json` for stack layers; consult knowledge via [`tools.md`](../ws-shared/runtime/tools.md) **`read-memory`** / [`ws-self-learning`](../ws-self-learning/SKILL.md) § Pre-work (expand tokens per [`tools.md`](../ws-shared/runtime/tools.md)).

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

1. **Load plan** — Parse execution tasks or plan steps; identify files to create/modify and their acceptance criteria. When the spec of record or `step-00` copy contains `## Visual References`, **Read** each `ok` image listed (skip PDF) before editing product files.
   - Done when: every task/step has an identified file list and AC.

2. **Consult memory** — Apply the injected MEMORY slice; when standalone, route through [`tools.md`](../ws-shared/runtime/tools.md) **`read-memory`** for 3–8 plan keywords/paths.
   - Done when: relevant entries noted or none found; keywords + backends recorded for `step-output.memory_consult`.

3. **Scan codebase** — Locate similar code in the project layers (`config.json`) for style consistency.
   - Done when: a matching pattern is found, or none exists and this is noted.

4. **TDD cycle** — For each task: write **failing tests first** against unmodified code; run them; if they pass, flag a **false-positive** test hazard and do not treat the task as done. Then apply the minimal code correction that turns the tests green. Then check the task ACs and any spec DoR items the task claims to satisfy. Link covering tests for spec `### Negative & Failing Test Scenarios` into `{us-dir}/ac-ledger.json` via `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --negative NS{n} --test {...}` (observed + exit 0). **Standard orch only:** uncovered `negativeScenarios` are scored by `ws-plan-verify` (Step 5) and cap the ledger at 8 (`knownDefect`). **Lite orch:** no verify step runs—treat linking as mandatory implement evidence, not a deferred Step 5 gate.
   - Done when: a red baseline was observed (or a false-positive was recorded), then green after the correction, every planned file matches its AC, and every spec Negative & Failing Test Scenario has an observed ledger link.

5. **Test Adequacy review** — For each task, after the TDD cycle and before the step handoff, assert the three-way binding and record it in an adequacy record (`{us-dir}/adequacy-<task>.json`, schema v1: `taskId`, `acs`, `bindings` with test + file:line, `litmus` with kind + exit code + evidence, `addedTests`, `orphansRemoved`, `falsePositives`).
   - **Binding map:** every task AC maps to at least one covering test with file:line evidence; every mapped file:line exists and names the test.
   - **Non-shallow litmus:** every mapped test shows its key assertion failing under a wrong implementation — one run per test is enough, never combinatorial. Either a targeted inversion via `node {skillsRoot}/ws-testing/scripts/run_sabotage.cjs` with a caller-authored invert patch, or a documented wrong-code run (stash the fix, run the test, restore) recording test name + exit code. A test whose key assertion survives the wrong-implementation run fails adequacy with the surviving assertion named.
   - **Orphan rule:** every test the task added maps back to a task AC or a spec negative scenario; unmapped tests are removed or remapped before handoff, never shipped as-is. Derive `addedTests` from the task diff (every test name the task added or modified), never from memory.
   - **False-positive rejection:** a test that passes on unmodified code is inadequate immediately — no litmus run required.
   - Validate the record with `node {skillsRoot}/ws-implement-tasks/scripts/check_test_adequacy.cjs --record <record>` (exit 0 adequate, 1 inadequate with named gaps). Link it via `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger {us-dir}/ac-ledger.json --event-id adequacy-<task> --ac <AC...> --adequacy-file <record>` (one `--ac` per covered AC). Tasks failing adequacy return to the TDD cycle and re-enter review until adequate or the workflow-level refine/fix bound triggers Pause — no new loop budget.
   - Done when: every task carries a helper-validated adequate record linked to its ACs, and no orphan or false-positive test remains.

6. **Fix the Entire Defect Class** — After Implement (build mode), repo-wide search/grep for the same defect pattern or vulnerability class (not style-only). Fix same-class siblings in scope; list remaining hits or exemptions (path + reason) in `step-output.summary`. Fix mode step 4 widens sibling sweep from modified directories to **repo-wide same pattern** with the same exemption rule.
   - Done when: search performed; remaining hits listed or justified.

7. **Stack Invariant Scan** — Run deterministic static check `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs` against modified files and the project stack rule pack (`{skillsRoot}/ws-shared/runtime/stacks/`); honor that pack's rules before declaring the task done.
   - Done when: scan exits 0 with zero Critical violations.

8. **Validate** — Before the step handoff, run every configured `config.json` `verification` alias that Step 5 scores (any `*Build`/`*Test`/`*Format` key, e.g. `backendFormat`, `backendBuild`, `backendTest`, `frontendBuild`, `frontendTest`, when non-empty), not only a filtered test for modified classes. A filtered test invocation is extra evidence and does not satisfy `backendTest` or `frontendTest`. For `backendFormat`, run the configured verify command. If it fails, format only files this step created or modified, then re-run. Remaining failures that exist strictly outside workflow `files_touched` are recorded in `step-output` and do not fail the implement step. For test aliases, if a full command fails only in an untouched setup file and a re-run passes with no product edit, report it as an environment flake instead of a failed feature.
   - Done when: applicable full verification commands exit 0 (or residual failures are listed in step-output with `status: failed`, or external format drifts are documented).

9. **Report** — Return the modified/created file lists, adequacy records, and test output details.
   - Done when: the step-output below is populated.
   - When the build genuinely modified nothing (verification-only retry, already-applied change), say so explicitly in `summary` with the reason: the orchestrator records it as an explicit no-op declaration, since a completed build with empty `files_touched` and no declaration withholds completion.

## Fix mode

1. **Intake gaps** — Load findings from `step-06-*.review.md` / `step-06-*.fix.report.md`, `step-07-*.testing.report.md`, or review comment threads.
   - Done when: every finding is enumerated.

2. **Consult memory** — Apply the injected MEMORY slice; when standalone, route through [`tools.md`](../ws-shared/runtime/tools.md) **`read-memory`** for the defect class/paths.
   - Done when: relevant entries noted or none found.

3. **Correct** — Apply minimal, targeted fixes per [ws-senior-developer](../ws-senior-developer/SKILL.md).
   - Done when: every enumerated finding has a corresponding edit.

4. **Sweep siblings (repo-wide defect class)** — Search **beyond modified directories** (repo-wide grep of the same defect/pattern) for the same vulnerability/pattern; fix simultaneously or name exemptions (path + reason).
   - Done when: no same-class sibling occurrence remains unfixed without a named exemption.

5. **Anti-regression test** — Write a unit test covering the corrected defect scenario. Run the same adequacy review as build mode step 5 for each anti-regression test: bind it to the finding-derived AC with file:line evidence, prove it non-shallow with a litmus run (targeted inversion or documented wrong-code run), admit no orphan tests, and validate the record with `node {skillsRoot}/ws-implement-tasks/scripts/check_test_adequacy.cjs --record <record>` before handoff.
   - Done when: each fixed finding has a covering test, and every anti-regression test carries a helper-validated adequate record.

6. **Stack Invariant Scan** — Run `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs` against touched files to ensure fixes maintain framework invariants.
   - Done when: scan exits 0 with zero Critical violations.

7. **Validate** — Run project build and test suites from `config.json.verification`.
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
  stack-invariant-scan: pass | fail
adequacy:
  records: []  # per-task adequacy record paths, each helper-validated adequate and ledger-linked
summary: |
  (Summary text of changes and verifications)
```


## ScoreAndRefine second pass

Follow [`gates.md`](../ws-shared/runtime/gates.md) § Score & Refine gate item 4: load the **full** Pass 1 diff, every plan task, and every AC (not only flagged ids); simplify overengineering that still meets the AC; delete unused artifacts **this workflow introduced** only (nothing outside `files_touched`); Do not drop ACs; re-run configured verification.

- Done when: each AC still met; unused workflow-introduced artifacts removed or justified in `summary`; verification green.

## Guardrails

- Write only assigned task ids, AC ids, and writable paths (DAG: only that task's files). Return exact `files_touched` (created/modified/deleted, repo-relative); never `{plansDir}`.
- No `git add` / `commit` / `push` in any form (`git add -A` / `git add .` included): the orchestrator (or user, standalone) owns staging.
- Surgical scope only; schema migrations via project CLI only. Do not rewrite managed `ws-*` skill files unless the task names that file.
- When the plan requires regression/sabotage coverage, write tests that fail on inverted code — no tautological assertions.
- No handoff with an inadequate or missing adequacy record: every task's record must validate adequate via `check_test_adequacy.cjs` before Report.
- Contract: [`gates.md`](../ws-shared/runtime/gates.md) § Required G2-code save points (no self-commit) · orch: [`PROTOCOLS.md`](../ws-spec-to-pr/PROTOCOLS.md) § Step 4 dispatch.

## Subagent contract

- Implement only assigned task ids, AC ids, and writable paths (scoreAndRefine second pass: assigned set is the full Pass 1 `files_touched` unless Option 3 named a subset). Prefer `plan.index.json` slices over a full superseded plan.
- Consult injected memory before mutation.
- Run the named configured verification commands after each task batch.
- Never write workflow state or ledger files; return structured evidence to the orchestrator.
- Report exact touched files, memory consult, checks, and remaining gaps.
- Handoff: recorded under `state.handoffs` — see [`PROTOCOLS.md`](../ws-spec-to-pr/PROTOCOLS.md) § Base Prompt Prefix.
