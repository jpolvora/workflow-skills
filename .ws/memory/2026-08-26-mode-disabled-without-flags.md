### [2026-08-26] mode disabled without flags re-enables local memory

- **Layer**: Shared
- **Module**: resolveMemoryRouting
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs`, `test/test-configurable-memory-backends.js`
- **Scenario / Context:** Incomplete config with `specMemo.mode` set (`disabled` / `local` / `vault` / `hybrid`) but without `enableMemoryFiles` / `enableSpecMemoIntegration` previously ignored mode (except legacy `enabled && vault`), so `mode: "disabled"` silently re-enabled in-repo MEMORY and `mode: "vault"|"hybrid"` alone mis-routed vault off.
- **DO NOT:** Default missing `enableMemoryFiles` to `true` without reading `specMemo.mode`; fix only the `disabled` branch and leave `vault`/`hybrid` alone incomplete.
- **INSTEAD DO:** When either flag is absent, derive both from the four-mode matrix (`disabled`/`local`/`vault`/`hybrid`); keep explicit boolean flags authoritative; cover mode-alone + override cases in unit tests.
