# Testing Record — us-351 (Step 7)

## Full suite

`npm run tests` → **EXIT 0** (all chains: install/local+remote, hermes, doctor,
harness-efficiency incl. new `test-shared-hub-paths.js`, workflows, self-audit
`test-harness-clean.js` 0 findings, integrity `--check`).

## Targeted runs (all exit 0)

- `test-install.js --local` (fresh install/update/uninstall, `.ws/` tree+content,
  `.bak`, pointer, shims, integrity) — after `npm pack`.
- `test-ws-shared-layout.js` (global/project/legacy/pointer/links + new collision
  leave-both block).
- `test-shared-hub-paths.js` — 235 residuals allowlisted, 0 unlisted.
- `test-ws-doctor.js` (incl. fixed stale-retired + global-hybrid cases).
- `test-hermes-spec-to-pr-enhancements.js` (sabotage bites+restores on `.ws` fixture).
- `test-local-first-precedence.js` (updated `.ws` observable-default asserts).
- `test-workflow-state-contract.js` (manifest copied to fixture `.ws/runtime/`).
- `test-harness-clean.js` standalone — 0 findings.
- `node --check` over all 170 `.cjs`; `py_compile` over all edited `.py`.
- `scan_stack_invariants.cjs --files <touched>` — 0 issues.

## Consumer-fixture execution proof (the release-blocking class)

Pre-fix: fixture `test/.agents/skills/…` scripts died with `MODULE_NOT_FOUND`
(`../../ws-shared/…`, `parents[2]/"ws-shared"`). Post-fix: full install suite
executes consumer-tree `.cjs`/`.py` (shim `--help` smoke, `register_local_spec`
round-trip, coordinator/baton/monitor/specmemo/telemetry/config fixtures on `.ws`)
— all green in-suite. SoT-tree execution unchanged (packaged-first probe).

## Mutation gate

Not required (relocation + test updates; no defect class to mutate beyond the
hermes sabotage round, which bit and restored).
