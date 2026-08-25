---
step: 6
slug: fix-pr-batch-plan-exec
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
status: active
startedAt: "2026-08-25T16:39:00Z"
endedAt: "2026-08-25T17:32:37.529Z"
acRefs: []
---
# Code Review — fix-pr-batch-plan-exec

## Result

**NeedsFix**

| Severity | Count |
|---|---:|
| Critical | 0 |
| Warning | 2 |
| Info | 0 |
| Nit | 0 |

## Scope

- Required baseline: `git diff main...HEAD`.
- Feature focus: `f8f34a7a feat(fix-pr-batch-plan-exec): verified implementation` (28 files, 524 insertions, 91 deletions).
- The wider baseline contains unrelated earlier commits; findings below are confined to the feature commit.
- MEMORY sweep covered workflow state/index fail-closed rules, nested `telemetry.loc`, local skill SoT, and shared-hub context budget.

## Findings

### CR-001 [Warning] open test/test-models-preset-and-per-step.js:L427-L428

**Description:** The new “internal Fix-PR dispatches do not complete Step 9” assertion is ineffective for the serializer's non-empty array format. Score: **8/10**.

**Evidence Read:** `serializeFrontmatter()` writes a non-empty `completedSteps` array as:

```text
completedSteps:
  - 9
```

The assertion only searches the `completedSteps:` line (`/completedSteps:[^\n]*9/`). The sibling assertion in `test/test-update-state-yaml.js:L238-L241` has the same single-line limitation.

**Failure Scenario:** If a regression adds Step 9 to `completedSteps` during either internal `dispatch`, both tests remain green because `9` is on the following YAML line. The outer-finish test already demonstrates the correct need to support both inline and block forms.

**Missing Protection:** Neither internal-dispatch test parses frontmatter or reuses the existing block-aware `assertCompletedStepsContains` logic. This leaves AC5's “no internal Step 9 completion” invariant unprotected.

**Discards:** Runtime behavior is currently correct because `performUpdate()` adds completed steps only in the `finish` branch. This finding is retained because an ineffective assertion/check is minimum Warning and cannot prove the claimed invariant against future changes.

**Sibling occurrences:**

- `test/test-update-state-yaml.js:L238-L241` — same ineffective single-line regex.
- No other feature test asserts internal-dispatch non-completion.

```suggestion
Parse completedSteps from frontmatter and assert that the numeric array does not include 9 in both tests. Reuse a shared block/inline-aware helper where available, then prove the assertion fails against a fixture containing a block-list `- 9`.
```

### CR-002 [Warning] open .agents/skills/ws-shared/scripts/workflow_state.cjs:L555-L556

**Description:** An unrelated resolver fixture changed production index handling to silently preserve schema-invalid workflow rows, but subsequent index lookup cannot safely read those rows. Score: **8/10**.

**Evidence Read:** `updatePlansIndex()` now string-coerces a missing `workflowId`, allowing `{}` to survive sorting and be written back to `index.json`. The new fixture at `test/test-models-preset-and-per-step.js:L303-L322` explicitly seeds `workflows: [{}]` and asserts dispatch succeeds. However, `plans-index.schema.json:L15-L27` requires `workflowId`, `statePath`, and the other row fields, while `resolveStateFile()` at `.agents/skills/ws-shared/scripts/workflow_state.cjs:L1041-L1044` calls `path.posix.basename(item.statePath)` without validating it.

**Failure Scenario:** Given the test's malformed row plus the newly written valid row, a later `validate <workflow-id>` iterates the malformed row first. Its missing `statePath` reaches `path.posix.basename(undefined)`, so index-based discovery fails before finding the valid workflow. The dispatch looked successful but persisted an index that remains unusable.

**Missing Protection:** The test checks only dispatch status and state model resolution. It neither schema-validates the rewritten index nor invokes index-based validation/discovery afterward.

**Discards:** The string coercion avoids the immediate `localeCompare` exception, but it is not a repair because it preserves the invalid row and moves the failure to a normal reader. No sibling writer intentionally accepts missing workflow identities; `rebuild-index` emits complete rows.

**Sibling occurrences:**

- `test/test-models-preset-and-per-step.js:L303-L322` — malformed fixture and incomplete success assertion.
- `.agents/skills/ws-shared/scripts/workflow_state.cjs:L1088` — exempt: `rebuildIndex()` sorts rows it constructs with complete workflow identity fields.

```suggestion
Keep this feature's resolver fixture schema-valid (for example, seed an empty workflows array) and revert the unrelated sort tolerance. If malformed-index recovery is desired, implement explicit validation/filter-or-rebuild behavior in a separately scoped change and test schema validity plus successful lookup by workflow id after repair.
```

## Concrete fixes for reviewFix

1. Replace both single-line `completedSteps` absence checks with parsed, inline/block-aware assertions and a block-list negative fixture.
2. Revert the malformed-index sort tolerance and use a valid resolver fixture, or implement explicit repair plus lookup/schema tests in a separately justified change.

## Verification

- `node test/test-models-preset-and-per-step.js` — PASS, exit 0; CR-001 explains why this green result is insufficient.
- `node test/test-fix-pr-proactive-class-sweep.js` — PASS, exit 0.
- `node test/test-update-state-yaml.js` — PASS, exit 0; CR-001 explains why this green result is insufficient.
- `node test/test-telemetry-observability.js` — PASS, exit 0.
- `npm run verify-integrity` — PASS, exit 0.
- `npm run test` — PASS, exit 0 in the completed package run (98.6 s).
- `git diff --check f8f34a7a^..f8f34a7a` — PASS, exit 0.

## Adversarial audit

**Verdict: REFUTED**

- **Claims vs ground truth:** The core plan→execute contracts and runtime role resolution are present, but the feature's claimed no-early-completion proof is weakened and the commit includes an unrelated malformed-index tolerance.
- **Weakened Checks:** Detected in CR-001.
- **False Completion:** The implementation audit's “no known implementation gap” claim is not supported by the ineffective no-early-finish assertions.
- **Scope Creep:** Detected in CR-002.
- **Unauthorized Actions:** None detected.
- **Self-Learning Action:** A Critical fable reflection is required after the reviewFix round. It was not written here because this review is authorized to write reports only under the plan directory.

## Recommendation

Do not Advance to Step 7. Run reviewFix and re-review; both Warnings must be closed.

**Apply fixes?** autoMode: apply the two concrete fixes above and re-review.
