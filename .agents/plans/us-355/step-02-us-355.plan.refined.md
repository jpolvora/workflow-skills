# Implementation Plan — us-355: Step 3/Step 4 completion contracts + monitor detection flags

- slug: us-355 | spec: `.agents/specs/0101-us-355.spec.md` | branch: `feature/us-355` | base: `main`
- pipeline: standard | execMode: sequential (`defaults.enableDag: false`)

## 1. Goal

Make Step 3 exec-artifact and Step 4 filesTouched completion rules unambiguous and
machine-enforced, and give the read-only monitor named flags plus a compat rule so
historical sequential runs do not flood.

## 2. Plan-owned decision (per spec Assumptions row 1, with evidence)

**Signal 1 (Step 3 exec artifact): definition-side.** Sequential mode intentionally
omits the file; the artifact stays optional in sequential mode.

Evidence (both run kinds + contract + tests):

- `STEP-DISPATCH.md` Step 3 row: enableDag false → do not dispatch, write no
  stubs, `finish --status skipped --reason dag-disabled`.
- `ARTIFACTS.md` advance-to-4 row + step-ownership table: sequential skips Step 3,
  no stubs written; exec files required only when enableDag is true.
- `workflow_state.cjs` `requiredAdvanceArtifacts`: `next === 4 && skippedReason(3)
  === 'dag-disabled'` waives the exec file; step-coordinator reuses that oracle.
- Existing tests encode the skip as designed behavior: `test-enable-dag.js`
  (skip + no-dispatch wording), `test-step-coordinator.js` (dag-disabled waives
  plan.exec), `test-workflow-state-contract.js` (pre-advance 4 accepts the skip),
  `test-artifact-economy.js` (sequential dag skipReason).
- Counter-evidence weighed: `write_sequential_dag.cjs` exists and `ws-plan-to-tasks`
  SKILL.md says "the orchestrator writes the sequential stub" — contradicts the
  dispatch table; one sibling run hand-wrote an exec stub in sequential mode.
  Resolution: the dispatch table + state machine + tests agree (skip, no stubs);
  the SKILL sentence is drift and is corrected below. Requiring stubs everywhere
  would rewrite the coordinator waiver and a wall of contract tests for zero
  behavioral gain — rejected as non-surgical.

What changes for Signal 1 (harden the definition-side):

- `ws-plan-to-tasks` SKILL.md Invocation: replace the stub sentence with the
  dispatch truth (enableDag false → Step 3 finishes skipped `dag-disabled`, no
  stubs written). Keeps the `defaults.enableDag` / dispatched-only-when-true
  phrases the enable-dag test asserts.
- `workflow_state.cjs` `finish --step 3 --status completed` (standard): fail
  closed unless `step-03-<slug>.plan.exec.md` AND `step-03-<slug>.exec.dag.json`
  exist on disk (precedent: Step 2 finish already requires its artifacts). Skipped
  finishes are unaffected, so sequential flow is unchanged.
- `workflow_state.cjs` `finish --status skipped`: remove the step from
  `completedSteps` (keep `stepStatus` + `currentStep` advance). Root cause of
  "Step 3 is marked completed": every skipped finish was also recorded completed.
  No existing test asserts the dual listing (verified by grep over
  `test-workflow-state-contract.js` / `test-artifact-stamp-status.js`).
- Monitor `expectedArtifacts`: do not expect the exec file when Step 3 is
  skipped `dag-disabled` (grandfathered shape); expect it when Step 3 is
  completed without a skip record. Missing file on a true completion emits the
  new named code `missing-exec-artifact` (critical) instead of the generic
  `missing-artifact`.

**Signal 2 (Step 4 empty filesTouched): contract-side (stricter), per spec Notes
preference; no contrary evidence found** (nothing in the state machine, dispatch
table, or tests blesses empty handoffs on completed mutating steps):

- `workflow_state.cjs` `finish --step 4 --status completed` (standard): fail
  closed when normalized created+modified+deleted are all empty, unless an
  explicit no-op declaration `--noop "<reason>"` is passed. The declaration is
  recorded on the telemetry finish event (`noop` field) for audit.
- Monitor `empty-files-touched`: still warns on completed mutating finishes with
  no touched files, but stays silent when the event carries a `noop` declaration
  (in addition to the existing skip-reason suppression).
- `ws-implement-tasks` SKILL.md Report section: document the no-op declaration
  (genuinely-nothing-changed builds report it; orchestrator passes it as
  `finish --noop`).

**Compat rule (AC4):** a `skipped: dag-disabled` Step 3 record (with or without
the historical dual completed listing) classifies the run as grandfathered — the
monitor raises no exec-artifact flag for it. A `completed` Step 3 with no skip
record and no artifact on disk is a violation (`missing-exec-artifact`).

