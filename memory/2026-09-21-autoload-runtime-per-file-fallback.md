### [2026-09-21] Autoload runtime links resolve local-first per file, not per directory

- **Layer**: `Domain`
- **Module**: `managed-hub-links`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/configure_autoload.cjs, bin/cli.js`
- **Scenario / Context**: PR #377 review threads (scores 6/6) flagged that the consumer autoload renderer picked the project-local runtime prefix from *directory* existence (`fs.existsSync(<repo>/.agents/skills/ws-shared/runtime)`) and applied it to every managed runtime link. A partial-hybrid install (local runtime dir present, sibling file missing) then rewrote a valid `{globalSkillsRoot}/ws-shared/runtime/<file>` link to `../.agents/skills/ws-shared/runtime/<file>`, which does not exist, so autoload consumers failed after refresh. `resolve_consumer_root.cjs` resolves each runtime file local-first with a global fallback, so directory presence is not equivalent to per-file availability.
- **DO NOT**: Choose a local-vs-global link prefix from directory existence; apply one prefix to a whole file list; trust a fixture that seeds a partial local runtime while asserting "no global tokens" (that expectation encodes the bug).
- **INSTEAD DO**: Resolve each link per file (`runtimePrefixFor(rel)` → local only when `<runtimeDir>/<rel>` exists, else `{globalSkillsRoot}` token) in both `configure_autoload.cjs` and `bin/cli.js`, capturing `rel` in every rewrite regex plus the bare-file loop. Update fixtures to model a partial local runtime explicitly: existing file stays project-relative, missing sibling keeps the global token. Keep the previous global-only trap (`2026-09-20-global-only-autoload-links.md`) as the no-local-tree case of the same rule.
