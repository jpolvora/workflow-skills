---
step: 7
slug: spec-closure-strengthening
---

# Testing plan — spec-closure-strengthening

## Unit & coverage commands (`config.json.verification`)

- `backendTest`: `npm run test` (150 registered suites incl. new
  `test/test-spec-closure-ears.js`). No other build/test/format aliases configured.
- Coverage signal: Node assert suites (no coverage thresholds configured); gap analysis
  below vs changed files.

## Gaps vs changed files

| Changed file | Covering suite(s) |
|--------------|-------------------|
| `validate_spec.cjs` (EARS/substance/finder) | test-spec-closure-ears.js (new), test-validate-spec.js, test-spec-validation.js, test-harness-benchmark.js V17 |
| `FORMAT.md`, both `SKILL.md` (EARS docs) | observed inspection (no unit pins; consistent with doc-sync practice) |
| 0051 + 5 benchmark fixtures (EARS reshapes) | test-validate-spec.js (0051 authoring), test-harness-benchmark.js V17 |
| `test-suites.json` | runner executes 150 entries (registration proof) |
| `bin/skill-integrity.json` | test-install.js integrity check + `verify-integrity` |
| `classify.cjs` (untouched baseline) | test-classify-open-questions.js 9/9 |

## Non-applicable surfaces (with reason)

- Hosts/ports/credentials: none — pure local CLI, no servers or secrets.
- DB seeds / rollback: none — `database.type: none`.
- API contracts / RBAC / tenancy: none — file-in/file-out validator, no callers with identity.
- UI/E2E/browser: skipped — no UI surface; `skip-browser` equivalent by product shape.
- i18n: none — en-us-only harness prose.

## Integration/E2E paths

The CLI suites are the integration surface: validator CLI × modes × fixtures
(authoring/compat/help/unknown-flag), classifier CLI × heading shapes, benchmark V17
fixture gate, install/integrity round-trip.

## Feature-quality AC checklist (observable outcomes)

- AC1: `validate_spec --mode=authoring` exits 0 on 5 EARS shapes, non-zero naming the
  AC id on 2 free-form shapes; same free-form spec exits 0 in compat.
- AC2: authoring exits non-zero on zero-row and placeholder-only tables; 0 on
  N/A-because and mixed tables.
- AC3: authoring exits 0 with verbatim duplicate + canonical table; non-zero on
  canonical-empty + other-section table and on verbatim-only.
- AC4/AC5: classifier reports open true/false across 9 heading/content shapes.
- AC6: compat exit-code map 0/159 diffs before/after.
- AC7: 5 patterns + 5 examples present in all three guidance files.

## Defect-threshold pass/fail metrics

- Pass: full suite 150/150 exit 0; sabotage inverted-run non-zero + byte-identical
  restore; scanner 0 issues; integrity verified.
- Fail: any suite non-zero, sabotage restore mismatch, or new Critical/Warning.

## Mutation

Skipped: `defaults.skipMutationTesting: true` and `verification.mutationTest` empty
(policy: skip with reason, do not fail).
