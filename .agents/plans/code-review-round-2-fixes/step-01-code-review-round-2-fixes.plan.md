---
superseded: true
supersededBy: step-02-code-review-round-2-fixes.plan.refined.md
slug: code-review-round-2-fixes
title: Harness Hardening Round 2 — Open Findings from the 20-Commit Read-Only Review
status: completed
step: 1
workflowId: code-review-round-2-fixes
startedAt: "2026-09-20T23:51:06.000Z"
endedAt: "2026-09-20T23:51:06.000Z"
acRefs: []
---
## 0. Summary & Business Rules

Fix the 27 open findings (F01–F27) from the read-only review of `dcc3aa10..origin/main`, grouped into 15 acceptance criteria. Priority order: (a) multi-agent state/gate correctness — AC1–AC5; (b) consumer/global install awareness and provider parity — AC6–AC7; (c) mandated GUI-schema-hub sync — AC8–AC9; (d) test integrity plus Node-only/Windows hardening — AC10–AC15.

Business rules: Node 22 CommonJS only, no new npm dependencies, no Python. Every changed hashed skill file requires `bin/skill-integrity.json` regeneration. GUI/schema changes ship with editor updates in the same change (root `AGENTS.md` mandate). Memory guidance applied: check CRLF line endings before exact-match edits on `.cjs` files; construct banned retired-path checks dynamically so static path scanners stay clean; verify cross-module helper exports before writing dependent tests.

## 1. Definition of Ready & Scope

- **In-Scope**: the scripts, GUI editor, tests, docs, and hub files named in F01–F27 only (see tasks below).
- **Out of Scope**: pinning GitHub Actions to SHAs; rewriting `monitor_snapshot.cjs` on native SQLite bindings; migrating external consumer projects' hub/memory layout.
- **Resolved assumptions** (from spec): observer writes reuse the baton lock helper (`withBatonLock` + `refreshPlansIndexForState`); coordinator cancel vocabulary treats explicit cancel/intent text as blocked, unknown TTY input re-prompts once, non-TTY is blocked; GUI `false` binds as schema-typed boolean; `--specs-dir` is honored by forwarding the override to `resolve_spec_path.cjs`.
- **Acceptance Criteria**: AC1–AC15 per `step-00-code-review-round-2-fixes.spec.md` (15 items, each with ≥1 task and ≥1 §5 test mapping below).
- **DoR verification**: `git diff --stat` bounded to named files; `package.json` unchanged (no new deps); `node test/test-unique-runtime.js`, `node test/test-runtime-portability.js`, `node test/test-harness-clean.js`, `npm run test` green; every F-id maps to exactly one AC per the spec inventory table.

## 2. Technical Design & Architecture

