# Step 7 Testing Plan — us-202

## Scope and pass criteria

US-202 fixes two defects in `update_state.py` (standard and lite copies): nested dict serialization via `str()` corrupting `telemetry.loc`, and silent last-wins on duplicate top-level `completedSteps:` keys. Pass requires:

1. Integrity regenerate + verify exits 0 (hashed `update_state.py` scripts changed; Phase 0b prerequisite for install suite)
2. Feature suite `node test/test-update-state-yaml.js` exits 0 (AC1–AC5)
3. Full install suite `npm run test` (`verification.backendTest`) exits 0
4. No browser/UI surface (`skip-browser: true`)

## Test matrix

| Area | Command | Expected evidence | AC |
|------|---------|-------------------|-----|
| Integrity regenerate | `npm run generate-integrity` | Exit 0; `bin/skill-integrity.json` updated for changed scripts | packaging |
| Integrity verify | `npm run verify-integrity` | Exit 0; digest matches tree | packaging |
| Feature YAML tests | `node test/test-update-state-yaml.js` | Exit 0; loc round-trip + duplicate union assertions pass | AC1–AC5 |
| Full install suite | `npm run test` | Exit 0; pack + install + all chained test files | packaging |

## Feature-quality AC checklist (observable)

| AC | Observable check | Where asserted |
|----|------------------|----------------|
| AC1 | `telemetry.loc` `{ baseline: 2404 }` round-trips as mapping; no Python repr `{'baseline'` or `"{'baseline'"` after serialize | `testLocNestedMappingRoundTrip` |
| AC2 | Lite `serialize_yaml` nested-dict branch uses `format_inline_dict(subv)`; lite script run keeps loc as mapping | `testLiteSerializerMirrorsNestedDictFix` |
| AC3 | Duplicate `completedSteps:` unions unique ints; stderr warns; does not fail-closed | `testDuplicateCompletedStepsUnion` |
| AC4 | Seed block nested `telemetry.loc`, run `--step 1`, loc remains mapping | `testLocNestedMappingRoundTrip` |
| AC5 | Two `completedSteps:` keys (`[0,1]` then `[0]`); after `--step 2` list contains 0, 1, and 2 | `testDuplicateCompletedStepsUnion` |

## Mutation testing

**Skipped.** Reasons:

- `defaults.skipMutationTesting: true` (config)
- `verification.mutationTest` empty/unset

No mutation command will run; Step 7 does not fail on mutation absence.

## Non-applicable surfaces

- No API, database, RBAC, tenancy, seeds, migrations, or locale runtime (`stack.id`: `node-skills-package`)
- Browser / UI / E2E skipped (`skip-browser: true`; no application UI)
- `verification.backendBuild` empty — no separate build step
- Accessibility / contrast for form errors: N/A (no forms or interactive alerts)

## Defect threshold

- Non-integrity command failure → Step 7 **failed**; hand off to implement fix loop
- Integrity stale without regenerate → fix via `npm run generate-integrity` (allowed in this step)
- Feature or full test suite failure → **failed**
- Do **not** bump `package.json` version in this step
