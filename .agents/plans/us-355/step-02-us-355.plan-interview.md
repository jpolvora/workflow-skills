# Plan Interview — us-355 (Step 2, memory-forced)

Interview mode: worker self-audit against the plan (no user gate available in
batch context; `check_memory_conflict.py` exit 2 recorded trap titles and
`force_interview: true`, so this interview runs instead of skipping).
Forcing traps honored below: dag-disabled skip posture, dispatch-prose
test-locked phrasing, carve-out regression pins, canonical-contract wording,
dashed-flag normalization, portable prose, ship version bump.

## Q1: Signal 1 — require the exec artifact, or declare it optional in sequential?

Options considered:
1. Require `step-03-*.plan.exec.md` (+ dag.json) before `completed` in all
   modes — rejected: contradicts the dispatch table, ARTIFACTS.md advance rows,
   `requiredAdvanceArtifacts` waiver, coordinator oracle, and 10+ existing
   contract-test assertions that encode skip-with-`dag-disabled` as designed
   behavior. Blast radius is non-surgical.
2. Definition-side (chosen): artifact optional in sequential by design; harden
   with fail-closed `finish --step 3 completed` (both files required),
   truthful skip transitions (skip drops the step from `completedSteps`),
   skip-aware monitor with named `missing-exec-artifact`, and compat rule
   (skip record = grandfathered).

Finding: option 2. Directly supported by the memory trap "dag-disabled means
skip step 3, never dispatch plus stub". This run's own Step 3 will finish
skipped `dag-disabled` with no stubs.

## Q2: No-op declaration shape — reuse `--reason` or new `--noop`?

`--reason` is validated against `SKIP_REASONS` and only meaningful with
`--status skipped`. Reusing it for completed finishes would blur skip vs
completed semantics the spec wants separated. Chosen: new single-word
`--noop "<reason>"` (dashed-flag trap: single word needs no camelCase mapping;
the new test asserts the parsed value lands on the telemetry event). Empty or
absent `--noop` with empty touched files fails closed.

## Q3: Is removing skipped steps from `completedSteps` safe?

Verified by grep: no test asserts a skipped step appears in `completedSteps`
(`test-workflow-state-contract.js`, `test-artifact-stamp-status.js` only assert
`stepStatus`, stamps, and skip records). `stepStatus` still records `skipped`,
`currentStep` still advances, internal substeps (`scoreAndRefine`, `fixPrPlan`,
`fixPrExec`) are untouched by the change. Coordinator close-detection falls back
to `currentStep` advancement. Safe.

## Q4: Section 6 Stack & Security Invariants check (touched framework boundaries)

Touched boundaries: workflow state machine (`workflow_state.cjs` finish gates),
monitor snapshot (read-only detection), skill prose (agent behavior contracts),
one new test file. No network, auth, storage, migration, or secret surface.
`.ws/STACK.md` defines a Node skill package — changes are pure Node + prose, no
new runtime dependency. Telemetry gains one nullable string field (`noop`);
existing consumers ignore unknown fields (additive). No new external input
surface: `--noop` consumes step outputs, not user free input.

## Q5: Blast radius — which existing tests could go stale?

Fail-closed finishes can redden tests that finish Step 3 completed without both
files or Step 4 completed with empty touched files (stale-expectations trap).
Pre-implementation sweep required: grep `test/` for `finish` invocations with
`--step 3` / `--step 4` + `--status completed` and classify each as
genuinely-affected (update to new contract) vs unaffected (already ships files
or expects failure). Regression suites to re-run: `test-workflow-state-contract`,
`test-enable-dag`, `test-ws-monitor`, `test-step-coordinator`,
`test-artifact-stamp-status`, `test-artifact-economy`, `test-doc-sync`,
`test-harness-clean`, integrity generate + verify.

## Q6: Doc-sync and prose constraints

- Keep test-locked phrasing in STEP-DISPATCH (`dag-disabled`, no-dispatch
  sentences the enable-dag test asserts) — append, do not rewrite.
- ARTIFACTS.md is the canonical contract file: new wording there plus a
  same-batch test pin (new test asserts the advance/waiver table behavior).
- Skill bodies and monitor comments: no internal spec/issue numbers, file names
  and signal classes only (portable-prose + anonymization traps).
- Carve-outs (`--noop`, `dag-disabled` compat) each get same-batch regression
  assertions in the new test.
- Ship: bump the release version when the branch version equals the base.

## Verdict: APPROVED with amendments — proceed to Step 3 (skip, dag-disabled)

Refined plan: `step-02-us-355.plan.refined.md` (plan §2 decision stands; adds
the Q5 pre-implementation sweep, Q6 prose pins, and version-bump check).