- **Layers touched** (per `.ws/config.json` stack `node-skills-package`): `skills-sot` (`.agents/skills/**` scripts, GUI editor, runtime docs), `installer-cli` (`bin/**`), `tests` (`test/**`). No frontend/db layers.
- **State protocol (AC1)**: `recordAgentTranscripts` and `noteObserverDispatch` in `.agents/skills/ws-spec-to-pr/scripts/observer.cjs` currently do read-modify-write via `readJson` + direct mutate + `syncStateDualWrite` without a `revision` bump, without plans-index refresh, and (dispatch) without serialization. Design: wrap both mutations in the baton lock helper the coordinator uses for CAS (`withBatonLock` around read-modify-write), bump `revision` through the canonical state writer path, call `refreshPlansIndexForState` so `{plansDir}/index.json` `stateSha256` matches, and hold the lock across dispatch check+append so concurrent callers yield exactly one `observer-dispatch` record.
- **Coordinator gate (AC2–AC3)**: gate options at `step_coordinator.cjs` (~line 557 `['Next', 'More options...']`) silently resolve unmatched/cancel input to index 0. Design: resolve unmatched or explicit cancel/intent text to `EXIT_BLOCKED` (const at line 72), keep `autoMode`/non-TTY defaults unchanged (non-TTY blocked, TTY re-prompt once), and drop `More options...` until a second page exists. Spec-memo mirror (`mirrorSpecMemo`, ~line 433; `shell: process.platform === 'win32'` at ~line 451) splits win32 spaced paths and drops stderr: pass `--cwd` as an argv element without shell splitting on win32 (no `shell:true` string-splitting) and include captured `stderr` in the failure `reason`.
- **Fail-closed gates (AC4–AC6)**: `ws-ship-pr/scripts/verify.cjs` falls back to `main` when base detection fails — change to non-zero exit honoring `SHIP_PR_BASE`, refusing when neither `master` nor `main` exists. `check_unique_runtime.cjs` / `check_hub_separation.cjs` hardcode `.agents/skills` — resolve the skills root from consumer context/config (`pathTokens.skillsRoot`, resolved local or global root) so global-only/relocated installs report findings. `check_memory_conflict.cjs` expands `~` via `process.env.HOME || ''` — use `os.homedir()` for `--memory`/`--shared-dir`, fail closed when unresolvable.
- **Provider parity (AC7)**: thread `issueTrackers.azureDevOps.apiBase` (plus `--api-base` override) into `fix_pr_azure_context.cjs` URL construction; align GitHub/ADO `sweep_prior_work.cjs` PR-row field names and status semantics (`searchQuery` vs `searchText`); forward `--specs-dir` into `resolve_spec_path.cjs` in tracker→spec scripts (docs already promise the flag).
- **GUI-schema sync (AC8)**: `Edit-WorkflowSkillsConfig.ps1` writes `issueTrackers.github.org` (runtime reads `owner`), persists string `"false"` for `fable.auditVerdictsBlockShip` (loader throws), defaults `rules.karpathyGuidelines` at a retired skill, and leaves schema keys unbound. Design: bind `issueTrackers.github.owner`, map the tri-state enum to schema types (boolean `false`, never string), default `karpathyGuidelines` to the packaged `ws-senior-developer` alias, bind remaining workflow-used schema keys, extend `test/test-powershell-config-editor.js` with parity asserts.
- **Docs/hub sync (AC9)**: single sweep replacing retired `.ws/runtime` references with the managed skills-install runtime across root `AGENTS.md`, `.ws/config.json` (`$schema`/`toolsFile`), `.ws/STACK.md`, `config.schema.json` default, `README.md`, `FEATURES.md` (version + real script names), and Python-equivalent claims in `config-resolution.md`, provider `INTENTS.md`/`SKILL.md`, `ws-self-learning/SKILL.md`.
- **Invariants from config**: `commitPlanFilesOnlyAtStep8: true` (no product commits in this planning step or during implementation until Step 5 G2); `skipQualityGates: false`.

## 3. Step-by-Step Plan

### Task 1: Observer state writes through canonical path under baton lock (AC1)

- **Target files**: `.agents/skills/ws-spec-to-pr/scripts/observer.cjs` (`recordAgentTranscripts`, `noteObserverDispatch`); shared state helpers (`workflow_state.cjs` / `syncStateDualWrite`, `refreshPlansIndexForState`, `withBatonLock` — reuse, do not duplicate).
- **Actions**: wrap both mutations in `withBatonLock` read-modify-write; route persistence through the canonical writer so `revision` increments; call the plans-index refresh so `stateSha256` matches; hold the lock across dispatch check+append for exactly-once `observer-dispatch`.
- **Checks**: line-ending check first (CRLF-safe edit); verify helper exports via smoke-require before test edits.

### Task 2: Coordinator gate fail-closed on unmatched/cancel input (AC2)

- **Target file**: `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` (gate options ~line 557, `EXIT_BLOCKED` line 72).
- **Actions**: map unmatched tokens and explicit cancel/intent text to `EXIT_BLOCKED`, never index 0; preserve `autoMode`/non-TTY defaults (non-TTY blocked, TTY single re-prompt); remove `More options...` advertisement until a second page exists.

### Task 3: Spec-memo mirror spawn win32-safe with stderr in reason (AC3)

- **Target file**: `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` (`mirrorSpecMemo` ~line 433, spawn ~line 451).
- **Actions**: pass `--cwd` intact on win32 (argv-element, no shell string-split of spaced paths); propagate child `stderr` into the failure `reason`.

