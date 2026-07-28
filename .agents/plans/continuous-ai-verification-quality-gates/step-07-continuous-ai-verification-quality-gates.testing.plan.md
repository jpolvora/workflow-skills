# Step 7 Testing Plan — continuous-ai-verification-quality-gates

## Scope and pass criteria

Feature adds quality-gate formalization (AC1–AC7): fable PREPARE row, pre-advance CI validation, `ws-classify-complexity`, JSONL telemetry, gate bypass, `scoreAndRefine` classifier signal, and aggregate telemetry. Pass requires:

1. Site build (`verification.backendBuild`) exits 0
2. Install suite (`verification.backendTest` = `npm run tests -- --local`) exits 0, **or** fails only on integrity stale (expected pre-ship; document + recommend Step 8 `generate-integrity`)
3. Feature suite `node test/test-quality-gates.js` exits 0 (covers AC1–AC7)
4. No browser/UI surface (autoMode / skip-browser)

## Test matrix

| Area | Command | Expected evidence | AC |
|------|---------|-------------------|-----|
| Build / catalog | `node bin/build-site.js` | Exit 0; site regenerated (no version bump) | packaging |
| Install / integrity | `npm run tests -- --local` | Install dry-run green; integrity stale alone → document as pre-ship | packaging |
| Quality gates unit/integration | `node test/test-quality-gates.js` | Exit 0; "All quality-gates tests passed." | AC1–AC7 |
| Wire-up gap | `package.json` `tests` script | Wired: `test-install.js && test-quality-gates.js` (Step 7 surgical) | ops |

## Non-applicable surfaces

- No API, DB, RBAC, tenancy, seeds, migrations, or locale runtime for this package-only change
- Browser / UI / E2E skipped (`autoMode: true`, no application UI)
- Accessibility / contrast for form errors: N/A (no forms or interactive alerts)

## Feature-quality AC checklist (observable)

| AC | Observable check | Where asserted |
|----|------------------|----------------|
| AC1 | PREPARE-CHECKLIST has fable-judge row; REFUTED → STOP semantics documented | `test-quality-gates.js` + PREPARE md |
| AC2 | `validate_state.py --pre-advance` checkpoint / artifacts / monotonic `completedSteps` | `test-quality-gates.js` |
| AC3 | `classify.cjs` + skill; recommendation artifact shape | `test-quality-gates.js` |
| AC4 | JSONL dual-write fields (`timestamp`, `step`, scores, verdicts, bypassed) | `test-quality-gates.js` |
| AC5 | `--skip-gates` / `skipQualityGates`; bypass telemetry; `auditVerdictsBlockShip` not bypassable | `test-quality-gates.js` + setup/schema |
| AC6 | `scoreAndRefine` section in classify output | `test-quality-gates.js` |
| AC7 | `generate-telemetry-aggregate.cjs` → flat `aggregate.json` | `test-quality-gates.js` |

## Defect threshold

- Non-integrity command failure → Step 7 **failed**; hand off fix loop (except optional one-line quality-gates wire-up)
- Integrity-only stale mismatch on install suite → **pass testing plan** with explicit Step 8 regenerate note
- Quality-gates suite failure → **failed**
- Do **not** bump version or regenerate integrity in this step