## 3. Touchpoints (surgical file list)

| # | File | Change |
|---|------|--------|
| 1 | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | Step 3 completed requires both exec files; Step 4 completed requires touched files or `--noop`; skipped finish drops step from `completedSteps`; telemetry finish event carries `noop`; usage text documents `--noop` |
| 2 | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | Skip-aware exec expectation; `missing-exec-artifact` code; `noop`-aware `empty-files-touched` |
| 3 | `.agents/skills/ws-monitor/SKILL.md` | Signal map: `missing-exec-artifact` row; no-op carve-out + compat note on `empty-files-touched` |
| 4 | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Step 3 row: completed-requires-artifacts pointer; Step 4 row: filesTouched-or-`--noop` pointer (keep all `dag-disabled` / no-dispatch phrases) |
| 5 | `.agents/skills/ws-spec-to-pr/ARTIFACTS.md` | Advance-to-4 row: completed-Step-3 file requirement note |
| 6 | `.agents/skills/ws-plan-to-tasks/SKILL.md` | Fix sequential-stub sentence to skip/no-stubs truth |
| 7 | `.agents/skills/ws-implement-tasks/SKILL.md` | Report section: explicit no-op declaration contract |
| 8 | `test/test-step-completion-contracts.js` (new) | AC1–AC4 executable assertions (section 6) |
| 9 | `package.json` | Register new test in `tests:harness-efficiency` |
| 10 | `README.md` / `docs/index.html` | Only if an existing section documents these contracts (checked in Step 4; none expected at this granularity) |

Out of scope (per spec): backfilling historical artifacts, DAG exec-group
semantics, provider/SCM, dispatch-turn mechanics (sibling specs own those).

Sibling coordination note: us-353/us-354-family specs own worker-turn and
dispatch failure modes; this plan decides only the artifact/handoff completion
semantics so rulings stay compatible (skip stays legal, completion needs
evidence).

## 4. Open Questions

None — the require-vs-optional decision is made above with evidence from both
run kinds (sequential skip design vs DAG completion), satisfying spec DoR
"Zero open blockers".

## 5. Negative scenarios (must stay red/green as specified)

- NS1 (spec): Step 3 `completed` without the exec artifact (when required) fails
  the contract test — `finish --step 3 --status completed` exits non-zero with
  both files absent; green with both present.
- NS2 (spec): mutating Step 4 `completed` with empty filesTouched and no no-op
  declaration fails — exits non-zero; green with `--noop` or real files.
- NS3 (spec): monitor against the violation fixture shapes raises
  `missing-exec-artifact` + `empty-files-touched`.
- NS4 (spec): monitor against the compat fixture (skipped `dag-disabled`, no
  artifact) raises neither flag.

## 6. Verification

- New: `node test/test-step-completion-contracts.js` — state-machine probes
  (AC1/AC2 incl. red-before-fix shapes) + monitor `classifyWorkflow` fixtures
  (AC3 both flags, AC4 compat silence).
- Regression: `test-workflow-state-contract.js`, `test-enable-dag.js`,
  `test-ws-monitor.js`, `test-step-coordinator.js`, `test-artifact-stamp-status.js`,
  `test-artifact-economy.js`, `test-doc-sync.js`, `test-harness-clean.js`,
  integrity `generate-integrity` + `verify-integrity`.
- `npm run test` (touched areas minimum; full suite if time allows) before ship.
- Self-check: Step 5 report scores implementation vs ACs, advance only at
  `defaults.minVerifyScore` (9).

## 7. Telemetry (spec DoR observation)

- Violation flags are named snapshot codes with evidence paths:
  `missing-exec-artifact` (critical, evidence: expected exec path),
  `empty-files-touched` (warning, evidence: none — telemetry shape itself).
- No-op declarations are auditable: telemetry finish events carry
  `noop: "<reason>" | null`.
- Monitor stays read-only: flags derive from state + directory listing +
  telemetry; no marker writes into observed runs.
- Run evidence cited by file name + signal class only (no session contents).

## 8. Interview amendments (Step 2 verdict)

- A1: pre-implementation sweep — grep `test/` for `finish` runs with
  `--step 3` / `--step 4` + `--status completed`; classify each as affected
  (update to the new contract) or unaffected before editing.
- A2: STEP-DISPATCH edits append only; keep test-locked `dag-disabled` /
  no-dispatch sentences byte-stable.
- A3: every carve-out (`--noop`, `dag-disabled` compat) gets a same-batch
  regression assertion in `test-step-completion-contracts.js`.
- A4: skill bodies and monitor comments carry no internal spec/issue numbers.
- A5: ship bumps the release version when the branch version equals the base.
- A6: this run's own Step 3 finishes skipped `dag-disabled` with no stubs.
