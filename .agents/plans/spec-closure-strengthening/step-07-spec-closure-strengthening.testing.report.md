---
step: 7
slug: spec-closure-strengthening
status: completed
workflowId: spec-closure-strengthening-20260930T095034Z
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T11:05:07.037Z"
acRefs: []
---
# Testing report — spec-closure-strengthening

- **Verdict**: PASS (all planned areas green or skipped per policy; neither Mutation nor Sabotage failed).

## Base build + unit battery

- `npm run test` (backendTest): **150/150 entries passed**, exit 0 (final confirmation
  run this step; hub config byte-identity verified, no mutation, no leftover backup).
- No other verification aliases configured (all other `*Build`/`*Test`/`*Format` keys
  empty) — nothing else to run.

## Coverage of changed files

- New `test/test-spec-closure-ears.js`: ok (21 assertions across AC1/AC2/AC3/AC6:
  5 EARS accepts, 2 rejects + AC-id naming, 2 tolerance, 4 AC2 table cases, 3 AC3
  shadow cases, mode-split pair).
- `test-validate-spec.js`: ok (0051 authoring PASS + fixture EARS).
- `test-spec-validation.js`: ok (EARS fixtures + composite anchor).
- `test-harness-benchmark.js`: ok (V17 all 5 fixtures authoring-valid).
- `test-classify-open-questions.js`: 9/9 ok (AC4/AC5 baseline).
- `test-install.js --local`: ok (integrity round-trip over regenerated manifest).

## Non-applicable surfaces

DB seeds, API contracts, RBAC/tenancy, hosts/credentials: none exist for this pure
local CLI (verified against `config.json`: database none, no hosts/ports).
UI/E2E/browser: skipped — no UI surface. Accessibility/contrast check on form
validation errors and alert indicators: N/A — no forms, no UI.

## Mutation

- **Status**: skipped. Reason: `defaults.skipMutationTesting: true` and
  `verification.mutationTest` empty (per policy: skip with reason, do not fail).

## Regression Sabotage

- **Status**: passed (canonical helper).
- Command: `run_sabotage.cjs --test 'npm run test' --paths
  validate_spec.cjs --invert-patch sabotage-ac3-invert.patch`.
- Invert: 2 call sites canonical→first-match (AC3 rule), patch check-applied clean.
- Result: `status: passed`, `reason: test-failed-as-expected`, `testExitCode: 1`,
  `restored: true` (byte-identical, CRLF-safe snapshot restore).
- Post-sabotage tree verified clean; full suite re-ran 150/150 green.
- Ledger: `testing-sabotage` sabotage-exit 0 linked to AC3 (extends the Step 5 manual
  invert evidence, which additionally proved the pristine-HEAD validator fails the
  shadow fixture).

## Gaps

None blocking. Accepted non-gaps (carried from verify): AC7 prose has no unit pins
(observed inspection green); CR-002 verbatim-table residual documented.
