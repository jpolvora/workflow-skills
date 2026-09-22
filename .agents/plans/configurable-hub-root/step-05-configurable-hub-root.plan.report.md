# Step 5 — Check-implementation report (configurable-hub-root, spec 0115)

Score: **10/10** (minVerifyScore 9). Every AC maps to an implemented,
tested behavior; negative scenarios are committed batteries.

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 single resolver | pass | `ws-shared/runtime/scripts/resolve_hub_root.cjs` (new); `cli.js` loads it via `createRequire`, `configure_autoload.cjs` + `seed_generated_skill.cjs` via `require`; hub-layout reads flow through `consumerHubDir()` |
| AC2 installer honors hub | pass | `consumerHubDir()` → effective hub; bootstrap `config.json` fixed via `consumerConfigPath()`; manifests + local integrity under configured hub; `test-configurable-hub-root.js` install/update/uninstall fixtures green |
| AC3 configurator hub-relative + idempotent | pass | `hubRootFor`/`hubRelPosixFor` via resolver; nested-hub render/check round-trip + rerun byte-identical in committed test |
| AC4 generator under hub; classification follows | pass | seeder targets resolver hub; `expectedGeneratedRowPath` repo-relative uses hub rel; `hub-layout.json` gains a `hubRoot` note; graph `generatorManaged` unchanged |
| AC5 containment fail-closed + `--check` critical | pass | traversal/absolute/empty/symlink/unresolvable refused (`HUB_*`); `--check` emits critical + exit 1; committed unit + fixture cases |
| AC6 global-hybrid | pass | `--global-skills-root` run resolves generator ids from the global graph and renders hub-relative rows (committed test) |
| AC7 doc coherence | pass | `config-resolution.md` (relocatable-vs-fixed), `tools.md`, `hub-layout.json`, `.ws/AGENTS.md`, `README.md`, `CATALOG.md`, both skill bodies, schema + example wording |
| AC8 batteries + gates + one bump | pass | new suite registered in `test-suites.json`; `npm run test` exit 0; harness Phases 0–5c exit 0; `test-harness-clean` 0 findings; integrity regen + verify ok; single bump 0.4.51 → 0.4.52 |

Negative scenarios (all covered): hardcoded-`.ws` split (resolver is the only hub-root source), repo-root-relative generated links under nested hub (hub-relative rows asserted), body/manifest root split (single effective hub asserted), traversal/symlink escape (refused), `{skillsRoot}` token on generator rows (asserted absent), non-zero gates (all green).

Stack invariants: `scan_stack_invariants.cjs` 0 issues on all touched scripts; no `.py`; en-us docs with portable tokens; no retired literals (`.ws/runtime` untouched).
