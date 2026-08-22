### [2026-08-22] Nested-quote python -c must be audited
- **Layer**: `Harness`
- **Module**: `ws-audit / check_shell_quoting / extract_frontmatter_field`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-audit/**, .agents/skills/ws-check-harness/scripts/check_shell_quoting.cjs, .agents/skills/ws-shared/scripts/extract_frontmatter_field.cjs, .agents/skills/ws-shared/CROSS-PLATFORM.md`
- **Scenario / Context**: Agents invent `python -c` one-liners with both `"` and `'` (e.g. `["']` character classes) that raise `SyntaxError` under shell quoting. Recovery without logging left no upstream issue/PR/todo.
- **DO NOT**: Invent nested-quote `python -c` / `node -e` one-liners for frontmatter or YAML fields, or recover silently without an audit finding when `enableAuditing` is true.
- **INSTEAD DO**: Use `node {skillsRoot}/ws-shared/scripts/extract_frontmatter_field.cjs`. On `-c`/`-e` SyntaxError, run `classify-shell-failure`, append both findings, and present `draft-remediation` user-gate (issue / draft PR / todo / copy / skip). Static gate: `check_shell_quoting.cjs` in Phase 5a.
