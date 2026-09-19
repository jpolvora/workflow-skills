### [2026-09-16] TTY-only interactive paths are not exercisable from agent shells
- **Layer**: tests
- **Module**: installer CLI interactive prompts (bin/cli.js)
- **Severity**: High
- **PathPattern**: bin/cli.js
- **Scenario / Context**: The host-target prompt for interactive `install --global` / `update --global` is gated on `process.stdin.isTTY`. Agent and CI shells are non-TTY and win32 has no pty, so the prompt branch cannot be exercised end-to-end; the fable-judge audit for the ship tree returned VERIFIED WITH CAVEATS because the claim "always asks" rested on code inspection plus unit-tested pre-selection and non-TTY regression tests.
- **DO NOT**: Claim an interactive prompt is verified when only the non-TTY path and pure helpers were executed, or gate prompt logic on untestable conditions without documenting the limit.
- **INSTEAD DO**: Extract prompt inputs and selection into pure helpers with unit tests, assert the help/contract text, keep the non-TTY reuse path fully tested, and state the TTY-only caveat in the ship verdict.
