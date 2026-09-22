### [2026-09-21] Resolver precedence and same-installation coherence

- **Layer**: Tests / Workflow harness
- **Module**: ws-shared bootstrap (`bootstrap_runtime.cjs` + standalone fallback copies), `cli_spawn.cjs`
- **Severity**: High
- **PathPattern**: `.agents/skills/**/scripts/*.cjs`, `.agents/skills/**/scripts/*.js`
- **Scenario / Context**: Review threads flagged the runtime resolver checking the packaged copy before consumer-local/global roots, contradicting the documented local-first contract. Applying the suggestion literally (packaged strictly last) broke the repo's own spawned children: with a runtime-less cwd they resolved a stale machine-global runtime missing new modules (`test-ws-monitor-us356.js` child crash). The same class existed in 60 standalone fallback copies.
- **DO NOT**: Order resolver candidates packaged-first (ignores consumer-local overrides), nor packaged-last without checking same-installation coherence; do not apply reviewer-suggested reorderings without running the repo's own suite, which exercises foreign-cwd child spawns.
- **INSTEAD DO**: Order explicit override, repo-local, packaged same-installation copy, global root last; sweep the whole class with a deterministic EOL-preserving codemod (abort on non-unique anchors) plus an order verifier; cover with a local-beats-packaged precedence test and re-run `npm run test`, `test-harness-clean.js`, and integrity regen before ship.
