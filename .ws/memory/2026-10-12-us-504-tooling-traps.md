### [2026-10-12] PowerShell text tools and integrity-before-suite

- **Layer**: tooling
- **Module**: ws-check-workflows, test runner
- **Severity**: Medium
- **PathPattern**: `test/**`, `.agents/skills/**/scripts/*.cjs`, `bin/skill-integrity.json`
- **Scenario / Context:** During us-504 delivery, three shell calls failed because `head`/`tail` do not exist on PowerShell, and the first full `npm run test` stopped at 1/162 on a stale `bin/skill-integrity.json` after editing hashed skill content.
- **DO NOT:** Pipe through `head`/`tail`/`grep` on PowerShell, or run `npm run test` right after editing hashed skill content without regenerating integrity.
- **INSTEAD DO:** Use `Select-Object -First` / `Select-String` on pwsh; after any edit under `.agents/skills/` or `bin/`, run `npm run generate-integrity` + `npm run verify-integrity` before `npm run test`.
