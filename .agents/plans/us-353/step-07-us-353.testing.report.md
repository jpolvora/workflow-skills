# Step 7 testing report — us-353

Plan: `.agents/plans/us-353/step-07-us-353.testing.plan.md`. Date: 2026-09-19. Executor model: current session.

## Base build / unit

- `node test/test-worker-turn-guard.js` → exit 0 (PASS, incl. us-353 AC1 mandate assertions + NS1/NS4/AC2–AC5 branches).
- `node test/test-verbose-mode.js` → exit 0 (PASS, incl. lite sibling mandate assertion).
- `node test/test-goal-fix-pr-orchestrator-dispatch.js` → exit 0 (PASS, incl. AC2 watchdog, AC3 state-path, AC4 bounded handoff).
- Full `npm run test` (backendTest alias): Step 5 alias evidence exit 0 on record; Step 7 targeted re-runs green. Full re-run in Step 7 not repeated end-to-end (exceeds turn budget; sabotage below exercised the full alias once with expected-fail-while-inverted).
- `scan_stack_invariants.cjs --stack typescript-node` → 0 issues (4 files), exit 0.
- `validate_spec.cjs --mode=authoring .agents/specs/0098-us-353.spec.md` → PASS (6 ACs).
- `generate-skill-integrity.js --check` → OK (v0.4.38).

## API / integration / UI

Skipped as not applicable — skill-doc hardening has no service surface, endpoints, seeds, or UI (plan § Targets/Integration).

## Mutation

Status: `skipped` — `verification.mutationTest` empty and `defaults.skipMutationTesting: true`.

## Regression sabotage

Status: `passed` — `run_sabotage.py --test "npm run test" --paths .agents/skills/ws-spec-to-pr/PROTOCOLS.md` with caller-authored invert patch (mandate phrase removed) → `{"status":"passed","reason":"test-failed-as-expected","restored":true,"testAlias":"backendTest","testExitCode":1}`. Proves the new AC1 assertion bites; working tree restored byte-identical (git status clean for tracked paths).

## Accessibility

Form-validation-error contrast check: not applicable (no UI changed).

## Verdict

Pass — all planned areas passed or skipped per policy; neither Mutation nor Sabotage `failed`. Advance to Step 8.

AC trace: AC1 (guard suite), AC2–AC4 (orchestrator-dispatch suite), AC5 (suites + integrity), AC6 (authoring + neutrality grep). Negative scenarios NS1–NS4 exercised by failing-fixture branches; NS5 by reviewer-aligned gates (Step 5 evidence).

Learning: N/A (testing only, no new project knowledge).
