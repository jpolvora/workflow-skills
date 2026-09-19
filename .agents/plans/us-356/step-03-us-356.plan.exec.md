# Tasks — us-356 (sequential)

1. Implement `HOST_ADAPTERS` + `TRANSCRIPT_LIMITS` + sanitizer + WAL-safe bounded reader + per-workflow `transcriptSource` + `worker-session-stall` + budget in `monitor_snapshot.cjs`. [AC1, AC3, AC4, AC5, AC6]
2. Add `references/host-adapters.md` per-OS table; update `SKILL.md` (Muse entry, adapter pointer, transcriptSource/budget/sanitizer/read-only contract). [AC2]
3. Extend `test/test-ws-monitor.js` with AC1–AC6 regression tests (source present/absent, docs table presence via file check, zero host access default, locked/WAL fixture, redaction, large-fixture cap). [AC1–AC6]
4. Run `node test/test-ws-monitor.js` + relevant suite; verify score; review; ship PR.
