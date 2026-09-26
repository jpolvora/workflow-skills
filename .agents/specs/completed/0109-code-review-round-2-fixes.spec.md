---
id: null
slug: code-review-round-2-fixes
title: "Harness Hardening Round 2 — Open Findings from the 20-Commit Read-Only Review"
source: local
specDate: 2026-09-20
status: completed
---

# Specification — Harness Hardening Round 2 — Open Findings from the 20-Commit Read-Only Review

## Description

Fix the open findings of a read-only review of the diff `dcc3aa10..origin/main` (the 20th previous commit vs the `main` merge point; the PR #364–#375 window), re-verified against the current tree so already-fixed topics are excluded.

Already fixed and out of scope here (spec `0108-code-review-findings-fixes`, implemented in `3cbdd0b9`/`257de1e5`, verified present): centralized `bootstrap_runtime.cjs`, `os.homedir()` in `check_hub_separation.cjs`, `StringDecoder` tail decoding in `monitor_snapshot.cjs`, banned `.ws/runtime` write audit, `test-bootstrap-runtime.js`.

Remaining findings span four themes: (a) multi-agent state/gate correctness (observer writes, coordinator gate, ship gate), (b) consumer/global install awareness and provider parity, (c) mandated GUI-schema-hub sync, (d) test integrity plus Node-only/Windows hardening.

### Review Findings Inventory

| ID | Severity | Finding (current tree) | AC |
|----|----------|-----------------------|----|
| F01 | high | `observer.cjs` mutates state without `revision` bump, plans-index refresh, or baton lock | AC1 |
| F02 | med | `observer.cjs` dispatch check+append is TOCTOU (no serialization) | AC1 |
| F03 | med | `step_coordinator.cjs` gate silently picks Next on unmatched/cancel input; `More options...` is a dead end | AC2 |
| F04 | med | `step_coordinator.cjs` spec-memo spawn `shell:true` splits win32 paths with spaces; stderr swallowed | AC3 |
| F05 | med | `ws-ship-pr/scripts/verify.cjs` falls back to `main` when base detection fails | AC4 |
| F06 | med | `check_unique_runtime.cjs` / `check_hub_separation.cjs` hardcode `.agents/skills`; false pass on relocated/global installs | AC5 |
| F07 | med | `check_memory_conflict.cjs` expands `~` with `process.env.HOME || ''` (wrong on Windows) | AC6 |
| F08 | med | `fix_pr_azure_context.cjs` drops `apiBase`; thread ops always hit `dev.azure.com` | AC7 |
| F09 | low | `sweep_prior_work.cjs` PR row uses `searchQuery` (GitHub) vs `searchText` (ADO); status semantics diverge | AC7 |
| F10 | low | `--specs-dir` documented but silently ignored when the organizer resolves the path | AC7 |
| F11 | high | GUI writes `issueTrackers.github.org`; runtime reads `owner` | AC8 |
| F12 | high | GUI enum persists `"false"` (string) for `fable.auditVerdictsBlockShip`; loader throws | AC8 |
| F13 | med | GUI default `rules.karpathyGuidelines` points at a retired skill; multiple schema keys unbound | AC8 |
| F14 | med | Root `AGENTS.md` `.ws/` hub row still describes managed runtime/templates inside `.ws/` | AC9 |
| F15 | high | `.ws/config.json` `$schema`/`toolsFile` and `.ws/STACK.md` link point at retired `.ws/runtime`; schema default stale | AC9 |
| F16 | med | `README.md` layout bullet and `FEATURES.md` (version 0.4.38, `run_sabotage.py`) stale | AC9 |
| F17 | med | Python-equivalent claims remain in `config-resolution.md`, provider `INTENTS.md`/`SKILL.md`, `ws-self-learning/SKILL.md` | AC9 |
| F18 | high | `test-provider-parity.js` PR-row loop is empty in CI: 8 alias assertions never execute | AC10 |
| F19 | med | `test-bootstrap-runtime.js` resolves against the machine global install | AC10 |
| F20 | med | `test-observer-us365.js` escape assertion accepts 0 or 1; leaves `%TEMP%/observer` residue | AC10 |
| F21 | low | `test-global-config-missing.js` refusal assertion passes when the phrase is absent | AC10 |
| F22 | med | `test/test-configure-auto.js` orphaned from the `npm test` chain | AC10 |
| F23 | med | `scripts/harness-benchmark` still targets `run_sabotage.py` / spawns `python`; scan roots blind to `scripts/` | AC11 |
| F24 | med | Installer `rmSync` retires `.ws` managed content without quarantine; global hub pointer text is project-worded; `update` ignores unknown flags | AC12 |
| F25 | low | `process.exit` before stdout drains; unconditional case-fold on POSIX; cross-drive transcript classified `workspace` | AC13 |
| F26 | low | Secrets scanner staged filter keeps `+++` headers; `rg` failure silently reports clean | AC14 |
| F27 | low | `build-site --bump` skips `test/package.json`; wiki links hardcode `develop`; `localeCompare` hash ordering; `.gitignore` report name; CI PR trigger omits `develop` | AC15 |

## Acceptance Criteria

- AC1: `observer.cjs` `recordAgentTranscripts` and `noteObserverDispatch` persist state through the canonical writer so `revision` increments, `{plansDir}/index.json` `stateSha256` matches the new state, and dispatch check+append is serialized under the baton lock so concurrent callers yield exactly one `observer-dispatch`.
- AC2: `step_coordinator.cjs` resolves unmatched or cancel input to `EXIT_BLOCKED` (never index 0), keeps `autoMode`/non-TTY defaults unchanged, and stops advertising `More options...` until a second page exists.
- AC3: The spec-memo mirror spawn in `step_coordinator.cjs` passes `--cwd` paths containing spaces intact on win32 and returns the child `stderr` in its failure `reason`.
- AC4: `ws-ship-pr/scripts/verify.cjs` fails closed (non-zero) when base detection fails and neither `master` nor `main` exists, honoring `SHIP_PR_BASE` when set.
- AC5: `check_unique_runtime.cjs` and `check_hub_separation.cjs` resolve the skills root from the consumer context/config (`pathTokens.skillsRoot`, resolved local or global root) and report findings for global-only or relocated installs.
- AC6: `check_memory_conflict.cjs` expands `~` with `os.homedir()` for `--memory` and `--shared-dir` and fails closed when no home can be resolved.
- AC7: `fix_pr_azure_context.cjs` threads `issueTrackers.azureDevOps.apiBase` (with `--api-base` override) into URL construction; GitHub and ADO `sweep_prior_work.cjs` emit the same PR-row field names/status semantics; tracker→spec scripts honor `--specs-dir` or the flag is removed from docs and parsers.
- AC8: The config GUI editor binds `issueTrackers.github.owner`, persists `fable.auditVerdictsBlockShip` `false` as a boolean, defaults `rules.karpathyGuidelines` to the packaged `ws-senior-developer` alias, binds the remaining schema keys used by the workflow, and `test/test-powershell-config-editor.js` asserts schema parity for those keys.
- AC9: Root `AGENTS.md`, `.ws/config.json`, `.ws/STACK.md`, `config.schema.json` default `toolsFile`, `README.md`, and `FEATURES.md` reference only the managed runtime under the skills install (no `.ws/runtime`), FEATURES lists existing script names and the current package version, and no Python-equivalent claim remains in reviewed docs.
- AC10: `test-provider-parity.js` asserts PR-row aliases on synthesized rows (no network/auth dependency, fails when the envelope is empty); `test-bootstrap-runtime.js` is hermetic (temp global dir, no machine install); `test-observer-us365.js` asserts the exact refusal and cleans its temp residue; `test-global-config-missing.js` asserts the refusal phrase directly; `test/test-configure-auto.js` runs in the `npm test` chain.
- AC11: `scripts/harness-benchmark/lib/paths.cjs` targets `run_sabotage.cjs`, `sensor.cjs` spawns `process.execPath`, and `test/test-unique-runtime.js` scans `scripts/` for Python residue.
- AC12: `retireProjectHubManagedContent` quarantines or requires explicit confirmation before deleting `.ws` managed content, global-scope pointer seeding writes scope-correct text or is skipped, and `update` fails closed on unknown flags.
- AC13: `run_sabotage.cjs`, `check_memory_conflict.cjs`, and `cleanup_workflow_git.cjs` let stdout drain (`process.exitCode`/sync write); `cleanup_workflow_git.cjs` case-folds only on win32; `monitor_snapshot.cjs` classifies cross-drive paths as `user`.
- AC14: `secrets_scanner.cjs` staged-mode added-line filter excludes `+++ b/<path>` headers and surfaces non-zero `rg` exits instead of reporting clean.
- AC15: `build-site --bump` updates the `test/package.json` tarball reference; wiki site branch links are parameterized (deployed builds point at `main`); integrity ordering uses codepoint comparison; `.gitignore` matches `ws-check-workflows-report.md`; CI `pull_request` trigger includes `develop`.

## Original Issue Context

Local synthesis. No tracker issue; `source: local`, `id: null`.

### Prior Work Sweep

- Spec `0108-code-review-findings-fixes` (PR #376 branch work, commit `3cbdd0b9`) fixed six topics from the same diff window; all are verified present in the current tree and excluded here.
- In-range work that is already correct: Python→Node port completed for shipped skills, hub separation (`4f9dc3fc`), portable path tokens (`12d03cd1`), step-baton/observer fail-closed gating (`e1f2d403`..`16f00d90`).
- Findings were re-verified against `HEAD` (working tree clean) before inclusion; items already resolved were dropped.

### Design Intent

Correctness first: state protocol and gates (AC1–AC5) protect multi-agent runs; consumer/global and provider parity (AC6–AC7) protect install portability; GUI/hub/test sync (AC8–AC11) protect the harness contracts; installer/Windows/tooling (AC12–AC15) are lower-risk hardening.

## Notes

- Node 22 CommonJS only; no new npm dependencies; no Python.
- ACs are independent; if the work must be split, ship AC1–AC8 first and defer AC13–AC15.
- Regenerate `bin/skill-integrity.json` for any changed hashed skill file, and run the pre-ship board before commit.
- Root `AGENTS.md` GUI-sync mandate applies to AC8: schema/example changes require editor updates in the same change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pinning GitHub Actions to commit SHAs | Supply-chain policy decision unrelated to this diff; tracked separately. |
| Rewriting `monitor_snapshot.cjs` on native SQLite bindings | Breaks zero-dependency Node portability (same exclusion as spec 0108). |
| Migrating external consumer projects' hub/memory layout | Consumer migration belongs to `bin/cli.js update` and `ws-configure-project`; this spec only fixes harness behavior and this repo's own hub files. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Observer writes can reuse the baton lock helper | `withBatonLock` around read-modify-write plus `refreshPlansIndexForState` | Same mechanism the coordinator uses for CAS; avoids a second locking scheme | y |
| Coordinator gate cancel vocabulary | Treat only explicit cancel/intent text as blocked; unknown input re-prompts once for TTY, blocked for non-TTY | Non-TTY automation must not hang; interactive typo must not dispatch | y |
| GUI boolean false representation | Bind as tri-state enum mapping `false`/`refuted`/`caveats` to schema types | Schema enum mixes boolean and string; writing the string `"false"` fails load | y |
| `--specs-dir` fate | Honor it by forwarding the override to `resolve_spec_path.cjs` | Keeps documented flag working with one small parser addition | y |
| Memory routing for this repo (no code change) | Leave resolver semantics as documented; correct the repo's own store/config in AC9 follow-up notes | Avoids changing shipped fallback behavior for consumers | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Target files are limited to the scripts, docs, GUI editor, tests, and hub files named in F01–F27 | Code inspection and `git diff --stat` |
| Zero External Dependencies | Node 22 standard library and PowerShell only; no new npm packages | `package.json` inspection |
| Stack Invariants | Node CommonJS conventions, portable path tokens, Node-only runtime preserved | `node test/test-unique-runtime.js`, `node test/test-runtime-portability.js` |
| Harness Cleanliness | Zero harness findings and green test chain after each increment | `node test/test-harness-clean.js`, `npm run test` |
| Traceability | Every F-id maps to exactly one AC | Inventory table above |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `npm run test` exits 0, including the strengthened `test-provider-parity.js`, `test-bootstrap-runtime.js`, `test-observer-us365.js`, `test-global-config-missing.js`, and the wired `test-configure-auto.js`.
- `node test/test-harness-clean.js` reports 0 findings; `node test/test-unique-runtime.js` covers `scripts/`.
- `node test/test-powershell-config-editor.js` exits 0 and fails on any GUI/schema binding regression.
- `node .agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs --json` reports a non-zero finding count in a global-only fixture before the fix and 0 after.
- `node .agents/skills/ws-spec-to-pr/scripts/observer.cjs note-dispatch ...` leaves `revision` incremented and the plans index hash consistent with the state file.

### Negative & Failing Test Scenarios

- State-write test (AC1) must fail if `revision` is unchanged or the plans-index `stateSha256` diverges after `record`/`note-dispatch`.
- Coordinator gate test (AC2) must fail if typing `cancel` or an unmatched token yields index 0 instead of `EXIT_BLOCKED`.
- Ship-gate test (AC4) in a fixture repo whose only branch is `develop` must fail if `verify.cjs` exits 0 instead of refusing `git diff main...HEAD`.
- Harness-gate test (AC5) must fail when skills live only under a temp `WORKFLOW_SKILLS_GLOBAL_DIR` with a `.py` file and the check reports clean.
- Home-expansion test (AC6) with `HOME` unset and `USERPROFILE` set must fail if `--memory ~/.agents/MEMORY.md` resolves to a drive root instead of the user profile.
- GUI round-trip test (AC8) must fail when selecting `false` persists the string `"false"` or when loading a config containing string `"false"` is not rejected.
- Provider parity test (AC10) must fail on an empty `pullRequests` envelope rather than silently skipping row assertions.
- CLI test (AC12) must fail if `update <dir> --unknown-flag` exits 0 or omits the offending flag.
- Secrets scanner test (AC14) must fail when a staged `+++ b/path` header alone produces a hit, or when an `rg` failure reports clean.