### Task 4: Ship verify fails closed without a base branch (AC4)

- **Target file**: `.agents/skills/ws-ship-pr/scripts/verify.cjs`.
- **Actions**: honor `SHIP_PR_BASE` when set; when base detection fails and neither `master` nor `main` exists, exit non-zero instead of diffing a guessed base.

### Task 5: Harness checks resolve the consumer skills root (AC5)

- **Target files**: `.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs`, `.agents/skills/ws-check-harness/scripts/check_hub_separation.cjs` (plus `resolve_consumer_root.cjs` reuse).
- **Actions**: resolve the skills root from consumer context/config (`pathTokens.skillsRoot`, local-or-global resolution); report findings for global-only/relocated installs. Construct any retired-path audit string dynamically (e.g. `['.ws','runtime'].join('/')`) so `test-shared-hub-paths.js` stays clean.

### Task 6: Home expansion via os.homedir with fail-closed (AC6)

- **Target file**: `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs` (`--memory`, `--shared-dir`).
- **Actions**: expand `~` with `os.homedir()`; fail closed (non-zero) when no home resolves. Use `process.exitCode`/sync writes for drain (see Task 13).

### Task 7: Provider parity — apiBase, PR rows, specs-dir (AC7)

- **Target files**: `fix_pr_azure_context.cjs`; GitHub + ADO `sweep_prior_work.cjs`; tracker→spec scripts (`github-issue-to-spec.cjs`, `ado-workitem-to-spec.cjs`) + `resolve_spec_path.cjs` call sites and their docs/parsers.
- **Actions**: thread `issueTrackers.azureDevOps.apiBase` with `--api-base` override into URL construction; unify PR-row field names/status semantics across providers; forward `--specs-dir` override (documented flag keeps working).

### Task 8: Config GUI editor schema sync + parity tests (AC8)

- **Target files**: `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1`; `test/test-powershell-config-editor.js`; `config.schema.json` / `config.json.example` as reference.
- **Actions**: bind `issueTrackers.github.owner`; persist `fable.auditVerdictsBlockShip` `false` as boolean; default `rules.karpathyGuidelines` to packaged `ws-senior-developer` alias; bind remaining workflow-used schema keys; add round-trip + schema-parity asserts (string `"false"` rejected, boolean `false` persisted).

### Task 9: Hub/docs sync off retired runtime paths and Python claims (AC9)

- **Target files**: root `AGENTS.md`; `.ws/config.json`; `.ws/STACK.md`; `config.schema.json`; `README.md`; `FEATURES.md`; `.agents/skills/ws-shared/runtime/config-resolution.md`; provider `INTENTS.md`/`SKILL.md` (GitHub + ADO); `.agents/skills/ws-self-learning/SKILL.md`.
- **Actions**: reference only the managed runtime under the skills install (no `.ws/runtime`); FEATURES lists existing script names + current package version; remove Python-equivalent claims. Leave memory-resolver semantics unchanged (spec assumption, unconfirmed) — correct only this repo's store/config.

### Task 10: Harden provider/observer/config tests, wire orphan suite (AC10)

- **Target files**: `test/test-provider-parity.js`; `test/test-bootstrap-runtime.js`; `test/test-observer-us365.js`; `test/test-global-config-missing.js`; `test/test-configure-auto.js`; `package.json` (`npm test` chain).
- **Actions**: parity asserts run on synthesized PR rows with zero network/auth and fail on empty envelopes; bootstrap test uses a temp global dir (hermetic); observer test asserts the exact refusal and removes `%TEMP%/observer` residue; global-config test asserts the refusal phrase directly; wire `test-configure-auto.js` into `npm test`.

### Task 11: Benchmark Node-only paths + Python-residue scan scope (AC11)

- **Target files**: `scripts/harness-benchmark/lib/paths.cjs`; `scripts/harness-benchmark/lib/sensor.cjs` (or equivalent sensor); `test/test-unique-runtime.js`.
- **Actions**: target `run_sabotage.cjs`; spawn `process.execPath`; extend the unique-runtime scan to `scripts/` for Python residue.

