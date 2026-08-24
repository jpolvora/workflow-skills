### [2026-08-22] Nested-quote python -c is forbidden
- **Layer**: `Harness`
- **Module**: `check_shell_quoting / extract_frontmatter_field`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-check-harness/scripts/check_shell_quoting.cjs, .agents/skills/ws-shared/scripts/extract_frontmatter_field.cjs, .agents/skills/ws-shared/CROSS-PLATFORM.md`
- **Scenario / Context**: Agents invent `python -c` one-liners with both `"` and `'` (e.g. `["']` character classes) that raise `SyntaxError` under shell quoting.
- **DO NOT**: Invent nested-quote `python -c` / `node -e` one-liners for frontmatter or YAML fields.
- **INSTEAD DO**: Use `node {skillsRoot}/ws-shared/scripts/extract_frontmatter_field.cjs`. Static gate: `check_shell_quoting.cjs` in Phase 5a.
