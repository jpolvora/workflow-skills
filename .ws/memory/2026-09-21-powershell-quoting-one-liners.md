### [2026-09-21] PowerShell one-liner quoting breaks with nested double quotes and backticks

- **Layer**: Infrastructure
- **Module**: agent-shell
- **Severity**: Low
- **PathPattern**: N/A (session shell usage)
- **Scenario / Context**: While sweeping spec tracking state, two one-liners failed before passing: backtick-quoted slug construction inside a double-quoted command mangled `$slug` interpolation (parser error), and JSON-escaped `\"` paths reached PowerShell as literal backslash-quotes so plan-dir lookups silently returned empty.
- **DO NOT**: Nest double quotes or raw backticks inside PowerShell one-liners; trust empty results from a quoted path without re-checking unquoted.
- **INSTEAD DO**: Build one-liners from single-quoted strings, `[char]96` for backticks, and `Join-Path` for paths; re-run with plain quoting when a lookup returns suspiciously empty.
