---
step: 1
slug: us-510
workflowId: us-510-20261013T033129Z
status: completed
startedAt: "2026-10-13T03:34:33.201Z"
endedAt: "2026-10-13T03:34:33.201Z"
acRefs: []
---
# Implementation Plan — us-510

**Slug:** us-510
**Workflow id:** us-510-20261013T033129Z
**Spec:** `.agents/plans/us-510/step-00-us-510.spec.md`
**Pipeline:** standard (`complex`, `enableDag: true`, DAG exec mode)
**Branch:** develop (shared-head batch) — **baseline:** `66175d9c51cd93c2c13599eca1fa080b50e05ab3`

## 1. Goal

Pin the sanctioned **single-agent state bootstrap** contract on the packaged state
runtime: one documented operation that creates the initial
`{workflow-id}.state.json` + `{workflow-id}.state.md` pair before any step is
dispatched, so an agent driving the steps directly (no subagent orchestration)
reaches the same observable state a dispatched run has.

## 2. Existing baseline to build on (do not re-implement)

us-506 (PR #513) already shipped the create-only `init` operation
(`workflow_state.cjs` `performInit`) reachable through both orchestrator wrappers.
This spec refines that **same** operation. No second state writer is introduced.

## 3. Change surface

| Path | Change |
|------|--------|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | Rewrite `performInit` to the pinned contract; extend `init` + generic help text; harden `atomicWrite` (no temp residue on failure) |
| `.agents/skills/ws-shared/runtime/workflow-state.schema.json` | Document the `branch` property |
| `.agents/skills/ws-shared/runtime/setup.md` | Canonical bootstrap contract (command, pair invariant, replay rule, refusal rules) + ordering after branch/baseline |
| `.agents/skills/ws-shared/runtime/gates.md` | Step 0 boundary row carries the resolved `--branch`/`--baseline` and the replay rule |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Step 0 bootstrap wording (net-zero byte budget) |
| `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md` | Bootstrap recipe in § Automated update |
| `FEATURES.md`, `README.md` | Feature narrative for the refined contract |
| `test/test-state-bootstrap.js` | Update the us-506 anchor to the required flags + replay window |
| `test/test-state-bootstrap-init.js` | **New** module: required flags, replay window, refusal matrix, help, Node-only, repo-relative invariants; registered in `test/test-suites.json` (`harnessEfficiency`) |

## 4. Contract detail (AC1–AC21)

1. **Required explicit inputs (AC2, AC13):** `--slug`, `--workflow-id`, `--branch`, `--baseline`.
   No inference. Missing/empty → usage error. `--branch HEAD` refused. Non-hex
   `--baseline` refused.
2. **Identity shape (AC14, AC15):** slug must equal the plan directory name; workflow
   id must match `{slug}-{YYYYMMDDTHHMMSSZ}[-suffix]`.
3. **Pair + index (AC1, AC3, AC6, AC7):** `syncStateDualWrite` writes `.state.json`
   (SoT) then `.state.md` (render) under `{us-dir}`; `refreshPlansIndexForState`
   adds/updates the row in the same window; result JSON names workflow id, both
   paths, and the resolved index.
4. **Record seed (AC4):** `stateVersion 3`, `revision 0`, `workflowType` from the
   calling wrapper, `status active`, `currentStep 0`, empty `completedSteps` /
   `skippedSteps`, plus `branch` and `baselineCommit`.
5. **Validator clean (AC5):** `validateSnapshot` runs before the success return.
6. **Idempotent replay (AC8):** revision 0 + empty `completedSteps` + non-terminal
   status → no-op; both members byte-identical; exit 0; `idempotentReplay: true`.
7. **Refusals (AC9–AC12, AC16):** revision > 0, non-empty `completedSteps`, terminal
   status, partial pair (missing member named). All validation precedes any write;
   a failed write rolls its own artifacts back.
8. **Discoverability (AC17, AC18):** `init --help` lists the usage line + sample;
   the canonical contract lives in one `setup.md` section mirrored by the help text.
9. **Stack invariants (AC19, AC21):** CommonJS `.cjs`, Node 22, no Python; only
   repo-relative paths in the record and in the emitted result.

## 5. Verification plan

- `node test/test-state-bootstrap.js`, `node test/test-state-bootstrap-init.js`.
- Regression anchors: `test-workflow-state-contract.js`, `test-update-state-yaml.js`,
  `test-run-state-integrity.js`, `test-script-ux-golden-path.js`, `test-resume-gate.js`.
- `npm run tests` (full local suite), `node test/test-harness-clean.js` (0 findings),
  `node test/test-context-budget.js`, `npm run verify-integrity`.
- Live dogfood: bootstrap this run through the new `init` (already done at Step 0)
  and `validate_state.cjs` exits 0.

## 6. Stack & Security Invariants Verification Plan

| Invariant (`stack.id=node-skills-package`) | Check |
|--------------------------------------------|-------|
| Node 22 CommonJS only, no Python | `node --check` on the runtime; AC19 `.py` scan test; harness Phase 0 |
| No host-product coupling | No product names/paths in the change; repo-relative paths only (AC21 test) |
| One sanctioned state writer | Only `workflow_state.cjs` writes state; orchestrator shims stay pass-throughs |
| No secrets / no absolute machine paths in state | AC21 test asserts repo-relative `statePath` and no drive-letter output |
| Runtime residue allowlist | `atomicWrite` cleans its temp file on failure (AC16 test) |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| us-506's create-only test pins superseded semantics | Update `test/test-state-bootstrap.js` in the same change; the replay window is asserted explicitly |
| `STEP-DISPATCH.md` byte budget (was 18 B under cap) | Edit is net-negative |
| Ledger score gate at Step 6 | Link AC→files/tests/commit and score before the gate |
