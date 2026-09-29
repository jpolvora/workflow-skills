### [2026-09-29] Docs-refresh editing traps

Layer: devops. Module: docs/site build. Severity: Medium.
PathPattern: `bin/build-site.js`, `docs/index.html`, `README.md`, `FEATURES.md`

Scenario: Multi-file docs refresh (site cards, catalog, wiki, llms.txt) plus
version bump and ship. Several self-inflicted failures before green.

DO NOT:
- Use `muse.edit_file` with a multi-line `find` spanning lines in CRLF files
  (`bin/build-site.js`, `docs/index.html`, wiki sources are CRLF here).
  Exact match fails on `\n` vs `\r\n`.
- Pass `node -e "..."` with double quotes through PowerShell (`muse.powershell`
  is Windows PowerShell, not bash). Quoting collapses and the script dies
  with a syntax error.
- Write bare `ws-shared/version.json` in docs prose. The harness link gate
  bans the shorthand; use `.agents/skills/ws-shared/version.json`.
- Leave the `efficiency-verifiability` template block ending in a double
  newline. The strip regex consumes one trailing newline per build, so the
  site gains one blank line per run and `--check` / doc-sync go stale.

INSTEAD DO:
- Anchor `muse.edit_file` on a single unique line, or append via a small
  `.cjs` file under `L:\tmp` run with `workdir` set to the repo root.
- Keep the site template block ending at exactly one newline after the
  end marker, and re-run `node bin/build-site.js --check` until
  "Site is current" before claiming the site is done.
- After any `bin/build-site.js` edit, run `npm run generate-integrity`
  in the same change (`bin/build-site.js` is hashed).
