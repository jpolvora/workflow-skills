### [2026-09-19] Template substitution must use function replacements for variable values

- **Layer:** application
- **Module:** ws-shared / step baton runner templates
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/step_baton.cjs
- **Scenario / Context:** `substituteRunnerTemplate` passed substituted values (prompt/cwd paths, slug, step) directly as the `String.replaceAll` replacement string, so dollar-patterns in real values mis-substituted: `a$&b` became `a{prompt}b` and `x$'y` became `xy`, silently corrupting the worker argv path. Paths with spaces/quotes were already handled deliberately, but no test covered `$` metacharacters.
- **DO NOT:** Pass a variable value as the replacement argument to `String.replace`/`replaceAll` with a string pattern; assume paths never contain `$&`, `$'`, `$$`, or `$n`.
- **INSTEAD DO:** Use function replacements (`() => value`) so every value inserts verbatim; keep the dollar-pattern unit case (`$&`/`$'`/`$$`/`$1` across all four tokens) in `test/test-step-baton-config.js` green.
