---
step: 2
slug: us-506
workflowId: uswf-us-506-20261012T212609Z
status: completed
startedAt: "2026-10-12T21:27:11.015Z"
endedAt: "2026-10-12T21:27:11.015Z"
acRefs: []
---
# Refined Plan — us-506

Refinement of `step-01-us-506.plan.md` after the Step 2 interview. The approach
is unchanged; the refinements below are the folded gaps.

## Refined implementation

1. `performInit({ pipeline, maxStep, labels }, stateFile, options)` in
   `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`:
   - create-only guard (AC6) before any write;
   - identity from `--workflow-id` / `--slug` (fallback: state file name / run
     directory) plus the required `step-00-{slug}.spec.md` (AC2, AC7);
   - seed `stateVersion: 3`, `revision: 0`, `status: active`, `currentStep: 0`,
     empty `completedSteps` / `skippedSteps` (AC3);
   - fold `ac-ledger.json` when present;
   - `syncStateDualWrite` then `refreshPlansIndexForState` then `validateSnapshot`
     (AC1, AC4, AC5);
   - `dryRun` performs no writes.
2. `runUpdateCli` accepts `init` and dispatches to `performInit`; help text
   updated. Both wrappers inherit it (AC13).
3. `performUpdate` absent-state catch appends the bootstrap remediation naming
   `update_state.cjs init` (AC9).
4. `runValidateCli` catch: append `; HS-5` when `preAdvanceStep !== null`,
   pipeline is `standard`, and either the target is 4 or the failure is an
   absent state file; name the resolved missing state path (AC8).
5. Docs: `setup.md` Identity bootstrap contract + no hand-write; `gates.md`
   golden-path Step 0 row; `STEP-DISPATCH.md` Step 0 ordering + autoMode HS-5.
6. `test/test-state-bootstrap.js` covers AC1-AC9, AC13, AC16; registered in
   `test/test-suites.json`.

## Refined AC map

AC1-AC7 → `test-state-bootstrap.js` creation/guard/missing-input blocks;
AC8/AC9 → the absent-state validator/updater blocks; AC10/AC11 → contract text;
AC12/AC18 → docs; AC13 → lite-wrapper block; AC14/AC15 → static invariants;
AC16 → telemetry block; AC17 → `test-suites.json`.

## Risk

Low. Additive operation on the existing sanctioned writer; no existing operation
semantics change. The only behavioral change to existing paths is the absent-state
message suffix (AC9) and the absent-state HS-5 label (AC8), both additive.
