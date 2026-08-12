# step-07-workflow-bootstrap-feature-branch.testing.plan.md

slug: workflow-bootstrap-feature-branch
skill: ws-testing
status: planned
skipTesting: false
skip-browser: true
skipMutationTesting: true

## 0. Scope

Pre-PR testing for the Feature branch gate (shared bootstrap 5b + workflow-mode `ws-ship-pr` head). Test surface is markdown-contract Node greps in `test/test-feature-branch-gate.js` (AC1–AC11). No live git E2E, no browser/UI, no DB, no API. Mutation skipped per `defaults.skipMutationTesting: true` and empty `verification.mutationTest`.

Caveat: full `npm run test` includes `test/test-install.js` (Phase 0b / tree verify). A concurrent session is editing `ws-configure-project/**`. Do not treat Phase 0b / install-suite failure as this feature failing. Primary gate for this Step 7 is `node test/test-feature-branch-gate.js`.

## 1. Unit & coverage commands

| Area | Command | Source |
|------|---------|--------|
| Full package suite | `npm run test` | `config.json` → `verification.backendTest` |
| Focused feature contracts | `node test/test-feature-branch-gate.js` | Plan §5 / T6; wired in `package.json` `tests` |
| Other Node contracts (no install) | `test-quality-gates.js`, `test-memory-formatting.js`, `test-autoload-configure.js`, `test-configure-autoconfig.js`, `test-delivery-commit-artifacts.js`, `test-ws-doctor.js`, `test-ws-audit.js`, `test-infer-human-timing.js` | `package.json` `tests` chain minus `test-install.js` |
| Install / Phase 0b | `node test/test-install.js --local` | **Skip this run** — concurrent tree edits on `ws-configure-project/**` |
| Frontend | n/a | `verification.frontendTest` empty |
| Build | n/a | `verification.backendBuild` / `frontendBuild` empty |

Coverage notes: no separate coverage runner configured. Treat feature-branch-gate exit code + AC1–AC11 assertion count as the quality signal. Gaps vs changed files: git-mutation behavior is protocol in `setup.md`, not a live orch E2E in v1 (accepted in plan §5).

## 2. Target hosts / credentials / DB

| Item | Plan |
|------|------|
| apiHost / devHost | Not applicable — skill-prose / Node harness, no HTTP surface |
| Credentials | None |
| DB seeds / rollback | Unnecessary — no database |

## 3. API contracts / RBAC / tenancy

Not applicable (no API endpoints, no tenancy). Skip with reason recorded in report.

## 4. Integration / E2E

| Path | Plan |
|------|------|
| Feature-branch-gate contracts | `node test/test-feature-branch-gate.js` (AC1–AC11 grep) |
| Sibling Node contracts | Run except `test-install` |
| Installer + integrity + Phase 0b | **Skip / blocked** by concurrent `ws-configure-project/**` tree |
| UI / browser | **Skip** — no browser/UI surface; orch `skip-browser` |

## 5. Feature-quality AC checklist (observable)

| AC | Observable check in this Step 7 |
|----|----------------------------------|
| AC1 | `testGateThreeChoicesAndHs1`: three choices, recommended rule, HS-1, 5b after Identity / before Baseline, `gates.md` new-start stay row |
| AC2 | `testBaseBranchResolution`: `project.baseBranch` + `detect-base-branch.sh`; no master-only hardcode |
| AC3 | `testCreateFromCurrentRecipe`: `git checkout -b` from HEAD, `feat/{slug}`, `state.branch` before step 6, `from-current` |
| AC4 | `testCreateFromBaseAndDirtyStop`: fetch-or-local base, dirty STOP stash / from-current / cancel, no `reset --hard` |
| AC5 | `testStayAndDetached`: stay = no create/switch; detached HEAD cannot stay |
| AC6 | `testExistingFeatSlug`: checkout-existing / different name / stay / cancel; no reset / `-D` |
| AC7 | `testResumeSkipAndMismatch`: resume skips 5b; mismatch STOP; `gates.md` resume row; auto checkout log |
| AC8 | `testAutoModeStayAndDryRun`: auto stay + log; dryRun no ref mutation |
| AC9 | `testShipPrWorkflowHead`: workflow-mode `shipHead` = `state.branch`; standalone `workingBranch`; no rewrite; skip pull when no upstream |
| AC10 | `testSharedSetupNoOrchFork`: both orchs load `setup.md`; no forked gate copy; banner `branch` / `baseBranch` |
| AC11 | `testProtectedStayWarning`: protected set + stay warning + recommend option 2 |

## 6. Defect thresholds

| Metric | Pass if |
|--------|---------|
| `node test/test-feature-branch-gate.js` | exit 0, 0 failures |
| Other Node contracts (except install) | exit 0 when run; record if known |
| `npm run test` / install / Phase 0b | **not required this run** (concurrent tree caveat; do not fail this feature) |
| Mutation | skipped (not fail) |
| Browser | skipped (not fail) |

## 7. Mutation

**status: skipped** (planned)

Reasons (any one sufficient):
- `defaults.skipMutationTesting: true`
- `verification.mutationTest` empty/unset

No Mutation section execution. Do not fail Step 7 for skip.

## 8. Accessibility / contrast

No form UI / alert indicators in scope — skip with note in report.
