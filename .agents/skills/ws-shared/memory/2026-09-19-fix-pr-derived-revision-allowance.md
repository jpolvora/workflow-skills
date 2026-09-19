### [2026-09-19] Post-exit tripwires must derive their allowance from the turn's own op trace

- **Layer:** application
- **Module:** ws-spec-to-pr / step coordinator revision guard
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs
- **Scenario / Context:** The post-exit revision guard accepted only `after.revision` in `[beforeClaim+1, beforeClaim+2]`, assuming the worker performs exactly one state write. But every `update_state` op bumps the revision, the worker contract never forbids `dispatch`, and the harness-wide convention is dispatch-before-finish — so a conforming dispatch+finish worker landed at +3 and the guard aborted a healthy, correctly-advanced step with exit 4 and a misleading STATE_CHANGED_UNDERFOOT. All fixtures were finish-only, so the real path was unasserted.
- **DO NOT:** Hardcode a fixed write-count ceiling into a post-exit guard; assume a worker performs exactly N state writes; adopt a telemetry-derived diff without per-line parse hardening and the full op-type vocabulary.
- **INSTEAD DO:** Baseline the telemetry stream at spawn and count the turn's own op events (`dispatch`/`finish`/`gate-bypass`, per-line parse, malformed lines skipped) to derive the allowed delta; keep one slack write for suppressed duplicate/idempotent finishes; pin both directions with tests (legitimate multi-write turn advances, out-of-band bump still exits 4).
