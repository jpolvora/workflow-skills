---
slug: per-task-test-adequacy-review
title: Review fix report (round 1)
status: completed
step: 6
workflowId: per-task-test-adequacy-review-20260930T081414Z
round: 1
---
## review-fix | round=1/3 | fixed=CR-001,CR-002,CR-003 | remaining=none

Fix mode (ws-implement-tasks) against round-1 findings, one surgical pass:

- CR-001 [Warning]: `ac_ledger.cjs` adequacy attach now appends to `row.adequacyHistory[]` (dedupe by event id), latest kept in `row.adequacy`. Anti-regression: multi-link history test (2 entries, latest governs, order preserved). Litmus: pre-fix HEAD ledger left history ABSENT after two links.
- CR-002 [Warning]: `checkBindings` now requires the test name within the sliced `[lineStart, lineEnd]` range with a distinct gap message. Anti-regression: out-of-range exits 1 + names the range; absent-anywhere keeps its message. Litmus: pre-fix HEAD helper exited 0 adequate on a false range.
- CR-003 [Suggestion]: orphan-rule bullet requires deriving `addedTests` from the task diff. Anti-regression: prose assertion.
- Fix adequacy (AC7 dogfood): `adequacy-FIX1.json` (taskId FIX1, AC1/AC3/AC5) validated adequate and ledger-linked.

Verification after fix: focused test green; full suite 149/149 green; ledger re-derived 10/10 at `pre-step6` (stale shas refreshed, corrected ranges linked); integrity regenerated + verified with changed digest; stack scan exit 0; all 6 adequacy records re-validate adequate. Re-review round 2: all findings closed, no regressions.

Learning: one durable trap recorded (`file:line validators must slice-check name containment`) — see `.ws/memory/2026-09-30-adequacy-range-containment.md`.
