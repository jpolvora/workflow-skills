### [2026-09-17] Windows PowerShell strips JSON CLI args
- **Layer**: devops
- **Module**: workflow-state-scripts
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-*/scripts/*.cjs
- **Scenario / Context**: Running `update_state.cjs` / `ac_ledger.cjs` from Windows PowerShell with inline JSON flags (`--gate-decision '{...}'`, `--test '{...}'`) fails: the shell strips the double quotes before the native `node.exe` sees them, so parsers receive `{gate:t,...}` and throw. Backslash escapes do not survive either (`--%` and `.cmd` files deliver literal backslashes).
- **DO NOT**: Pass inline JSON to workflow scripts from PowerShell and retry with more escaping when it fails.
- **INSTEAD DO**: For `ac_ledger.cjs --test` / `--alias-result` use the supported `key=value,comma-separated` format (no quotes needed). For `update_state.cjs finish`, write the payload to `{us-dir}/.runtime/step-0N-output.json` (auto-discovered `--step-output`) plus repeatable `--created` / `--modified` flags. For `--gate-decision` JSON, run the managed CLI in-process via a temp driver that overrides `process.argv` and requires the managed `update_state.cjs` (same code path, zero shell quoting).
