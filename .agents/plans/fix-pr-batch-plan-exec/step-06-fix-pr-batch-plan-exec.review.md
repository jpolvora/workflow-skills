---
step: 6
slug: fix-pr-batch-plan-exec
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
status: active
startedAt: "2026-08-25T16:39:00Z"
endedAt: "2026-08-25T17:36:43.815Z"
acRefs: []
---
# Code Review — fix-pr-batch-plan-exec

## Result

**Clean**

| Severity | Open count |
|---|---:|
| Critical | 0 |
| Warning | 0 |
| Info | 0 |
| Nit | 0 |

## Re-review scope

- ReviewFix commit: `c27d6f83 fix(fix-pr-batch-plan-exec): harden Step 9 completion assertions`.
- Compared `f8f34a7a..HEAD` for the three product/test paths named by round 1.
- Re-checked both prior findings and adjacent state-index/telemetry behavior.

## Findings

### CR-001 [Warning] closed test/test-models-preset-and-per-step.js:L427-L431

The internal-dispatch absence assertion now uses the same inline/block-aware `completedSteps` matcher as the positive outer-finish assertion. The sibling assertion in `test/test-update-state-yaml.js:L238-L244` uses the same corrected matcher.

**Closure evidence:**

- A YAML block-list `- 9` is now detectable.
- The internal dispatch check passes with no Step 9 completion.
- The immediately following outer finish writes Step 9 and the same matcher positively detects it, proving the matcher bites the serializer's actual block form.
- Fresh model and YAML test runs pass.

**Sibling sweep:** Both round-1 occurrences are fixed; no remaining single-line Fix-PR `completedSteps` absence assertion was found.

### CR-002 [Warning] closed .agents/skills/ws-shared/scripts/workflow_state.cjs:L555-L556

`updatePlansIndex()` now filters out null/missing-`workflowId` rows before sorting, so the schema-invalid row from round 1 cannot survive a state update and later reach `resolveStateFile()`. The model resolver fixture now starts with `workflows: []` instead of introducing `{}` solely to exercise unrelated production tolerance.

**Closure evidence:**

- The original malformed-row preservation path is removed.
- Sorting now receives only rows with non-empty `workflowId`.
- The resolver fixture is schema-valid for the behavior under test.
- Fresh model resolver and workflow-state contract runs pass.

**Sibling sweep:** `rebuildIndex()` remains exempt because it constructs complete workflow rows before sorting. No other feature writer preserves missing workflow identities.

## Verification

- `node test/test-models-preset-and-per-step.js` — PASS, exit 0.
- `node test/test-update-state-yaml.js` — PASS, exit 0.
- `node test/test-workflow-state-contract.js` — PASS, exit 0.
- `npm run verify-integrity` — PASS, exit 0.
- `git diff --check f8f34a7a..HEAD` — PASS, exit 0.
- ReviewFix product paths are committed and clean.

## Adversarial audit

**Verdict: VERIFIED**

- **Weakened Checks:** None remain; CR-001 is closed with a matcher proven against the serializer's positive block-list output.
- **False Completion:** None detected in round 2.
- **Scope Creep:** The round-1 malformed fixture was removed; the retained writer guard directly prevents the reviewed invalid-row persistence failure.
- **Unauthorized Actions:** None detected.

## Recommendation

**Clean. Advance to Step 7.**

No Critical or Warning findings remain after reviewFix round 1.