### Task 12: Installer quarantine/scope-correct text/strict flags (AC12)

- **Target file**: `bin/cli.js` (`retireProjectHubManagedContent`, pointer seeding, `update` flag parsing).
- **Actions**: quarantine or require explicit confirmation before deleting `.ws` managed content; global-scope pointer seeding writes scope-correct text or is skipped; `update` fails closed naming the unknown flag.

### Task 13: Stdout drain, win32-only case-fold, cross-drive classification (AC13)

- **Target files**: `scripts/harness-benchmark/lib/run_sabotage.cjs` (or packaged `run_sabotage.cjs`); `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs`; `cleanup_workflow_git.cjs`; `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
- **Actions**: drain stdout via `process.exitCode`/sync writes; case-fold only on win32; classify cross-drive paths as `user`.

### Task 14: Secrets scanner staged filter + rg failure surface (AC14)

- **Target file**: `secrets_scanner.cjs`.
- **Actions**: exclude `+++ b/<path>` headers from the staged added-line filter; surface non-zero `rg` exits instead of reporting clean.

### Task 15: Site/integrity/gitignore/CI loose ends (AC15)

- **Target files**: `bin/build-site.js` (+ `--bump` path); wiki site templates; integrity script (ordering); `.gitignore`; `.github/workflows/*` (PR trigger).
- **Actions**: `--bump` updates `test/package.json` tarball ref; parameterize wiki branch links (deployed builds → `main`); codepoint comparison for integrity ordering; `.gitignore` matches `ws-check-workflows-report.md`; CI `pull_request` trigger includes `develop`.

### Task 16: Full verification + integrity regeneration

- **Actions**: `npm run generate-integrity` + `npm run verify-integrity` for changed hashed files; `npm run test`; `ws-check-harness` Phases 0–5c; `node test/test-harness-clean.js` (0 findings); `node test/test-powershell-config-editor.js`; rebuild site per before-ship board. No product commit until Step 5 G2 (`commitPlanFilesOnlyAtStep8`).

## 4. Permissions, Tenancy & i18n

- **Permissions**: local file read/write within the workspace only; no elevated access, no network/auth in tests (AC10 synthesized rows).
- **Tenancy**: N/A (single-workspace CLI harness, no tenant isolation surface).
- **i18n**: en-us only for skill bodies, gates, banners, and harness docs per root `AGENTS.md`.

## 5. Test Coverage

- **AC1 (observer canonical writes + serialized dispatch)**: state-write test asserts `revision` increments and plans-index `stateSha256` matches after `record`/`note-dispatch`; concurrent dispatch yields exactly one `observer-dispatch` (NS1). Extends `test/test-observer-us365.js` or a new `test-observer-state-write.js`.
- **AC2 (coordinator gate)**: gate test types `cancel` and an unmatched token, expects `EXIT_BLOCKED` never index 0; `autoMode`/non-TTY defaults unchanged (NS2).
- **AC3 (spec-memo spawn)**: win32 `--cwd`-with-spaces passes intact; failure `reason` contains child `stderr`.
- **AC4 (ship base)**: fixture repo with only `develop` branch — `verify.cjs` exits non-zero; `SHIP_PR_BASE` honored (NS3).
- **AC5 (skills-root aware harness)**: temp `WORKFLOW_SKILLS_GLOBAL_DIR`-only fixture with a `.py` file reports findings (fails when clean) (NS4).
- **AC6 (home expansion)**: `HOME` unset + `USERPROFILE` set — `--memory ~/.agents/MEMORY.md` resolves under the profile, else non-zero fail-closed (NS5).
- **AC7 (provider parity + specs-dir)**: `apiBase`/`--api-base` URL test; GitHub/ADO PR-row field/status equivalence test; `--specs-dir` override reaches `resolve_spec_path.cjs`.
- **AC8 (GUI round-trip + parity)**: selecting `false` persists boolean `false`; loading string `"false"` is rejected; `owner` binding + `karpathyGuidelines` default + schema-parity asserts in `test/test-powershell-config-editor.js` (NS6).
- **AC9 (hub/docs sync)**: `test/test-harness-clean.js`, `test/test-shared-hub-paths.js`, `test/test-doc-sync.js` green; no `.ws/runtime` literals outside dynamic constructions; FEATURES version/names current.
- **AC10 (test integrity)**: parity suite fails on empty `pullRequests` envelope (NS7); bootstrap hermetic (no machine global); observer exact-refusal + temp cleanup; global-config phrase assert; `test-configure-auto.js` present in `npm test` chain.
- **AC11 (benchmark Node-only)**: `paths.cjs` target + `process.execPath` spawn asserts; `test-unique-runtime.js` covers `scripts/`.
- **AC12 (installer)**: `update <dir> --unknown-flag` exits non-zero naming the flag (NS8); retire path quarantines or confirms; global pointer scope-correct.
- **AC13 (drain/fold/classify)**: stdout-drain asserts; win32-only fold test; cross-drive → `user` test.
- **AC14 (secrets scanner)**: staged `+++ b/path` header alone yields no hit; `rg` failure surfaces instead of clean (NS9).
- **AC15 (site/integrity/CI)**: `--bump` tarball-ref test; wiki branch-link test; ordering test; gitignore-name test; workflow trigger includes `develop`.
- **Regression sweep**: full `npm run test` + `node test/test-harness-clean.js` (0 findings) after each increment; sabotage verification via `run_sabotage.cjs` when mutation testing is unset.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries and their verification (stack: Node 22 CommonJS skill package; rule packs: `{skillsRoot}/ws-shared/runtime/stacks/` + `config.json.invariants`):

- **Authorization & endpoint protection**: no auth surface in this change (local CLI harness, no routes/policies). Verify: no new network listeners or token handling introduced (`git diff` shows none); provider URL change (AC7) only threads configured `apiBase`, never credentials.
- **Concurrency & async safety**: observer dispatch serialization (AC1, baton lock), coordinator gate determinism (AC2), child-process spawn handling (AC3). Verify: exactly-once dispatch test under concurrency; gate test matrix (cancel/unmatched × TTY/non-TTY/autoMode); spawn test with spaced `--cwd` asserts intact argv; no floating promises in edited `.cjs` (sync or awaited writes).
- **Input validation & DTO boundary**: CLI flag parsing (`--memory`, `--shared-dir`, `--api-base`, `--specs-dir`, `--cwd`, unknown `update` flags), `~` expansion, `SHIP_PR_BASE`, GUI tri-state enum mapping. Verify: fail-closed tests for unresolvable home (AC6), unknown flags (AC12), missing base (AC4); GUI rejects string `"false"`; injection-safe argv passing (no shell interpolation of paths).
- **Subscription & lifecycle cleanup**: temp dirs, child processes, file descriptors. Verify: `%TEMP%/observer` residue removed (AC10); hermetic temp global dir in bootstrap test; child stderr/stdout drained without truncation (AC3, AC13); no lingering handles (test process exits cleanly).
- **Cross-cutting invariants**: Node 22 CommonJS only — `test-unique-runtime.js` (now incl. `scripts/`) reports zero `.py` residue; portable path tokens (`pathTokens.skillsRoot`, no hardcoded `.agents/skills` or `.ws/runtime` literals — dynamic construction only); fail-closed exits (non-zero with actionable messages, never silent clean); CRLF-safe edits; `bin/skill-integrity.json` regenerated for hashed changes; en-us prose.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot, installer-cli, tests).
- [ ] Domain entities and mappings encapsulated (N/A — no domain model change).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — no auth surface; apiBase threading only).
- [ ] Stack & security invariants verified (auth, async, validation, cleanup per §6).
- [ ] i18n keys declared (N/A — en-us only).
- [ ] Test cases cover all ACs (AC1–AC15 per §5).

## 8. Open Questions

- **Memory routing for this repo (spec assumption, unconfirmed)**: leave resolver semantics as documented; correct only this repo's own store/config under AC9. No design decision required before implementation.
- **None other**: `--specs-dir` fate (honor via forwarding), cancel vocabulary, GUI boolean representation, and baton-lock reuse are all confirmed per the spec assumptions table.
