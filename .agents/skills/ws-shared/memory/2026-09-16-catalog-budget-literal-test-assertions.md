### [2026-09-16] Root CATALOG.md edits hit the 24000 B context-budget cap and literal test assertions
- **Layer**: tests
- **Module**: CATALOG.md (upstream task router and skill inventory)
- **Severity**: Medium
- **PathPattern**: CATALOG.md
- **Scenario / Context**: Adding ws-wiki Sync Baseline wording to root CATALOG.md pushed the normalized size to 24036 B and failed test/test-context-budget.js (limit 24000 B, only ~15 B headroom). A follow-up reword then broke test/test-wiki.js, which asserts the literal substring `first-time spec sweep` in the task-router row. Both failures surfaced only when running the suite after the edit.
- **DO NOT**: Append or freely reword root CATALOG.md rows without measuring the normalized byte size and checking literal-string assertions used by test-wiki.js and test-context-budget.js.
- **INSTEAD DO**: Measure headroom first (`node test/test-context-budget.js`), keep asserted phrases intact, and use minimal suffixes (for example `sweep/baseline`) or compress wording in the same row so the file stays at or below 24000 B.
