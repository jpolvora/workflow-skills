### [2026-09-17] edit_file find must match on-disk line endings byte-exact

- **Layer**: `devops`
- **Module**: `agent file edits`
- **Severity**: `Medium`
- **PathPattern**: `docs/**`
- **Scenario / Context**: While implementing spec 0091, an `edit_file` on
  `docs/assets/css/style.css` failed with "no exact match found" although the
  find block was visually identical to the `read_file` output. Root cause:
  `style.css` has CRLF on disk while the sibling `docs/index.html` is LF, and
  the read display normalizes endings. Retrying the same LF find text kept
  failing until the find was re-emitted with CRLF endings.
- **DO NOT**: Assume read-normalized text equals on-disk bytes, or retry an
  identical find block after an exact-match failure on a file with mixed-repo
  endings.
- **INSTEAD DO**: After one exact-match failure, check `git ls-files --eol
  <path>` (here: `style.css` CRLF, `index.html` LF) and re-emit the find text
  with the file's own line endings; keep the anchor block short and unique.
