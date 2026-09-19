# Delivery Result — us-356

## Status
Shipped (PR open, unmerged — convergence + merge owned by master orchestrator).

## Delivered
Built-in host adapters for transcript/session discovery in `ws-monitor`
(Cursor, OpenCode, Antigravity, Muse): per-OS default locations behind the
existing opt-in flag, session-to-workflow correlation, bounded sanitized
reads, liveness + error-part signals. Strictly read-only (WAL-safe
copy-then-read), secrets/paths sanitized, per-tick time/read caps.

## Files
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- `.agents/skills/ws-monitor/SKILL.md`
- `.agents/skills/ws-monitor/references/host-adapters.md` (new)
- `test/test-ws-monitor-us356.js` (new)
- `package.json` (test-chain registration), `bin/skill-integrity.json` (regen)

## Evidence
`test-ws-monitor-us356: ok` + `test-harness-clean: 0 findings`.
