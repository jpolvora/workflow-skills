---
slug: us-275
step: 7
workflowId: us-275-20260904T020000Z
status: active
autoMode: true
skip-browser: true
probe:
  hasTestSurface: true
  backendTest: npm run test
  skipTesting: false
---

# Step 7 Testing Plan — us-275

Scope: fail-closed `autoMode` planning guard (docs + `validate_state.cjs --pre-advance 4` HS-5 enforcement).
Commit under test: `cd95e7f7` (11 product files). No product-code edits in this step.

## 1. Unit & coverage commands (from config.json verification)

| Alias | Command | Run in Step 7 |
|-------|---------|---------------|
| `backendBuild` | (empty) | N/A — no build alias configured |
| `backendTest` | `npm run test` | Yes — full suite, exit 0 required |
| `mutationTest` | (empty) + `defaults.skipMutationTesting: true` | Mutation SKIPPED with log (see §9) |

Additional focused suites (not in `npm run test` chain but cover us-275 ACs):

| Command | AC coverage |
|---------|-------------|
| `node test/test-workflow-state-contract.js` | AC4/AC6/NS1 — HS-5 token, Step 0-only autoMode rejection |
| `node test/test-quality-gates.js` | AC1–AC5/NS — doc tables, `testPreAdvance4MissingPlan`, `testPreAdvanceHS5` |
| `node test/test-runtime-portability.js` | AC8 — host-neutral autoMode prose |

Coverage gaps vs changed files:

| Changed file | Covering test |
|--------------|---------------|
| `.agents/skills/ws-spec-to-pr/SKILL.md` | `testAutoModeSkipPlanningDocs` |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | `testAutoModeSkipPlanningDocs`, `testPreAdvanceHS5` |
| `.agents/skills/ws-shared/gates.md` | `testAutoModeSkipPlanningDocs` (child slug) |
| `.agents/skills/ws-shared/setup.md` | `testAutoModeSkipPlanningDocs` (banner + child slug) |
| `.agents/skills/ws-shared/scripts/workflow_state.cjs` | `test-workflow-state-contract.js`, `testPreAdvance4MissingPlan` |
| `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md` | `testPreAdvanceHS5` (doc contract) |
| `.agents/skills/ws-spec-to-pr/docs/faq.md` | `pre-advance 4 rejects Step 0-only autoMode standard workflow` |
| `test/test-quality-gates.js` | self + sabotage invert target (AC4 HS-5 assert) |
| `test/test-workflow-state-contract.js` | self (dogfood fixture AC6) |
| `test/test-runtime-portability.js` | self (AC8 host neutrality) |
| `bin/skill-integrity.json` | `npm run test` → `verify-integrity` chain |

## 2. Targets, hosts, credentials

N/A — Node skills-package harness, no dev server. `config.json` stack `apiHost ""`, `devHost ""`, no ports, no credentials.

## 3. DB seeds & rollback

N/A — `database.type: none`, no migrations, no seed script.

## 4. API contracts

N/A — no HTTP endpoints. CLI contract instead: `validate_state.cjs --pre-advance 4` exits non-zero when `step-01-*.plan.md` / `plan.index.json` missing; stderr lists artifacts and includes `HS-5` token (AC4/AC5).

## 5. RBAC & tenancy isolation

N/A — harness package, no users/roles/tenants. Invariant: guard failure → STOP, no product edits, no Step 4 dispatch (AC5).

## 6. Integration / E2E paths

- Temp-hub fixture: Step 0-only + `autoMode: true` + `workflowType: standard` → `--pre-advance 4` non-zero (AC6/NS1).
- Doc contract sweep: SKILL, STEP-DISPATCH, gates, setup tables and init banner (AC1–AC3).
- Mechanical gates remain green via `npm run test` harness-efficiency chain (AC7).

## 7. UI / E2E validation

Skipped — `skip-browser: true` (autoMode dispatch). No UI surface in this change.

## 8. Feature-quality AC checklist (observable outcomes)

- [ ] AC1: SKILL + STEP-DISPATCH each have **autoMode ≠ skip planning** two-column table
- [ ] AC2: gates.md + setup.md — child slug on parent branch does not waive Steps 1–3
- [ ] AC3: setup.md init banner reminds FSM 0→9 + no product code until Step 4
- [ ] AC4: `--pre-advance 4` fail-closed; stderr lists missing artifacts + HS-5
- [ ] AC5: guard failure → HS-5 STOP, no product edits / Step 4 dispatch
- [ ] AC6: dogfood fixture rejects Step 0-only autoMode standard workflow
- [ ] AC7: `npm run test` (includes mechanical gates + integrity) exits 0
- [ ] AC8: new prose host-neutral (`test-runtime-portability.js`)
- [ ] NS1–NS3: covered by `testPreAdvance4MissingPlan` + doc asserts

Defect threshold: PASS only when `backendTest` exits 0, sabotage `passed`, mutation `skipped` (policy), and no new failures vs Step 5/6 evidence.

## 9. Mutation

- `status: skipped`
- Reason: `verification.mutationTest` empty AND `defaults.skipMutationTesting: true` (opt-in default). Log and continue to regression sabotage.
- Threshold N/A.

## 10. Regression sabotage

- Helper: `python .agents/skills/ws-testing/scripts/run_sabotage.py`
- Test alias: `npm run test` (must equal configured `backendTest` exactly)
- Path: `test/test-quality-gates.js`
- Invert patch (caller-authored): negate HS-5 assertion in `testPreAdvance4MissingPlan` (`assert(!/HS-5/.test(blob), …)`)
- Patch file: `.agents/plans/us-275/.runtime/invert-hs5-assert.patch`
- Expectation: `backendTest` exits non-zero; every declared path changes bytes; restore byte-identical (`restored: true`)
- Restore failure → abort Step 7.

## 11. Accessibility / contrast

N/A — no forms or alert UI in this change. Report records N/A with rationale.
