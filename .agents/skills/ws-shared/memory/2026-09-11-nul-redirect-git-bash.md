### [2026-09-11] Never redirect to nul under Git Bash

- **Layer**: `harness`
- **Module**: `shell recipes / cross-platform runtime`
- **Severity**: `Medium`
- **PathPattern**: `shell snippets in skills, tests, and agent commands; .agents/skills/ws-shared/runtime/CROSS-PLATFORM.md`
- **Scenario / Context**: A worker shell redirected git stderr with `2>nul` under Git Bash on Windows. Bash has no `NUL` device, so the redirect created a literal 482-byte file named `nul` at the repo root holding git CRLF warnings. The reserved name then breaks normal file reads and `rg` scans and needs extended-length (`//?/`) paths to inspect or delete.
- **DO NOT**: Use `>nul` / `2>nul` in bash (including Git Bash on Windows), or assume the Windows `NUL` device works outside cmd.exe.
- **INSTEAD DO**: Discard output with `>/dev/null` in bash; use `>NUL` only in cmd.exe and `$null` only in PowerShell (see `CROSS-PLATFORM.md` Commands and quoting rule 7).
