# Step 7 testing plan — us-353

Scope: doc-only hardening (ws-goal-fix-pr/SKILL.md watchdog + bounded handoff, ws-spec-to-pr PROTOCOLS.md / STEP-DISPATCH.md + lite SKILL.md continuation mandate) locked by 3 contract suites. No runtime, installer, or site changes.

## Unit & coverage commands (config verification)

- `backendTest`: `npm run test` (full suite; Step 5 alias evidence exit 0; Step 7 re-runs touched suites fresh — full run exceeds worker turn budget, targeted suites cited with exit codes).
- Touched suites (fresh re-run): `node test/test-worker-turn-guard.js`, `node test/test-verbose-mode.js`, `node test/test-goal-fix-pr-orchestrator-dispatch.js`.
- `stackScan`: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
- `authoring`: `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0098-us-353.spec.md`.
- `integrity`: `node bin/generate-skill-integrity.js --check`.

## Gaps vs changed files

All 8 changed files covered: 4 skill docs asserted by contract tests line-pinned to mandate/watchdog/state-path/bounded-handoff strings; 3 test files are the assertions themselves; bin/skill-integrity.json verified by --check.

## Targets / credentials / DB

None — no servers, locales, or seeds. No API contracts, RBAC, or tenancy surface (skill docs only).

## Integration / E2E / UI

Not applicable — no product runtime. Contract suites are the integration signal (red-before/green-after fixtures embedded in tests).

## Feature-quality AC checklist

AC1–AC6 mapped to named assertions (see report). Negative scenarios NS1–NS4 mapped to failing-fixture branches inside the suites; NS5 covered by reviewer-aligned gates suite (Step 5 evidence).

## Mutation

`verification.mutationTest` empty + `defaults.skipMutationTesting: true` → Mutation `skipped`.

## Regression sabotage

Mutation skipped → run `run_sabotage.py` with caller-authored invert patch on PROTOCOLS.md mandate line, test `node test/test-worker-turn-guard.js` (expect non-zero while inverted, byte-identical restore).

## Pass/fail metrics

Pass = touched suites exit 0 + scan 0 + authoring 0 + integrity 0 + sabotage inverted-non-zero/restored + neither Mutation nor Sabotage `failed`.
