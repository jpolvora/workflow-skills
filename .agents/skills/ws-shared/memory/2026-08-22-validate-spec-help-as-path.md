### [2026-08-22] validate_spec leftover flags are not spec paths
- **Layer**: `Harness`
- **Module**: `ws-spec-format / validate_spec.cjs`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-format/scripts/validate_spec.cjs, test/test-spec-validation.js`
- **Scenario / Context**: `--help` was assigned to `options.spec`, then `path.resolve(cwd, '--help')` threw ENOENT
- **DO NOT**: Treat leftover argv tokens (including `--help`) as a spec filename
- **INSTEAD DO**: Print usage and exit 0 for `--help`/`-h`; reject other dash tokens as unknown arguments before any `readFileSync`
