### [2026-09-17] Shell byte-rewrite of tracked files and PowerShell chaining

- **Layer**: `devops`
- **Module**: `agent file edits / PowerShell`
- **Severity**: `High`
- **PathPattern**: `*`
- **Scenario / Context**: While implementing spec 0090, a PowerShell one-liner meant to normalize
  line endings rewrote four tracked files to 9 bytes (the regex pattern itself) because
  `[regex]'...'.Replace(...)` parsed as `String.Replace` (pattern returned unchanged) and
  the result was written back with `WriteAllBytes`. Recovery was `git checkout -- <paths>`.
  Separately, `cmd1 && cmd2` chaining failed: Windows PowerShell has no `&&` operator.
- **DO NOT**: Rewrite tracked file bytes in place from a PowerShell one-liner (regex
  replace + `WriteAllBytes`/`Set-Content`), assume working-tree CRLF equals stored bytes,
  or chain test commands with `&&` in PowerShell.
- **INSTEAD DO**: Make content changes only with the file editing tools; before reasoning
  about line endings run `git ls-files --eol <paths>` plus `git config core.autocrlf`
  (here: index blobs are LF, working-tree CRLF is checkout conversion, so LF inserts
  match the blobs and no normalization is needed). Chain PowerShell commands with `;`
  plus `if($LASTEXITCODE -ne 0){ exit 1 }`. After any shell file operation, verify byte
  counts/content before continuing.
