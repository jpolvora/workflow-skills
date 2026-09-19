### [2026-09-02] ws-spec-memo is harness bridge not vault encyclopedia

- **Layer**: Other
- **Module**: ws-spec-memo / tools.md aliases
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-spec-memo/**`, `.agents/skills/ws-shared/tools.md`
- **Scenario / Context**: Agents wiring workflow-skills to spec-memo listed MCP tools (stale "10 tools" / "ninth MCP tool") inside `ws-spec-memo` and routed `update-ws-changelog` through the bridge skill. That duplicated `/ws-memo` (spec-memo package) and drifted when spec-memo added `prompt`.
- **DO NOT**: Catalog vault MCP/CLI commands in `ws-spec-memo`, count MCP tools, or execute append/upsert/bootstrap via the bridge when MCP is registered.
- **INSTEAD DO**: `ws-spec-memo` owns `config.json` flags, import, disable, hybrid fallback, and `check_spec_memo.cjs`. `/ws-memo` owns vault protocol. `read-memory` / `update-memory` / `update-ws-changelog` pick backends; the vault half loads `/ws-memo`.
