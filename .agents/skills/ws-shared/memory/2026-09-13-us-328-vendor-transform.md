### [2026-09-13] Reuse the vendor transform when re-applying generated-file rewrites

- **Layer**: `harness`
- **Module**: `ws-shared / renderConsumerAutoload`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/autoload.md; bin/cli.js`
- **Scenario / Context**: Regenerating the consumer mirror `.agents/skills/ws-shared/autoload.md` with a retyped inline regex under PowerShell silently dropped 18 skill-link captures (`](../../ws-x/SKILL.md)` became `(../)`), because shell quoting mangled the replacement token. Caught by diff review before commit; recovered via `git checkout` plus surgical edits, then proved installer-refresh stable with a temp script holding the verbatim vendor function.
- **DO NOT**: Retype a vendor rewrite (regex plus replacement string) into an inline shell one-liner; do not trust a regen diff without counting changed rows against the plan.
- **INSTEAD DO**: Reuse the vendor code path verbatim (`renderConsumerAutoloadText` in `bin/cli.js`) via a temp `.cjs` file, or make the minimal surgical edits directly; verify with `git diff` row counts plus an installer-refresh stability check (`render(current) === current`).
