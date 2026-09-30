---
step: 7
slug: fresh-worker-verifier-step
status: "testing plan"
---

# Testing plan — fresh-worker-verifier-step

- **Plan**: `step-02-fresh-worker-verifier-step.plan.refined.md`
- **Spec**: `step-00-fresh-worker-verifier-step.spec.md`
- **Probe**: `probe_test_surface.cjs` → `hasTestSurface: true`, alias `backendTest` (`npm run test`)

## Unit & coverage

- `npm run test` (mode=local, 148 entries) — must exit 0. Covers the new
  `test/test-fresh-verify.js` battery (AC1–AC8 + 4 negative scenarios + 7
  review-CR regressions) and all pre-existing suites (no regressions in
  doc-sync, context budgets, wiki, or workflow simulation).
- Gap check: every file in the G2 commits is either a new skill script covered
  by `test-fresh-verify.js`, a contract/registry doc covered by its
  registration assertions, or generated (`docs/index.html`, integrity manifest).

## Target hosts / credentials / DB seeds

None — local Node 22 CLI skill package. No dev server, no credentials, no
database. Seed state: N/A.

## API contracts / RBAC / tenancy

N/A — no API surface, no auth, no tenant data. CLI contract checks (exit codes,
flag vocabulary, JSON shapes) are asserted in `test-fresh-verify.js`.

## Integration / E2E paths

- Cross-skill contract integration via the repo suite (doc-sync, harness-clean,
  check-harness phases, workflow simulation): covered by `npm run test`.
- UI routes / translations: none (no browser surface) — UI/E2E skipped
  (`skip-browser` equivalent; no UI to validate).

## Feature-quality AC checklist

| AC | Observable outcome |
|----|--------------------|
| AC1 | Dispatch builder emits compact handoff; refuses prior outputs (exit 1) |
| AC2 | Report writer requires file:line evidence for pass verdicts |
| AC3 | Injection records red signal (name + exit code) on scratch worktree |
| AC4 | Missing evidence/red → zero + named defect |
| AC5 | Rounds 1–2 continue, round 3 pauses, clean done |
| AC6 | Report carries all TEMPLATE sections |
| AC7 | 6b placement + registry rows + skip marker |
| AC8 | Worktree removed, primary bytes identical |

## Defect-threshold metrics

- Pass: `npm run test` exit 0 AND sabotage `passed` AND mutation `skipped`
  per policy AND no new review findings.
- Fail: any suite failure, sabotage `failed`, or unrestored bytes (abort).

## Mutation

Skipped per policy: `defaults.skipMutationTesting: true` and
`verification.mutationTest` empty. No engine vendored. Regression sabotage
runs instead (not superseded).
