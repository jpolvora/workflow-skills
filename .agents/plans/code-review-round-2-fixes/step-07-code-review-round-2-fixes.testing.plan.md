---
step: 7
slug: code-review-round-2-fixes
workflowId: code-review-round-2-fixes
status: planned
---

# Step 7 Testing Plan — code-review-round-2-fixes

## 1. Unit & coverage commands (from `config.json.verification`)

- Full backend chain: `npm run test` (alias `backendTest`; expands to `npm run tests` + `tests:harness-efficiency`, ~all suites in `test/`).
- Targeted suites (explicit re-run for ledger linkage):
  - `node test/test-code-review-round-2.js` (round-2 regression: NS2/NS3/NS4/NS5/NS8/NS9, AC3/AC13/AC15)
  - `node test/test-provider-parity.js` (AC7 provider parity)
  - `node test/test-observer-us365.js` (AC1 observer canonical writer)
  - `node test/test-powershell-config-editor.js` (AC8 GUI sync)
  - `node test/test-harness-clean.js` (upstream self-audit invariant, 0 findings)
  - `node test/test-unique-runtime.js` (AC5 unique runtime)
- No frontend, DB, or E2E surface in this package (Node 22 skill package; `frontendBuild`/`frontendTest` unset, `database.type: none`).

## 2. Gaps vs changed files

Changed product surface (G2 commits `ae3806d6` + `b6ca3eba`): `observer.cjs`, `step_coordinator.cjs`, `ws-ship-pr/scripts/verify.cjs`, harness checks (`check_unique_runtime`, `check_hub_separation`, `check_duplicates`, `check_pipeline_handoff`), `check_memory_conflict.cjs`, `cleanup_workflow_git.cjs`, `run_sabotage.cjs`, `monitor_snapshot.cjs`, provider scripts, `Edit-WorkflowSkillsConfig.ps1`, `secrets_scanner.cjs`, site/integrity/CI, `bin/cli.js`, benchmark paths. Coverage: `test-code-review-round-2.js` asserts each AC class directly; provider-parity, observer, powershell-editor, unique-runtime, harness-clean cover the remainder. Step 6 review: APPROVE 10/10, all 15 triage hypotheses dropped.

## 3. Hosts / ports / credentials

None. CLI-only package; no dev server, no network listeners, no auth surface (`apiHost`/`devHost` empty).

## 4. DB seeds & rollback

Not applicable (`database.type: none`, no `seedScript`).

## 5. API contracts

Not applicable — no API surface. CLI exit-code contracts asserted by tests (e.g. cancel/unmatched input → `EXIT_BLOCKED`, develop-only repo refused, unknown update flag fails closed).

## 6. RBAC / tenancy

Not applicable (no auth surface, no tenancy field).

## 7. Integration / E2E paths

Full `npm run test` chain is the integration surface (install, migration, quality gates, parity, harness-clean, efficiency suites). Browser/UI skipped per package scope (`skip-browser` equivalent; no UI routes).

## 8. Feature-quality AC checklist (AC1–AC15 → observable outcomes)

AC1 observer canonical writer → `test-observer-us365.js`; AC2/AC3 gates + spaced `--cwd` → `test-step-coordinator.js` + round-2 NS2/AC3; AC4 ship verify base handling → round-2 NS3; AC5 unique runtime/hub separation → `test-unique-runtime.js` + harness-clean; AC6 home expansion + drain → round-2 NS5/AC13; AC7 provider parity → `test-provider-parity.js`; AC8 GUI sync → `test-powershell-config-editor.js`; AC11 benchmark Node-only → `tests:harness-efficiency` benchmark suites; AC12 installer flags/quarantine → round-2 NS8; AC13 exitCode drain → round-2 AC13; AC14 secrets scanner → round-2 NS9; AC15 site/integrity/CI → round-2 AC15 + harness-clean integrity check.

## 9. Defect-threshold pass/fail metrics

Pass: `npm run test` exit 0 AND every targeted suite exit 0 AND harness-clean 0 findings. Any non-zero → `status: failed`, fail-closed, hand to `ws-implement-tasks` fix mode (no advance).

## 10. Mutation

SKIPPED — `verification.mutationTest` is empty/unset AND `defaults.skipMutationTesting` is `true`. Per `ws-testing` § Mutation config: log `status: skipped`, do not fail.

## 11. Regression sabotage

SKIPPED — sabotage `not-required` per AC ledger (all ACs `sabotage.status: not-required`) and dispatch manifest; mutation skipped but no caller-authored invert patch was required for this run. Logged with reason, not failed.
