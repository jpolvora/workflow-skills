### [2026-09-24] ws-monitor liveness tests: discovery flag gates transcriptSource; absence assertions need scoping
- **Layer**: tests
- **Module**: ws-monitor / test-ws-monitor-liveness.js
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs; test/test-ws-monitor-liveness.js
- **Scenario / Context**: Writing the us-412/us-413 regression suite, the first run failed three times: (1) `--transcript-root <dir>` alone still reports `transcriptSource.status: transcript-unavailable / reason: discovery-disabled` because `resolveTranscriptSource` is gated on `--discover-host-transcripts` (or `monitor.discoverHostTranscripts`), so explicit-root runs that assert `available` must also pass the discovery flag; (2) a `--slug`-scoped snapshot omits workflows whose slug does not match, so a "ghost workflow reports scan-capped" assertion needed its own scoped invocation; (3) an idle-window sanity check compared `Date.now() - minutes` (epoch) against `stallWindowMs` (duration).
- **DO NOT**: Assume an explicit `--transcript-root` enables transcript source resolution; assert on workflows absent from a slug/workflow-id-scoped report; compare epoch timestamps with duration thresholds.
- **INSTEAD DO**: Add `--discover-host-transcripts` (or the config switch) to every monitor test that asserts `transcriptSource` while using explicit roots; run one scoped invocation per asserted workflow; compare durations with durations.
