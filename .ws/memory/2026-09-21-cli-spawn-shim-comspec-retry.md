### [2026-09-21] Win32 npm shims need a ComSpec retry, not shell:false or a .cmd suffix

- **Layer**: `Infrastructure`
- **Module**: `cli-spawn-shim`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/cli_spawn.cjs, .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs, .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs, .agents/skills/ws-spec-memo/scripts/*.cjs`
- **Scenario / Context**: AC3 switched spec-memo CLI probes from `shell: process.platform === 'win32'` to `shell: false` to keep spaced `--cwd` paths intact. Review threads (PR #377, score 7/10) correctly flagged the regression: on Windows, configured launchers like `memo` / `npx -y ...` resolve to `*.cmd` shims that `shell: false` cannot execute (bare name -> ENOENT). The suggested fix (append `.cmd`, keep `shell: false`) was empirically refuted on Node 22 win32: `spawnSync('x.cmd', { shell: false })` -> EINVAL, because batch files cannot execute without a shell at all.
- **DO NOT**: spawn a configured CLI bin with `shell: false` on win32 and assume npm shims resolve; nor "fix" it by appending `.cmd` while keeping `shell: false`; nor revert to `shell: true` with an argv array (re-splits spaced paths, the original AC3 defect).
- **INSTEAD DO**: route configured-CLI spawns through `spawnCliSync` (`ws-shared/runtime/scripts/cli_spawn.cjs`): first attempt `shell: false` everywhere, and only on win32 ENOENT retry once through ComSpec with a pre-quoted command line (`quoteCmdArg` + `shell: true` with a caller-quoted string) so PATHEXT shims resolve while spaced args stay intact. Cover with `test/test-cli-spawn-shim.js` (native passthrough, spaced argv, quoting units, missing-bin surfacing, win32-only live `.cmd` fixture test).
