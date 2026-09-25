### [2026-09-25] CRLF worktree edits and replacement-string interpolation

- **Layer:** Tests / DevOps
- **Module:** repo tooling (Windows checkout, `core.autocrlf=true`)
- **Severity:** Medium
- **PathPattern:** (.agents/skills|bin|test)/**
- **Scenario / Context:** This repo's blobs are LF but the Windows worktree checks out CRLF, so exact-match edits with `\n`-only anchors miss. Separately, Node `String.replace(old, new)` with a plain-string replacement interprets `$` patterns (`$&`, `$'`, `` $` ``) inside the NEW text and silently corrupts inserted code (this run: a `'\\$&'` escape idiom absorbed the following line into a string literal; `node --check` still passed and only the live test caught it).
- **DO NOT:** Feed `\n`-only anchors to an exact-match editor against a CRLF worktree file and assume a miss means the code moved; use `String.replace(match, newText)` with a plain-string replacement when the new text contains `$` (regex escapes, template literals, `$&` idioms).
- **INSTEAD DO:** Normalize (`readFileSync(...).replace(/\r\n/g, '\n')`) in a Node edit script, apply the replacement, and write back LF (blobs are LF, so diffs stay surgical under `autocrlf=true`); pass a replacer function (`() => newText`) or `split(anchor).join(newText)` whenever the inserted code contains `$`; re-run the touched area's live test after every scripted edit because syntax checks do not catch replacement interpolation.
