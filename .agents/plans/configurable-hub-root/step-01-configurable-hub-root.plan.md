# Plan — configurable-hub-root (0115)

## Goal
Make `pathTokens.sharedDir` a first-class, single-sourced hub root: one resolver,
installer + configurator + generator + layout reads all call it, containment
fail-closed, docs coherent, batteries green.

## Contract decisions (from spec assumptions)
- Bootstrap discovery is ALWAYS `<repo>/.ws/config.json` (fixed filename, fixed
  parent). A relocated hub keeps its bootstrap copy there.
- `config.json` itself is FIXED at the bootstrap path (never relocates). This is
  what makes discovery single-sourced with no sync hazard.
- Everything else hub-hosted relocates: `autoload.md`, `AGENTS.md` pointer,
  `installed-skills.json`, `skill-integrity-local.json`, `STACK.md`,
  `ws-project-patterns/`, `.gitignore`, `host-capabilities.json`.
- `pathTokens.skillsRoot` semantics unchanged (fixed `.agents/skills`).

## Tasks
1. NEW `{skillsRoot}/ws-shared/runtime/scripts/resolve_hub_root.cjs`
   - `resolveHubRoot(repoRoot)` → `{ hubRoot, hubRel, configured, bootstrapConfigPath, sharedDir }`.
   - Reads bootstrap `<repo>/.ws/config.json`; `pathTokens.sharedDir` when a
     non-empty string, else `.ws`. Absolute paths, drive letters, `~`, empty/`.`,
     `..` segments → throw `HUB_*` error. Realpath containment (repo root real vs
     hub real, `realpathLoose` deepest-ancestor) fail-closed for configured AND
     default roots. CLI mode prints JSON / exit 2 on refusal. No deps.
2. `configure_autoload.cjs`: `hubRootFor()` delegates to resolver (fail-closed →
     `process.exit(1)` with `HUB_*` message); `loadConfigJson`/`setAutoload*`
     stay on bootstrap `.ws/config.json`; autoload/pointer/generated-row/root
     links via effective hub; `expectedGeneratedRowPath` repo-relative uses
     hub rel (`config/hub/<id>/SKILL.md`); `--check` emits critical on
     resolution failure + hub-rel labels; pointer/template prose hub-aware.
3. `seed_generated_skill.cjs`: target via resolver; keep full-path realpath gate.
4. `bin/cli.js` (ESM): load resolver via `createRequire` (package copy, fallback
     to fixed `.ws` when missing); `consumerHubDir()` → effective hub (project
     scope); new `consumerConfigPath()` → bootstrap fixed; `hubDisplay()` shows
     hub rel; `ensureSharedConsumerArtifacts` splits config (bootstrap) vs
     content (effective hub); `relocateLegacyHub` dest effective;
     `renderConsumerAutoloadText` hub-relative prefixes (`../`.repeat(depth)) +
     generalized `(?:\.\./)+` rewrites, per-file local-first preserved;
     `preserveGeneratorAutoloadRows` existence check under effective hub;
     migration/uninstall/integrity flow through `consumerHubDir()`.
5. Schema + example: `pathTokens.sharedDir` documented as relocatable hub root
     (relative, contained, bootstrap fixed); `pathTokens` object comment updated;
     `skillsRoot` stays fixed.
6. `hub-layout.json`: add `hubRoot` note object (validation only checks
     version+categories; layout paths are hub-relative so they work under any root).
7. Docs: `config-resolution.md` (bootstrap + relocatable-vs-fixed table),
     `tools.md` (path tokens), `.ws/AGENTS.md` pointer note, `README.md`,
     `CATALOG.md`, `ws-configure-project/SKILL.md` + `ws-patterns-generator/SKILL.md`
     fixed-hub statements updated. No retired literals; token wording.
8. Batteries: NEW `test/test-configurable-hub-root.js` (resolver unit incl.
     traversal/absolute/symlink/missing-config; configurator nested-hub
     render+check round-trip incl. idempotence; escaping-hub check-critical;
     generator seeding under configured hub; installer install/update fixture
     with configured hub incl. manifest+integrity consistency; migration keeps
     configured hub). Register in `test-suites.json`. Keep existing suites green.
9. Ship: version bump 0.4.51→0.4.52 (package.json + packageVersion + footer via
     `build-site:bump`), `generate-integrity` + `verify-integrity`,
     `npm run test`, `ws-check-harness`, site rebuild.

## Verify (score ≥ 9 bar)
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=compat`
  on the spec; AC1–AC8 each mapped above; negative scenarios as tests.
- `scan_stack_invariants.cjs` on touched scripts; no `.py`; en-us docs.

## Risks
- cli.js ESM/require interop → `createRequire`, guarded fallback.
- Existing installer/autoload/patterns tests assume `.ws` → default behavior
  unchanged when `sharedDir` absent, so they stay green.
- `.ws/AGENTS.md` hub budget (14 000 B) → measure after edits.
