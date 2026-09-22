### [2026-09-22] Windows PowerShell has no head/tail/grep — use Select-Object/Select-String

- **Layer**: `devops`
- **Module**: `powershell-cli-vocabulary`
- **Severity**: `Medium`
- **PathPattern**: `*`
- **Scenario / Context**: During us-386 implementation on a Windows PowerShell host, piped `head`, `tail`, and `grep` failed repeatedly (`CommandNotFoundException`) because those are not PowerShell cmdlets; each failure burned a full tool round-trip before the equivalent ran.
- **DO NOT**: Pipe to `head -N`, `tail -N`, or `grep` in `muse.powershell` commands on Windows hosts; retry the same check behind another wrapper.
- **INSTEAD DO**: Use `Select-Object -First N` / `Select-Object -Last N` instead of head/tail, and `Select-String` (or `muse.search`) instead of grep. Prefer `muse.search` over shell scans for repo content.
