### [2026-09-21] Config GUI rows must bind schema scalar types to matching controls

- **Layer**: `Domain`
- **Module**: `config-editor`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1, test/test-powershell-config-editor.js`
- **Scenario / Context**: PR #377 review thread (score 6) flagged `defaults.convergence.backoff` bound as `-Type 'string' -DefaultVal '1.5'` while `config.schema.json` declares it `number, minimum 1, default 1.5`. Saving through the GUI persisted `"1.5"` (a quoted string) and produced a schema-invalid config; runtime `Number()` coercion does not repair the persisted violation. The editor had no decimal control type, so the reviewer's `-Type 'number'` suggestion could not be applied as-is.
- **DO NOT**: Bind a numeric/boolean schema scalar to a `string` text row; apply a schema-type change without extending the editor's control vocabulary; rely on the runtime coercing a persisted string.
- **INSTEAD DO**: Add a `number` branch to `Add-ConfigFieldRow` (NumericUpDown with `DecimalPlaces`, persists `[double]`) alongside `int`/`bool`, bind `number`-typed schema keys to it, and enforce the invariant in `test-powershell-config-editor.js` (scalar-type parity map + numeric round-trip asserting `typeof === 'number'`). Keep GUI rows in lockstep with `config.schema.json` per the root AGENTS GUI-sync obligation.
