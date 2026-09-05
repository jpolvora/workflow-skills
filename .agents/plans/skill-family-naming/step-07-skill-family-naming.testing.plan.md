# Step 7 Testing Plan — skill-family-naming

Workflow: `skill-family-naming-20260902T215014Z` (standard, autoMode=true)
Spec: `.agents/plans/skill-family-naming/step-00-skill-family-naming.spec.md`
Plan: `.agents/plans/skill-family-naming/step-02-skill-family-naming.plan.refined.md`
Role: testingModel (composer-2.5 fallback)
Date (UTC): 2026-09-05

## 1. Unit & coverage commands (from `config.json.verification`)

- `backendTest`: `npm run test` (full suite: `tests` + `tests:harness-efficiency`).
- Supporting evidence: `npm run verify-integrity` (integrity manifest check, AC16).
- `backendBuild` / `backendFormat` / `frontendTest`: unconfigured (empty) — not applicable.
- Coverage: no numeric coverage gate configured; signal = full suite green + integrity exit 0.

## 2. Gaps vs changed files

Rename-only refactor (skill-folder id + reference rewrite, no behavior change except
`ws-spec-update` memory hook prose). Step 7 edits no product files. Coverage of the
rename surface comes from existing suites: install graph, consumer migration,
provider parity, harness checks, doc-sync, and skill-frontmatter tests. No new
unit tests authored in Step 7 (no new behavior to unit-test beyond the rename
assertions already in `test/`).

## 3. Target hosts / ports / credentials

None. Node skill package; `apiHost`/`devHost` empty, no dev server, no credentials.

## 4. DB seeds & rollback per AC

None. `database.type: none`. No seeds, no migrations, no rollback needed.

## 5. API contracts

None. No endpoints changed. Checks are CLI/script exit codes:
`npm run test` → 0, `npm run verify-integrity` → 0.

## 6. RBAC / tenancy isolation

Not applicable (no tenancy model, no auth surface).

## 7. Integration / E2E paths

- Installer graph + scratch-tree update path (covered by `test-install.js`,
  `test-consumer-migration.js`).
- Provider parity GitHub ↔ Azure ↔ local (covered by `test-provider-parity.js`).
- Harness / workflow simulation (covered by `tests:harness-efficiency` incl.
  `check_workflows.py`).
- UI/browser E2E: skipped — no UI surface, no explicit authorization (backend only).

## 8. Feature-quality AC checklist (observable outcomes)

- AC1–AC5: new `ws-spec-*` / `ws-plan-*` folders exist with matching `name:` +
  banners; retired folders absent → verified via `test-install.js`,
  `test-skill-frontmatter.js`, `verify-integrity`.
- AC6–AC7: zero live retired ids in hashed trees + `bin/skill-dependencies.json` →
  covered by install/skills-audit/doc-sync tests.
- AC8–AC9: hub/router/authoring prose use new ids → covered by `test-doc-sync.js`.
- AC10: harness fails closed on retired pattern → covered by harness tests.
- AC11: `ws-spec-update` memory hook prose → manual SKILL.md conformance (no
  executable assertion; verified by review Step 6).
- AC12–AC15: invocation names, installer leftover-dir cleanup, provider call
  chains, config enum stability → covered by migration/parity tests.
- AC16: integrity + site rebuild + harness 0-critical → `verify-integrity` exit 0
  (site rebuild is a ship-phase action, not re-run here).
- AC17: archives untouched by policy — no test asserts rewrites.

## 9. Defect-threshold pass/fail

- PASS: `npm run test` exit 0 AND `npm run verify-integrity` exit 0 AND neither
  Mutation nor Regression Sabotage is `failed`.
- FAIL: any suite non-zero, or Mutation/Sabotage `failed` → hand off to
  `ws-implement-tasks` (fix mode); this skill does not edit code.

## 10. Mutation

Skipped by policy (not executed):
- `defaults.skipMutationTesting: true` AND `verification.mutationTest: ""`
  (empty/unset). Threshold key (`80`) is moot. Status to record: `skipped`.

## 11. Regression sabotage

Skipped with reason (not executed): rename-only refactor; Step 7 authored no new
regression assertions to invert, so there is no caller-authored invert patch for
`run_sabotage.py`. Full mutation also did not run (no supersession conflict —
both skipped independently per policy).
