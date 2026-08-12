# step-07-workflow-bootstrap-feature-branch.testing.report.md

slug: workflow-bootstrap-feature-branch
skill: ws-testing
status: **passed**
executed: 2026-08-12 (session Step 7; skip-browser)
plan: `.agents/plans/workflow-bootstrap-feature-branch/step-07-workflow-bootstrap-feature-branch.testing.plan.md`

## Summary

Focused `node test/test-feature-branch-gate.js` exited **0** (AC1–AC11, 0 failures). Sibling Node contract suites (except install) also exited **0**. Install suite / full `npm run test` **skipped** (concurrent other session editing `ws-configure-project/**`; Phase 0b / tree verify would be unreliable). Browser skipped (no UI). Mutation skipped (`defaults.skipMutationTesting: true`, empty `verification.mutationTest`). No code fixes in this step.

## 1. Base build / verification

| Check | Command | Result |
|-------|---------|--------|
| Backend test (full) | `npm run test` (`pretests` pack + `tests` incl. install) | **skipped / blocked** — concurrent tree on `ws-configure-project/**`; do not treat as this feature failing |
| Focused feature contracts | `node test/test-feature-branch-gate.js` | **pass** (exit 0) |
| Backend/frontend build | unset | skipped |
| Frontend test | unset | skipped |

## 2. Unit / package tests

### Feature-branch-gate (`node test/test-feature-branch-gate.js`) — **pass, exit 0**

| AC | Case | Result |
|----|------|--------|
| AC1 | `testGateThreeChoicesAndHs1` (5 asserts) | pass |
| AC2 | `testBaseBranchResolution` (4 asserts) | pass |
| AC3 | `testCreateFromCurrentRecipe` (4 asserts) | pass |
| AC4 | `testCreateFromBaseAndDirtyStop` (5 asserts) | pass |
| AC5 | `testStayAndDetached` (2 asserts) | pass |
| AC6 | `testExistingFeatSlug` (3 asserts) | pass |
| AC7 | `testResumeSkipAndMismatch` (4 asserts) | pass |
| AC8 | `testAutoModeStayAndDryRun` (2 asserts) | pass |
| AC9 | `testShipPrWorkflowHead` (4 asserts, incl. skip-pull) | pass |
| AC10 | `testSharedSetupNoOrchFork` (5 asserts) | pass |
| AC11 | `testProtectedStayWarning` (3 asserts) | pass |

Stdout close: `All feature-branch-gate tests passed.`

### Other Node contracts (install excluded)

| Suite | Result | Notes |
|-------|--------|-------|
| `test/test-quality-gates.js` | pass (exit 0) | T16 quality gates |
| `test/test-memory-formatting.js` | pass (exit 0) | |
| `test/test-autoload-configure.js` | pass (exit 0) | Autoload / AC11 configure |
| `test/test-configure-autoconfig.js` | pass (exit 0) | Concurrent session owns this area; suite still green at this snapshot |
| `test/test-delivery-commit-artifacts.js` | pass (exit 0) | |
| `test/test-ws-doctor.js` | pass (exit 0) | |
| `test/test-ws-audit.js` | pass (exit 0) | |
| `test/test-infer-human-timing.js` | pass (exit 0) | |

### Install suite

| Suite | Result | Notes |
|-------|--------|-------|
| `test/test-install.js --local` (Phase 0b / tree verify) | **skipped / blocked** | Concurrent other session editing `ws-configure-project/**`. Not a feature-branch-gate failure. |

**Coverage notes:** No separate coverage/% tool configured. Feature contracts cover AC1–AC11 as grep against skill prose. Live git mutation / orch E2E remains out of v1 (plan §5); not a Step 7 fail under defect thresholds.

## 3. DB seeds

Unnecessary — no database. **skipped**

## 4. API / integration contracts

Not applicable — no HTTP API. Sibling Node contracts recorded above. Installer/integrity integration **not** re-run this step (concurrent tree caveat). **skipped (N/A for API; install blocked)**

## 5. UI / browser / E2E

**skipped** — no browser/UI surface; orch skip-browser.

## 6. Mutation

| Field | Value |
|-------|--------|
| status | **skipped** |
| reason | `defaults.skipMutationTesting: true`; `verification.mutationTest` empty/unset |
| command | n/a |
| score | n/a |

Does not fail Step 7.

## 7. Accessibility / contrast

**skipped** — no form validation UI / alert indicators in scope.

## 8. Feature-quality AC (Step 7 observables)

| AC | Step 7 evidence | Verdict |
|----|-----------------|---------|
| AC1 | three choices, recommended rule, HS-1, 5b order, gates.md stay row | pass |
| AC2 | `project.baseBranch` + `detect-base-branch.sh`; master-only forbidden | pass |
| AC3 | `checkout -b` from HEAD; `feat/{slug}`; state before baseline | pass |
| AC4 | fetch/local base; dirty STOP; no `reset --hard` | pass |
| AC5 | stay no-op; detached invalid | pass |
| AC6 | existing feat offers; no reset / `-D` | pass |
| AC7 | resume skip 5b; mismatch STOP; auto checkout log | pass |
| AC8 | auto stay + log; dryRun no mutation | pass |
| AC9 | `shipHead` = `state.branch`; standalone `workingBranch`; skip pull no upstream | pass |
| AC10 | both orchs load setup.md; no fork; banner rows | pass |
| AC11 | protected set + stay warning + recommend option 2 | pass |

## Defect threshold verdict

| Metric | Required | Actual |
|--------|----------|--------|
| `node test/test-feature-branch-gate.js` | exit 0 | **pass** (exit 0) |
| Other Node contracts (except install) | record if known | **pass** (all exit 0) |
| Install / `npm run test` Phase 0b | not required this run | **skipped / blocked** (concurrent `ws-configure-project/**`) |
| Mutation | skipped OK | skipped |
| Browser | skipped OK | skipped |

**Final Step 7 status: success (passed)** — feature-branch-gate green; install-suite caveat does not fail this feature.
