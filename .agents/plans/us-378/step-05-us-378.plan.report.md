---
us: 378
reportDate: "2026-09-21T11:55:00Z"
score: 10
sourcePlans:
  - .agents/plans/us-378/step-02-us-378.plan.refined.md
  - .agents/plans/us-378/step-01-us-378.plan.md
evalSource: .agents/plans/us-378/step-00-us-378.spec.md
mode: quick
step: 5
slug: us-378
workflowId: us-378-20260921T112549Z
status: completed
startedAt: "2026-09-21T11:27:55Z"
endedAt: "2026-09-21T12:21:32.270Z"
acRefs: []
---
# Step 5 — Verification report (us-378)

Score: 10/10 (ledger-derived, 130/130 units, boundary step5).

## Result by Feature

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | Implemented | `.agents/skills/ws-patterns-generator/SKILL.md` frontmatter/banner/steps; battery `SKILL.md exists` exit 0 |
| AC2 | Implemented | Both graphs list membership + deps; integrity `--check` exit 0; battery `integrity --check exit 0` |
| AC3 | Implemented | Seed script skeleton/never-overwrite; externalSkills entries; uninstall fixture preserves bytes; battery `seed writes generated body` |
| AC4 | Implemented | Carve-out keeps present managed rows, drops absent; ws-memo still dropped; battery `generated row preserved when tree exists` |
| AC5 | Implemented | `--dry-run` writes nothing; battery `dry-run rule` |
| AC6 | Implemented | Tolerate-and-note rule; battery `missing-source tolerance rule` |
| AC7 | Implemented | Labels + evidence pointers; battery `summary labels` |
| AC8 | Implemented | Byte-identical rerun; battery `idempotency rule` |
| AC9 | Implemented | Secrets scan exit 0; anonymization rule; battery `secrets scan exit 0` |
| AC10 | Implemented | Portable prose asserts; battery `no host product names` |
| AC11 | Implemented | Invariant scan 0 violations; battery `invariant scan exit 0` |
| AC12 | Implemented | Changelog rule; battery `changelog rule` |
| AC13 | Implemented | Five harness checks exit 0; battery `check_duplicates.cjs` |

Negative scenarios NS1–NS9: all linked to observed battery tests (seed-blank, installer-exclusion, idempotent-noop, evidence-pointer, no-secrets, tolerance-rule, dry-run, scan, opt-out).

## Additional Features

- Adversarial audit `step-05-us-378.fable-audit.md`: verdict VERIFIED (0 frauds; test-literal evolutions disclosed with precedent).
- Sabotage check on the autoload carve-out: test-failed-as-expected, bytes restored.
- Alias results: `backendTest` (`npm run test`, 103/103, exit 0); `backendBuild` not applicable (no build pipeline; `node --check` clean).

## Stack Invariant Compliance

`scan_stack_invariants.cjs --stack typescript-node` over seed script, `configure_autoload.cjs`, `retired_artifacts.cjs`: 0 violations (0 critical, 0 warnings). Strict-type rule N/A (JavaScript `.cjs`, no `tsc` gate). No invariant-violation links; no caps triggered.

## Gaps and Next Steps

- None. Score 10/10 ≥ minVerifyScore 9. Advance to Step 6 review of G2 commit `32076bba`.
