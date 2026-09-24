### [2026-09-24] ws-monitor watch profile: session-id correlation + Windows JSON reads

- **Layer**: Tests
- **Module**: ws-monitor
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs, test/test-ws-monitor-watch-profile.js, .agents/skills/ws-spec-provider-*/scripts/create_issue.cjs
- **Scenario / Context**: Adding a `--session-id` alternative transcript-correlation key to `ws-monitor` and inspecting JSON tool output while authoring the live watch profile.
- **DO NOT**: (1) AND a supplied session id with the workflow slug in `scanTranscriptRoots`; a host session often does not mention the slug, so the correlated file is filtered out and resolves `no-matching-session` (the new `--session-id` test failed exactly this way). (2) Parse UTF-8 JSON with `python -c "json.load(open(...))"` on Windows; the default cp1252 codec raises `UnicodeDecodeError` on non-ASCII bytes in the file.
- **INSTEAD DO**: (1) Treat `--session-id` as an **alternative** correlation key: `pass = matchesSession || base`, where `base` keeps the existing workflowId+slug AND semantics. (2) Parse JSON with Node (`JSON.parse(fs.readFileSync(file, 'utf8'))`) or pass an explicit encoding to Python. Note: the file `edit` tool preserves CRLF, so multi-line edits on CRLF files do not need a codemod.
