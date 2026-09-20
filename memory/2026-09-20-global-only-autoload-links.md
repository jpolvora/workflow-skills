### [2026-09-20] Global-only consumers: never hardcode project-relative managed links

- **Layer**: `Domain`
- **Module**: `managed-hub-links`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs, bin/cli.js`
- **Scenario / Context**: The hub-root autoload renderer hardcoded `../.agents/skills/ws-shared/runtime/` and `../.agents/skills/` prefixes while the same command supports global-only execution (`resolveRuntimeSource` + `emitSkillPath` already emit `{globalSkillsRoot}/...` rows for skills). A global-only project got `.ws/autoload.md` full of links into a project skills tree that does not exist, so agents could not load the runtime contract or referenced skills (PR #376 review thread, score 8/10).
- **DO NOT**: assume a project-local skills tree exists when rendering managed-hub links; use one scope flag for both runtime and per-skill links; ship a renderer without asserting the global-only output.
- **INSTEAD DO**: derive each link from on-disk existence (`{repoRoot}/.agents/skills/ws-shared/runtime` for the runtime prefix; `{repoRoot}/.agents/skills/<id>` per skill), fall back to `{globalSkillsRoot}/...` tokens, normalize previously rendered prefixes so refreshes converge, and assert both modes in tests (local fixture seeds the managed runtime; global-only fixture asserts tokens and absence of project-relative links).
