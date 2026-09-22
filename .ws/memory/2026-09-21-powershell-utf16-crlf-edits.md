### [2026-09-21] PowerShell redirection and CRLF edit mismatches on Windows

- **Layer**: devops
- **Module**: provider-snapshot-recipes
- **Severity**: Medium
- **PathPattern**: `*.issue.json`, `.ws/CHANGELOG.md`
- **Scenario / Context**: Running provider fetch-to-spec snapshot recipes and changelog inserts from Windows PowerShell during a spec import. Three attempts failed before passing: gh output redirected with `>` landed as UTF-16LE which the Node JSON converter rejected, and two exact-match edits missed because the target markdown uses CRLF while the match text used LF.
- **DO NOT**: Capture JSON for Node scripts with bare PowerShell `>` redirection; assume LF bytes when exact-matching edits inside CRLF files.
- **INSTEAD DO**: Write snapshot JSON as UTF-8 explicitly ([System.IO.File]::WriteAllText with UTF8Encoding no-BOM); for CRLF files either match CRLF bytes exactly or edit through encoding-preserving PowerShell (ReadAllLines plus WriteAllText with BOM detection).
