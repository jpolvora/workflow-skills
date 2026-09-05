# Testing plan — hermes-spec-to-pr-enhancements

- **Plan**: `.agents/plans/hermes-spec-to-pr-enhancements/step-02-hermes-spec-to-pr-enhancements.plan.refined.md`
- **Spec**: `.agents/plans/hermes-spec-to-pr-enhancements/step-00-hermes-spec-to-pr-enhancements.spec.md`
- **Change under test**: one-clause addition to `ws-spec-to-pr/STEP-DISPATCH.md` Step 4 row + regenerated `bin/skill-integrity.json` (commit `b11664e7`).

## 1. Unit & coverage commands (`config.json.verification`)

| Alias | Command | Scope |
|-------|---------|-------|
| `backendTest` | `npm run test` | Full package suite (includes hermes + parity + integrity + harness sims) |
| `backendBuild` | (empty) | N/A — no build alias configured |
| `backendFormat` | (empty) | N/A |

Targeted (change-direct): `node test/test-hermes-spec-to-pr-enhancements.js`, `node test/test-provider-parity.js`, `npm run verify-integrity`, `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`.

## 2. Gaps vs changed files

`STEP-DISPATCH.md` (orch dispatch prose) is covered by `test-hermes-spec-to-pr-enhancements.js` (STEP-DISPATCH wiring asserts) and `check_workflows.py` (FSM sim parses the edited row). `bin/skill-integrity.json` is covered by `verify-integrity`.

## 3. Hosts / credentials / DB

None. Harness markdown + JSON manifest; no servers, no DB, no seeds, no rollback.

## 4. API contracts / RBAC / tenancy

N/A (no app surface).

## 5. Integration / E2E / UI

N/A. `skip-browser` applies (no UI in this package change). Accessibility/contrast check: N/A — no forms or alerts touched (report notes the exemption).

## 6. Feature-quality AC checklist

AC1–AC6 re-verified present via E2 matrix + hermes suite asserts (one assert block per AC family); parity suite pins the `>= 9` intent allowlist.

## 7. Mutation

Skipped: `verification.mutationTest` is empty AND `defaults.skipMutationTesting` is true.

## 8. Regression sabotage

Skipped: this run authored no new regression assertions and no invertible fix (doc-only change), so there is no caller-authored invert target. Existing helper proof observed green inside the hermes suite sabotage block.

## 9. Pass metrics

Advance when: unit/targeted suites exit 0, full `npm run test` exit 0, `verify-integrity` exit 0, `check_workflows.py` 0 critical, mutation/sabotage recorded (passed/skipped per policy, neither failed).
