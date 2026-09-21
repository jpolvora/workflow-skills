### [2026-09-21] Transcript error heuristics must correlate the attempt outcome, not just error shape

- **Layer**: `Application`
- **Module**: `ws-monitor`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs, test/test-ws-monitor.js`
- **Scenario / Context**: `hasSubagentError` flagged a transcript whenever an exception marker (`fatal error`, `unhandled rejection`, `exception in subagent`) appeared together with trace shape (V8 `at` frames, Python traceback, Go goroutine). Issue #369 narrowed this to failure-shaped evidence, but the check never correlated the attempt outcome, so a run that failed and then succeeded on retry still produced a `subagent-error` finding. Review raised it twice: first at score 5 (declined as an ownership boundary), then at score 6 with a concrete recovery-suppression proposal; the second time it was fixed.
- **DO NOT**: Decide an "unhandled error" finding from a marker plus trace shape alone, and do not suppress on recovery evidence that appears anywhere in the text: a recovery line before a later failure would hide a real trailing error.
- **INSTEAD DO**: Locate the **last** failure evidence (iterate the trace regex with `lastIndex`), then search only the slice after it for recovery evidence (`retry` / `attempt N` within 200 chars of `succeeded|successful|completed`). Suppress only when the recovery follows the last failure. Cover both directions in tests with correlatable `--workflow-id` fixtures: recovered-after-failure stays silent; recovery-before-a-later-failure still reports.
