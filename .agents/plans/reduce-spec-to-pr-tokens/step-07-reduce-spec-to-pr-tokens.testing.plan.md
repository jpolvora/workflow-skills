---
us: reduce-spec-to-pr-tokens
workflowId: reduce-spec-to-pr-tokens-20260927T043013Z
step: 7
slug: reduce-spec-to-pr-tokens
status: completed
startedAt: "2026-09-27T06:20:35Z"
planPath: .agents/plans/reduce-spec-to-pr-tokens/step-02-reduce-spec-to-pr-tokens.plan.refined.md
specPath: .agents/plans/reduce-spec-to-pr-tokens/step-00-reduce-spec-to-pr-tokens.spec.md
---

# Step 7 Testing Plan — reduce-spec-to-pr-tokens

Docs-only compaction of `ws-spec-to-pr` / `ws-spec-to-pr-lite` prose (Step 5 score 10/10, Step 6
review clean). No product-code changes in Step 7 — testing only; any gate failure is reported
`failed` without fixing (caller routes to fix mode).

## 1. Unit & coverage commands (`config.json.verification`)

- `backendTest`: `npm run test` (full suite; 137/137 green at Step 5).
- Fresh Step 7 confirmation (targeted, per dispatch): `node test/test-context-budget.js`,
  `node test/test-liveness-checkpoints.js`, `node test/test-quality-gates.js` — all must exit 0.
- Extra parity gates (fresh): `node test/test-workflow-state-contract.js`,
  `node test/test-run-state-integrity.js` — both must exit 0.
- Full `npm run test` re-run ONLY if the verification manifest mismatches or any targeted gate
  is non-zero. Tree == Step 5 G2 commit `ffae2209` (confirmed via `git status` + `git diff HEAD`
  product-empty), so no full re-run is planned.

## 2. Gaps vs changed files

Changed product files (all docs/test-assertions, zero `.cjs` logic): four skill markdown files +
`test/test-context-budget.js` + T08 ship hygiene (version lines, regenerated integrity, site
build). No logic surface exists for unit tests to miss — suites are the parity proof (plan T07).

## 3. Targets, credentials, DB seeds

None. Stack `node-skills-package` has no dev server, no database, no seed script
(`apiHost`/`devHost` empty, `database.type: none`). Sections N/A by machine evidence.

## 4. API contracts, RBAC, tenancy

None. No endpoints, no authorization attributes, no tenant fields in scope. The authorization
ladder stays prose-only (verified via V7 liveness + V9 run-integrity presence checks).

## 5. Integration / E2E / UI

`skip-browser`: browser verification skipped — no browser tool bound and docs-only change with
no UI surface (no surface, no gate). Integration proof = targeted gates + pipeline-handoff
check (Step 5/6 observed exit 0, cited, not re-run).

## 6. Mutation

Skipped (log `status: skipped`, no threshold gate): `verification.mutationTest` is unset (empty)
AND `defaults.skipMutationTesting` is `true`. Regression sabotage runs via `run_sabotage.cjs`
instead — but no caller-authored invert patch exists for this docs-only change and every ledger
AC row has `sabotage.required: false` (manifest `sabotage: not-required`), so sabotage is
recorded `skipped` with reason per the skill fail-closed rule for non-required surface.

## 7. Feature-quality AC checklist (observable outcomes)

| AC | Observable outcome | Gate |
|----|-------------------|------|
| AC1 autoMode-table dedup | Canonical table only in SKILL.md; pointer-only in STEP-DISPATCH.md | V2 + V11 |
| AC2 centralized recipes | Every pointer anchor resolves; no orphans | V3 |
| AC3 PROTOCOLS consolidation | Full procedures exactly once (STEP-DISPATCH.md); PROTOCOLS holds pointers | V4 + V7 |
| AC4 compaction | `git diff --stat` net deletions; zero `.cjs` touched | V5 + V11 + V7 |
| AC5 lite alignment | Lite points at gates/tools/git-ownership; no STEP-DISPATCH step numbers | V3 |
| AC6 byte budgets | Per-file + combined integer-byte asserts pass | V1 + V6 |
| AC7 behavioral parity | FSM F0–F6, Steps 0–9, chaining, pause fallbacks, gates, G2, baton, observers intact | V7 + V8 + V9 + V10 |
| AC8 budget assertions | `test-context-budget.js` asserts Q1 constants, LF-normalized | V6 |
| AC9 zero regressions | Full suite green | V10 |

Negative scenarios: NS1 (inflation fails budget) → V6; NS2 (dropped chaining fails D1) → V7;
NS3 (dropped G2/pre-advance fails integrity) → V9.

## 8. Defect-threshold pass/fail metrics

Pass = every executed gate exit 0 AND neither Mutation nor Sabotage is `failed` (both `skipped`
per policy above). Any non-zero gate → `status: failed`, no fix attempted, caller routes to
`ws-implement-tasks` fix mode.
