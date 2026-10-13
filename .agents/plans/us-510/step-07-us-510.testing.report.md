---
step: 7
slug: us-510
workflowId: us-510-20261013T033129Z
status: completed
startedAt: "2026-10-13T03:40:03.714Z"
endedAt: "2026-10-13T03:40:03.714Z"
acRefs: []
---
# Testing Report — us-510 (Step 7)

**Baseline:** `66175d9c` · **Product commit:** `f7284f01` · **Branch:** develop
**Test surface:** Node 22 (`node --version` → `v22.22.2`); no browser surface for this change.

## Executed suites

| # | Command | Exit | Observed result |
|---|---------|------|-----------------|
| 1 | `node --check .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | 0 | syntax clean |
| 2 | `node test/test-state-bootstrap-init.js` | 0 | `test-state-bootstrap-init: ok` (new module) |
| 3 | `node test/test-state-bootstrap.js` | 0 | `test-state-bootstrap: ok` (us-506 anchor, updated) |
| 4 | `node test/test-workflow-state-contract.js` | 0 | pass |
| 5 | `node test/test-update-state-yaml.js` | 0 | pass |
| 6 | `node test/test-run-state-integrity.js` | 0 | pass |
| 7 | `node test/test-script-ux-golden-path.js` | 0 | pass |
| 8 | `node test/test-resume-gate.js` | 0 | pass |
| 9 | `node test/test-bootstrap-start.js` | 0 | pass |
| 10 | `node test/test-liveness-checkpoints.js` | 0 | pass |
| 11 | `node test/test-context-budget.js` | 0 | `test-context-budget: ok` |
| 12 | Full local suite (165 entries, `local` + `harnessEfficiency`) | 0 | **165/165 pass, 0 failing** |
| 13 | `node test/test-harness-clean.js` | 0 | 0 findings |
| 14 | `npm run verify-integrity` | 0 | `matches tree (v0.5.45)` |

Suite driver: `test/run-tests.cjs` runs the ordered list from `test/test-suites.json`.
The new module is registered under `harnessEfficiency` (entry 373 block), which is
appended to both the local and remote runs.

## Documented flake

`test/test-subagent-dispatch.js` (case 8, "Runner timeout kills the child") asserts a
child writes a mark before a **400 ms** kill window. Under the sequential suite it
occasionally loses that race:

- Under full-suite load: `AssertionError: child started before the kill` (`npm run tests`).
- In isolation: **pass**.
- On a pristine worktree at the merge-base `66175d9c` detached HEAD: **pass**.
- In the retrying full-suite run: **pass** (the suite then reported 165/165, 0 failing).

Verdict: environment/timing, not caused by this change (the diff does not touch
subagent dispatch). Recorded for honesty rather than suppressed.

## Fault-injection cross-check

Step 6b ran one injected fault per critical AC on a scratch worktree (replay window,
partial-pair guard, baseline validation, rollback). All four faults were **detected**
by the new module; the runtime was restored and the module returned green. Detail:
[`step-05b-us-510.fresh-verify.md`](step-05b-us-510.fresh-verify.md).

## Coverage judgment

| Layer | Coverage |
|-------|----------|
| Refusal matrix (AC9–AC16) | 1 assertion per rule; each proven by a fault injection or a dedicated case |
| Creation + index + validator (AC1–AC7) | creation, result JSON, index hash match, validator exit 0, repo-relative paths |
| Docs + help (AC17, AC18) | help assertions on both wrappers; canonical section in `setup.md` |
| Stack invariants (AC19, AC21) | `.py` scan = 0; no drive-letter path in output |
| Regression | six state/UX anchors + the full local suite |

No skipped tests. `verification.backendTest` (`npm run tests`) observed exit 0 in the
retrying full-suite run and is recorded as an observed alias result in the ledger.

## Verdict

Testing complete; no defect. Advance to Step 8.
