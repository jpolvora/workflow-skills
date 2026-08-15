### [2026-08-08] configure_autoload CRLF and table regex traps
- **Layer**: Infrastructure
- **Module**: ws-configure-project / configure_autoload.py
- **Severity**: High
- **Scenario / Context**: Regenerating Always-applied tables in `autoload.md` and detecting absolute skill paths across Windows Node tests + Python helpers
- **DO NOT**: Use DOTALL with `\|.*\|` to match markdown table rows (it can swallow later sections that contain `|`). Do not treat URL schemes like `https://` as Windows drive paths (`[A-Za-z]:/`). Do not assume Node `fs.readFileSync` and Python `Path.read_text` share newline semantics on Windows (Node keeps CRLF; Python often normalizes to LF).
- **INSTEAD DO**: Match table rows with `\|[^\r\n]*\|\r?\n`; detect drives with `(?<![A-Za-z0-9])[A-Za-z]:[\\/]`; make JS test table rewrites `\r?\n`-aware; keep absolute-path allowlists focused on author-machine roots (`C:\`, `/Users/`, `/home/`, `/opt/`).
