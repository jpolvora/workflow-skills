# Host transcript adapters (us-356)

Adapter data for `ws-monitor` opt-in transcript discovery. Host specifics live
here and in `monitor_snapshot.cjs` `getHostAdapters()` — never in the portable
skill contract. Discovery is strictly opt-in (`--discover-host-transcripts` or
`monitor.discoverHostTranscripts`); `monitor.hostHome` overrides the home used
for host-store discovery and path sanitizing (CI/sandbox/isolated profiles).
Default runs perform zero host-store reads.

All reads are read-only and bounded (recent-window tail, per-tick time/read
caps in `TRANSCRIPT_LIMITS`); SQLite-family stores are copy-then-read so a live
WAL database is never locked or modified. Findings carry sanitized evidence
only — tokens, prompt content, credentials, and absolute home paths (both the
OS home and the configured `monitor.hostHome`) are redacted before reporting.

## Default session locations

`<home>` = user home; `<appData>` = `%APPDATA%` (Windows),
`~/.config` (Linux), `~/Library/Application Support` (macOS).
`<repo>` = observed repository root (workspace class).

| Host | OS | Default location | Class | Store |
|------|----|------------------|-------|-------|
| Cursor | Windows | `<appData>/Cursor/User/workspaceStorage/` | user | sqlite (`state.vscdb`, WAL-safe copy-then-read) |
| Cursor | Linux | `~/.config/Cursor/User/workspaceStorage/` | user | sqlite (WAL-safe copy-then-read) |
| Cursor | macOS | `~/Library/Application Support/Cursor/User/workspaceStorage/` | user | sqlite (WAL-safe copy-then-read) |
| Cursor | any | `<repo>/.cursor/transcripts/`, `<repo>/.cursor/chats/` | workspace | file |
| OpenCode | any | `~/.opencode/sessions/` | user | file (JSONL) |
| OpenCode | any | `<repo>/.opencode/transcripts/`, `<repo>/.opencode/sessions/`, `<repo>/.opencode/logs/` | workspace | file |
| Antigravity | any | `~/.gemini/antigravity-ide/brain/<conversation-id>/.system_generated/logs/` | user | file (`transcript.jsonl`) |
| Antigravity | any | `<repo>/.agents/transcripts/`, `<repo>/.system_generated/logs/` | workspace | file |
| Muse | any | `~/.local/share/muse/sessions/YYYY/MM/DD/<session-id>/session.jsonl` (`$XDG_DATA_HOME/muse/sessions/...` when set) | user | file (JSONL) |

## Correlation

A scanned session is attributed to a workflow when its path or recent tail
mentions the workflow slug or id (normalized: lowercase, `/` separators).
Without the opt-in flag every workflow reports
`transcript-unavailable / discovery-disabled`; with the flag but no match,
`transcript-unavailable / no-matching-session`.

## Error parts

The recent-window tail is scanned for the three error classes — unhandled
errors (`subagent-error`), rejected/unavailable models (`model-fallback`),
turn ended before handoff (`turn-ended`) — which feed the existing
classifications. A session idle beyond `stallWindowMs` while its workflow is
active raises `worker-session-stall`.
