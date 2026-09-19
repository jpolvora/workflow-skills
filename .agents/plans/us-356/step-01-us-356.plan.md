# Implementation Plan — us-356: host adapters for transcript/session discovery in ws-monitor

## Scope
`ws-monitor` snapshot scripts + docs only. No dispatch, provider, or state-schema changes.

## Touchpoints
1. `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` — adapter table, opt-in discovery, bounded WAL-safe reads, sanitizer, per-workflow `transcriptSource`, liveness signal, budget caps.
2. `.agents/skills/ws-monitor/SKILL.md` — Muse host entry, adapter-table pointer, `transcriptSource` + budget + sanitizer contract.
3. `.agents/skills/ws-monitor/references/host-adapters.md` — NEW per-OS default location table (Cursor, OpenCode, Antigravity, Muse).
4. `test/test-ws-monitor.js` — extend (AC1–AC6 regression tests).

## Design
- `HOST_ADAPTERS`: data-only table `{ id, locationClass: workspace|user, storeKind: file|sqlite, paths(platform, home, repoRoot) }`. Host specifics stay adapter data; portable contract unchanged.
- Opt-in: user-level host roots are only resolved when `--discover-host-transcripts` or `monitor.discoverHostTranscripts` is set. Default snapshot performs zero host-store reads (`transcript.hostStoreReads === 0`) and each workflow reports `transcriptSource: { status: 'transcript-unavailable', reason: 'discovery-disabled' }`.
- Correlation keys (slug, workflowId, branch, workspace dir basename, run window via file mtime) normalized (lowercase, separators, basename) before matching; no match → `reason: 'no-matching-session'`.
- Bounded WAL-safe reads: tail-only (`MAX_BYTES_PER_FILE = 256KB`), `MAX_FILES_PER_TICK = 200`, `MAX_TOTAL_BYTES = 4MB`, `MAX_MS_PER_TICK = 2000`. SQLite-family files (`*.db/*.sqlite/*.vscdb`, plus `-wal`/`-shm` sidecars) are copy-then-read via temp copy; regular files read with explicit read-only flag. No locks, no writes to source.
- Sanitizer: redact tokens/credentials (`sk-`, `ghp_`, `gho_`, `xox-`, `AKIA`, `Bearer`, `api[_-]?key`, `client_secret`, `passwd`), then collapse absolute home/appdata paths to `<home>`/`~`. Applied to scanned text before pattern matching evidence and to reported paths.
- Signals: per-workflow `transcriptSource { status, adapter, locationClass, reason }`; worker-session liveness → `worker-session-stall` warning when session mtime is older than the stall window while workflow is active; transcript error parts (unhandled errors, rejected/unavailable models, turn-ended-before-handoff) feed existing `subagent-error` / `model-fallback` / `turn-ended` codes.
- Snapshot `transcript` block gains `{ roots (sanitized), filesScanned, bytesRead, elapsedMs, capped, hostStoreReads }`.

## AC mapping
- AC1: `transcriptSource` per workflow — fixture with/without sessions.
- AC2: `references/host-adapters.md` per-OS table + SKILL pointer.
- AC3: zero host-store access without flag.
- AC4: copy-then-read + read-only flags; locked/WAL fixture test.
- AC5: redaction test with planted secrets.
- AC6: caps + timing/size assertion on large fixture.

## Negative scenarios
- No session → `transcript-unavailable`, never empty source.
- Locked live DB → snapshot succeeds, source untouched.
- Planted secret → redacted in findings/evidence.
- Oversized history → tail-only, completes within cap.

## Verification
- `node test/test-ws-monitor.js` (extended) + `npm run test` for touched area.
