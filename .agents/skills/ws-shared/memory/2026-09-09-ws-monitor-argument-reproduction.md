### [2026-09-09] ws-monitor missing-value reproduction

- **Layer:** Tests
- **Module:** ws-monitor argument parsing
- **Severity:** Medium
- **PathPattern:** `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`; `test/test-ws-monitor.js`
- **Scenario / Context:** Reproducing a missing `--iterations` value from Git Bash on Windows while checking that watch mode cannot remain unbounded.
- **DO NOT:** Put a boolean flag after the intentionally missing value, because the parser may treat that flag as the value; assume `/tmp` output paths map to the repository drive.
- **INSTEAD DO:** Place boolean flags before the missing value, for example `--watch --json --iterations`, and use a repository-relative output path or a platform-resolved temporary path.
