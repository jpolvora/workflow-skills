### [2026-09-19] GUI config rows must match schema types for structured keys

- **Layer:** application
- **Module:** ws-shared / config GUI editor
- **Severity:** High
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1
- **Scenario / Context:** Two new GUI rows bound JSON-object config keys with a plain string control. The string branch rendered `[string]$currentVal` (PowerShell object text, not JSON) and stored raw text on edit, so saving from the GUI replaced the object with a string and the next validation run failed. Same-class sweep found no other mistyped rows; object keys without any GUI row have no corruption vector.
- **DO NOT:** Bind a schema `object`/`array` key with `-Type 'string'` (or any control that renders `[string]$currentVal` and stores raw text) in the config GUI.
- **INSTEAD DO:** Bind structured keys with `-Type 'json'` (renders via `ConvertTo-Json`, parses via `ConvertFrom-Json`, tolerates invalid input by keeping the stored value); keep the static guard in `test/test-powershell-config-editor.js` (Test 9) green — it fails when any structured schema node is bound as a plain control.
