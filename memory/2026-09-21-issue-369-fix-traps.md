### [2026-09-21] Edit tool multi-line matches fail on CRLF files

- **Layer**: `Tests`
- **Module**: `agent-editing`
- **Severity**: `Medium`
- **PathPattern**: `.agents/specs/*.spec.md, **/*.md`
- **Scenario / Context**: While updating `.agents/specs/0107-us-369.spec.md` (CRLF endings), two exact-match edits with multi-line find strings failed with "no exact match found" even though the text was visually identical. Single-line find strings on the same file succeeded both times.
- **DO NOT**: Use multi-line find strings when editing CRLF files; retry the identical multi-line match expecting a different result.
- **INSTEAD DO**: Split the change into single-line find anchors (multi-line replacement text is fine) or normalize the read-modify inspection to line endings first. When a no-match error shows a near-identical closest match, suspect CRLF immediately.

### [2026-09-21] Monitor transcript-root is additive, so negative tests must scope by workflow

- **Layer**: `Domain`
- **Module**: `ws-monitor`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs, test/test-ws-monitor.js`
- **Scenario / Context**: A new benign-transcript negative test passed `--transcript-root <green-dir>` with no filter and falsely failed: `resolveCandidateTranscriptRoots` appends explicit roots to auto-discovered workspace roots (`.cursor/transcripts`), so an earlier true-positive fixture in the same temp root leaked into the green run. Adding `--workflow-id wf-green` scoped the scan to the green file only.
- **DO NOT**: Assume `--transcript-root` replaces discovery; run an unfiltered monitor assertion in a temp root that also holds positive fixtures.
- **INSTEAD DO**: Pass `--workflow-id` (or `--slug`) matching only the target transcript in every monitor test that asserts absence of findings, and keep positive and negative fixtures correlatable to distinct workflow ids.
