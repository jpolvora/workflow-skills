### [2026-09-25] Monitor severity contract: status-literal beats shape-derived

- **Layer:** domain
- **Module:** ws-monitor
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs
- **Scenario / Context:** A new accuracy spec asked for tolerance on "terminal runs" while an existing suite (us-385 AC4) requires critical on a terminal-shaped but active run. The first implementation used terminalShape() for the tolerance and broke us-385.
- **DO NOT:** Derive severity tolerance from terminalShape() when the spec names a status; shape-derived terminal handling must never soften findings.
- **INSTEAD DO:** Gate tolerance on the literal `status === 'completed'` and keep every other status critical; shape-derived terminal handling stays informational (terminal-run-active) only.
