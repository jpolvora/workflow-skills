### [2026-08-21] skill-integrity.json CRLF fails --check

- **Layer**: 0
- **Module**: `bin/skill-integrity.json` / `generate-skill-integrity.js --check`
- **Severity**: High
- **PathPattern**: `bin/skill-integrity.json`
- **Scenario / Context**: On Windows, Git may check out `bin/skill-integrity.json` as CRLF. `--check` compares raw working-tree bytes to LF `stableStringify` output. Parsed hashes and `fullPackageDigest` can match while `npm run verify-integrity` still exits 1 (`stale vs current tree`).
- **DO NOT**: Treat matching skill digests as a passing integrity gate, or rewrite hashes by hand. Do not leave the manifest without `eol=lf`.
- **INSTEAD DO**: Keep `bin/skill-integrity.json text eol=lf` in `.gitattributes`. If `--check` fails, run `npm run generate-integrity` (LF rewrite) then `--check`. Confirm working-tree bytes have `crlf == 0`.
