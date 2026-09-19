### [2026-09-19] Resolver fallback changes need global-free verification

- **Layer:** tests
- **Module:** ws-shared / skill script bootstraps / resolveHubSource
- **Severity:** High
- **PathPattern:** .agents/skills/*/scripts/*.{cjs,js}; .agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs
- **Scenario / Context:** Managed-runtime candidate chains (packaged, cwd-local, global, legacy .ws) resolve differently per machine. A Windows dev box usually has an ambient `%USERPROFILE%/.agents/skills` (or `$HOME/.agents/skills`) install, so a broken or missing fallback still loads from global and every local suite passes; the Linux CI runner has no global skills and fails (observed: MODULE_NOT_FOUND for http_retry.cjs in the consumer shim smoke after dropping the .ws fallback the installer still relies on, since ws-shared never ships into consumer .agents/skills).
- **DO NOT:** Trust local-only green suites for resolver/bootstrap edits, or remove a fallback candidate without proving which installs rely on it (installer package map + consumer-tree fixtures).
- **INSTEAD DO:** Reproduce the no-global condition explicitly (sanitized env: WORKFLOW_SKILLS_GLOBAL_DIR/HOME/USERPROFILE pointed at an empty dir) and prove which candidate gets selected; add a regression test with a partial consumer tree + full legacy copy that asserts no MODULE_NOT_FOUND and reaches usage.
