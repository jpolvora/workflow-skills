---
step: 6
slug: fresh-worker-verifier-step
round: 1
status: "fix complete, re-review clean"
---

# Review fix report — fresh-worker-verifier-step (round 1/3)

- **Findings in**: 4 Warnings (CR-001–CR-004) + 3 Suggestions (CR-005–CR-007)
- **Findings out**: 0 open (all closed in round 2)
- **Gate log**: `review-fix | round=1/3 | fixed=CR-001..CR-007 | remaining=none`

## Fixes applied

| id | Fix | Test |
|----|-----|------|
| CR-001 | `--invert-patch=` slice 16→15 | `CR-001: =-form flags parse without mangling` |
| CR-002 | Fail closed on null test status (`test-execution-failed`) | `CR-002: execution failure named` (maxBuffer-overflow fixture) |
| CR-003 | Fail closed on dirty declared paths (`paths-dirty-vs-head`) | `CR-003: dirty paths fail closed` |
| CR-004 | Lowercase basename in refusal test | `CR-004: case-variant prior output refused` |
| CR-005 | AC extraction scoped to `## Acceptance Criteria` | `CR-005: AC list scoped to the criteria section` |
| CR-006 | `red-signal-unparseable` branch covered | `CR-006: unparseable red exits 1` |
| CR-007 | `--fail-pattern` validated at parse (exit 2) | `CR-007: invalid fail pattern exits 2` |

## Verification after fix

- `test/test-fresh-verify.js`: all assertions passed (including 7 new CR blocks)
- Full `npm run test`: 148/148 green (after integrity regen for changed script bytes)
- `scan_stack_invariants.cjs`: 0 issues
- Real-spec AC extraction: 8/8 ACs (no CR-005 regression)

## Named exemption (not fixed here)

- `ws-testing/scripts/run_sabotage.cjs` carries the same `slice(16)` line as
  CR-001. Exempt: foreign ownership, Step 7 path — needs its own upstream
  follow-up outside this PR's blast radius.

## Sibling sweep

`=`-offset class re-swept across both touched scripts: every remaining offset
verified arithmetically correct. No other occurrences.
