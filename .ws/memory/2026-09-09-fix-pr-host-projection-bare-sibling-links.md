### [2026-09-09] Host projection bare sibling link resolution
- **Layer**: `Harness`
- **Module**: `ws-shared / compile_host_subagents.cjs`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs;test/test-specialized-subagents-compiler.js`
- **Scenario / Context**: Compiling canonical skills into host-native specialized subagent definitions (`.cursor/agents`, `.claude/agents`).
- **DO NOT**: Leave bare sibling-relative markdown links (`TEMPLATE.md`, `references/...`, `*.md`) unresolved in projected agent definitions, which causes models and IDEs executing from projection directories to fail locating companion templates, checklists, and dispatch specs.
- **INSTEAD DO**: Pass the canonical skill ID to projection link rewriters and rewrite bare sibling-relative markdown links to canonical skill paths (`../../.agents/skills/${skillId}/...`), preserving external, anchor, and macro tokens.
