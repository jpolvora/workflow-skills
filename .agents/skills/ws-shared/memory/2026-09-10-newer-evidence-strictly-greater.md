### [2026-09-10] Newer-evidence checks need strictly-greater revision comparison

- **Layer**: Harness
- **Module**: ws-monitor / detectStaleState revision race
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`; `test/test-local-first-precedence.js`
- **Scenario / Context**: The sibling-state revision race used greater-or-equal, so two state files with identical revisions (including legacy files without a revision field) were reported as newer evidence although neither was newer.
- **DO NOT**: Compare evidence freshness with greater-or-equal when the message claims a strictly newer revision, or ship a race branch without a two-sibling equal-revision test.
- **INSTEAD DO**: Use strictly-greater revision comparison for newer-evidence findings and cover both the equal-revision quiet case and the strictly-newer warning case in the precedence integration test.
