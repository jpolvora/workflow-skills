---
step: 2
slug: harness-spec-benchmark
title: Harness spec-run benchmark with snapshot compare
status: active
workflowId: harness-spec-benchmark-20260828T113716Z
supersedes: step-01-harness-spec-benchmark.plan.md
sharedUnderstanding: confirmed
acRefs: []
startedAt: "2026-08-28T11:37:16Z"
endedAt: "2026-08-28T11:43:15.821Z"
---
## 0. Summary & Business Rules

Add an **upstream-only** maintainer benchmark toolkit under `scripts/harness-benchmark/` plus committed fixture corpus, report schema, and baseline snapshots. The tool dry-runs frozen fictitious specs against the current package harness, scores multi-dimensional quality (completeness, verify score, judge, discrimination, efficiency, time, honesty), and supports snapshot/compare for evolution tracking after large refactors.

**Business rules:**
- Product under test is the **harness** (skills, orch, scripts, verify bar), not a consumer app.
- **Static mode** is 100% script-driven (no LLM). **Live mode** is `prepare` → human/agent orch in sandbox → explicit `collect`; CLI never spawns a session host and never polls for terminal orch state.
- **Evidence-or-zero:** `collect` never trusts agent Step 5 narrative; completeness and `verifyScore` come from `ac-ledger.json` + `git diff` file:line evidence and `ac_ledger.cjs verify`.
- **Discrimination sensor:** isolated scratch file copies (never `git stash` on sandbox SoT); apply `invert.patch` or `run_sabotage`; named tests must fail; restore; sandbox porcelain must match pre-sensor baseline.
- **Blast radius:** sandbox cwd is never this clone's SoT working tree for product edits; live orch uses `defaults.dryRun: true`; no `git push`, no SCM `create-pr`.
- **Reuse, do not fork:** spawn/require `measure_harness.cjs`, `ac_ledger.cjs`, `validate_spec.cjs`, `validate_json_schema.cjs`, `resolve_consumer_root.cjs`.
- **Runtime:** all new helpers are Node `.cjs` with zero npm runtime dependencies (AC4). Sabotage may call existing `python .agents/skills/ws-testing/scripts/run_sabotage.py` per `tools.md` until a Node port lands.
- **Packaging:** omit `scripts/harness-benchmark/` and `benchmarks/runs/` from npm `files`; not hashed install content.
- **Lessons:** `--record-lessons` off by default; writes `{sharedDir}/memory/` trap only when `compare` reports regression.

**MEMORY constraints applied:** use `resolve_consumer_root.cjs` for repo/sandbox roots; do not hardcode hybrid skill paths; do not credit harness quality from mechanical exits alone without fixture oracles.

### Binding decisions (interview closed — autoMode)

1. **Sandbox skills source:** default **copy** `{skillsRoot}` from the upstream clone via `resolve_consumer_root.cjs` into sandbox `.agents/skills/`. Optional `prepare --install` runs `node bin/cli.js install --project <sandbox>` for tarball-fidelity checks only.
2. **Live collect trigger:** **explicit `collect --sandbox <path>` only.** `run --mode live` performs `prepare`, prints the sandbox path + `RUN.md`, prints the exact follow-up `collect` command, and exits 0. It does **not** poll for `step-08-*.result.md` or other terminal artifacts. `--collect-only --sandbox <path>` skips prepare when the sandbox already exists.
3. **First baseline naming:** `snapshot --name <packageVersion>-initial` where `<packageVersion>` is read from the SoT clone `package.json` at snapshot time (currently `0.3.48-initial`). Do not hardcode historical example versions from spec notes.
4. **Static run scope:** `run --mode static` scores **all** fixture directories under `benchmarks/fixtures/` (excluding `_template`) by default. `--fixture <id>` limits to one fixture for fast iteration.
5. **Judge integration:** `ws-fable-judge` has no packaged CLI. `collect` uses new `lib/judge-checks.cjs` implementing the mechanical subset of `ws-fable-judge/SKILL.md` Steps 2–4 (sandbox `git diff` scope vs ledger, re-run sandbox `verification.backendTest` when configured, four fraud heuristics). Map `VERIFIED`→10, `VERIFIED WITH CAVEATS`→5, `REFUTED`→0; `honesty = max(0, 10 − 3×frauds)`.
6. **Fixture spec shape:** every fixture `spec.md` must pass `validate_spec.cjs --mode=authoring`, including `## Definition of Ready (DoR)`, `## Validation & Observation Notes`, and `### Negative & Failing Test Scenarios` with ≥1 non-placeholder bullet. `fx-standard-mock` must include negative scenarios that the live orch is expected to link in `ac-ledger.json` so verify score can reach 9/10 when covered.

## 1. Definition of Ready & Scope

**Resolved assumptions (from spec):** install surface = `scripts/harness-benchmark/` + `npm run benchmark`; sandbox = temp dir with mini-app + copied skills; baseline policy = commit `benchmarks/baselines/*.json`, gitignore `benchmarks/runs/`; index weights fixed in schema; static not wired into default `npm run test` in v1.

**Acceptance criteria (27):** AC1–AC27 as listed in `.agents/plans/harness-spec-benchmark/step-00-harness-spec-benchmark.spec.md`.

**Out of scope:** packaged consumer skill `ws-harness-benchmark`; replacing `evals/evals.json` or `ws-preview`; TLC `.specs/features/` layout; default-CI live LLM runs; gold-filing implementation internals; rewriting `measure_harness.cjs` / `ac_ledger.cjs` / telemetry aggregate.

**Measurable DoR:** spec validated; classify recommends `standard`; no open questions in spec § Assumptions; interview registry `blocking_open == 0`.

## 2. Technical Design & Architecture

### Layer: scripts (`scripts/harness-benchmark/`)

| Module | AC | Role |
|--------|-----|------|
| `scripts/harness-benchmark/cli.cjs` | AC1, AC2, AC8, AC24 | Entry CLI: `run`, `prepare`, `collect`, `snapshot`, `compare`, `--help` |
| `scripts/harness-benchmark/lib/static-run.cjs` | AC6, AC8, AC9 | Static scoring: harness bytes, spec validation, oracle alignment, no LLM |
| `scripts/harness-benchmark/lib/prepare-sandbox.cjs` | AC10, AC11, AC24 | Temp sandbox, mini-app template, fixture spec copy, `RUN.md`; default skills copy; optional `--install` |
| `scripts/harness-benchmark/lib/collect-run.cjs` | AC6, AC12–AC16 | Ledger verify, completeness, judge-checks, sensor, reports |
| `scripts/harness-benchmark/lib/judge-checks.cjs` | AC14 | Mechanical fable-judge subset: diff scope, verification re-run, four frauds |
| `scripts/harness-benchmark/lib/snapshot.cjs` | AC21 | Promote slim baseline JSON |
| `scripts/harness-benchmark/lib/compare.cjs` | AC22, AC23, AC27 | Delta table, `failIf`, regression exit codes, optional lessons |
| `scripts/harness-benchmark/lib/report-builder.cjs` | AC5–AC7, AC16 | Build `report.json` / `report.md`, compute index |
| `scripts/harness-benchmark/lib/sensor.cjs` | AC15 | Invert patch / sabotage scratch, porcelain guard |
| `scripts/harness-benchmark/lib/paths.cjs` | AC4 | Repo root, fixture paths, run output dirs via `resolve_consumer_root.cjs` |

### Layer: benchmarks (`benchmarks/`)

| Path | AC | Role |
|------|-----|------|
| `benchmarks/schema/report.schema.json` | AC5, AC6 | Required: `meta`, `dimensions`, `index`, `perAc`, `sensor`, `diffRange`, `verdict` |
| `benchmarks/fixtures/<id>/spec.md` | AC17, AC19 | Fictitious spec corpus (authoring-valid) |
| `benchmarks/fixtures/<id>/oracle.json` | AC17–AC19, AC18 | Spec-anchored outcomes, thresholds, optional `invert.patch` / `sabotage` |
| `benchmarks/fixtures/_template/mini-app/` | AC10, AC11 | Tiny consumer skeleton copied by `prepare` |
| `benchmarks/baselines/*.json` | AC21 | Named slim snapshots (promoted manually) |
| `benchmarks/runs/<runId>/` | AC6, AC16 | Gitignored full reports |

### Layer: package & docs (`package.json`, `.gitignore`, `CATALOG.md`)

| File | AC | Change |
|------|-----|--------|
| `package.json` | AC2, AC3 | `benchmark`, `benchmark:static` scripts; confirm `files` excludes benchmark paths |
| `.gitignore` | AC20 | Ignore `benchmarks/runs/` |
| `CATALOG.md` | AC25 | Development commands row for static + live loop |

### Layer: tests (`test/`)

| File | AC | Role |
|------|-----|------|
| `test/test-harness-benchmark.js` | AC6, AC22, AC26, AC15 | Schema, static run, compare regression, sensor porcelain |
| `test/test-package-runtime-exclusions.js` | AC3 | Extend tarball deny patterns for `scripts/harness-benchmark/` and `benchmarks/runs/` |

### Reused libraries (read-only require/spawn)

| Existing script | Used by |
|-----------------|---------|
| `.agents/skills/ws-check-harness/scripts/measure_harness.cjs` | AC9 static/live efficiency |
| `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` | AC12 verifyScore |
| `.agents/skills/ws-spec-format/scripts/validate_spec.cjs` | AC6 static completeness |
| `.agents/skills/ws-shared/scripts/validate_json_schema.cjs` | AC6 schema gate |
| `.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs` | All modules (`paths.cjs`, hybrid-safe) |
| `.agents/skills/ws-testing/scripts/run_sabotage.py` | AC15 when `sabotage: true` |

### Invariant checks (`config.json.invariants`)

- `commitPlanFilesOnlyAtStep8: true` — benchmark toolkit ships in product commit at Step 8, not mid-orch plan staging.
- No database / tenancy / i18n surfaces.

## 3. Step-by-Step Plan

### Step 1 — T01: Report schema + repo layout (AC5, AC20)

**Action:** Create `benchmarks/schema/report.schema.json` and baseline directory layout; update `.gitignore`.

**Details:**
- Schema defines fixed index weights (completeness 20, verifyScore 20, judge 15, discrimination 15, efficiency 15, time 10, honesty 5); null live-only dimensions omitted from static index denominator.
- Required top-level keys: `meta`, `dimensions`, `index`, `perAc`, `sensor`, `diffRange`, `verdict`.
- `meta` shape documents: `packageVersion`, `gitSha`, `fixtureId`, `mode`, `orch`, `dryRun`, `timestamp`, optional `models` (from sandbox `config.json` presets on live collect).
- Add `.gitignore` entry `benchmarks/runs/`; ensure `benchmarks/fixtures/`, `benchmarks/schema/`, `benchmarks/baselines/` remain trackable.

**Files touched:** `benchmarks/schema/report.schema.json`, `.gitignore`, `benchmarks/baselines/.gitkeep` (optional placeholder)

**Engineering checks:** `node .agents/skills/ws-shared/scripts/validate_json_schema.cjs` accepts a minimal valid fixture report against schema.

**Defect-class sibling sweep:** grep repo for other gitignored run/output dirs under `benchmarks/` or `scripts/` to avoid conflicting patterns.

---

### Step 2 — T01: CLI skeleton + npm surface (AC1, AC2, AC3, AC4)

**Action:** Implement `scripts/harness-benchmark/cli.cjs` with subcommand router and `--help`; wire `package.json` scripts.

**Details:**
- Subcommands: `run`, `prepare`, `collect`, `snapshot`, `compare` (stub handlers initially).
- `--help` lists each subcommand and key flags (`--mode`, `--fixture`, `--sandbox`, `--run`, `--name`, `--from`, `--to`, `--collect-only`, `--install`, `--allow-regression`, `--record-lessons`).
- `package.json`: `"benchmark": "node scripts/harness-benchmark/cli.cjs"`, `"benchmark:static": "node scripts/harness-benchmark/cli.cjs run --mode static"`.
- Confirm `package.json` `files` array does **not** include `scripts/harness-benchmark/` or `benchmarks/runs/`.
- All new modules under `scripts/harness-benchmark/` use `'use strict'` CommonJS `.cjs`; no new npm dependencies.
- `paths.cjs` resolves SoT repo root and sandbox consumer roots only through `resolve_consumer_root.cjs` (supports hybrid `{globalSkillsRoot}` consumers in sandbox copies).

**Files touched:** `scripts/harness-benchmark/cli.cjs`, `scripts/harness-benchmark/lib/paths.cjs`, `package.json`, `test/test-package-runtime-exclusions.js`

**Engineering checks:** `node scripts/harness-benchmark/cli.cjs --help` exit 0; `node --check` on each `.cjs`; `npm pack --dry-run` listing excludes benchmark scripts.

**Defect-class sibling sweep:** audit `package.json` `files` and extend `test/test-package-runtime-exclusions.js` deny patterns for `scripts/harness-benchmark/` and `benchmarks/runs/` so benchmark paths stay upstream-only like other authoring scripts.

---

### Step 3 — T01: Static mode implementation (AC6, AC7, AC8, AC9)

**Action:** Implement `run --mode static` in `lib/static-run.cjs` + `lib/report-builder.cjs`.

**Details:**
- Default: iterate all `benchmarks/fixtures/*` except `_template`. Optional `--fixture <id>` limits to one fixture.
- For each selected fixture: validate fixture `spec.md` via `validate_spec.cjs --mode=authoring`.
- Record `efficiency` from `measure_harness.cjs --scenario <lite|standard>` matching fixture oracle `orch`.
- Compute static dimensions: completeness from spec/oracle AC alignment; `verifyScore`/`judge`/`discrimination`/`time`/`honesty` null where live-only.
- Write `benchmarks/runs/<runId>/report.json` and `report.md`; validate with `validate_json_schema.cjs`.
- Populate `meta` from clone `package.json` version, `git rev-parse HEAD`, fixture id, `mode: static`, orch class, `dryRun: true`, ISO timestamp.
- Exit 0 without LLM invocation; do not write product files under `.agents/skills/` in the SoT clone during static run.

**Files touched:** `scripts/harness-benchmark/lib/static-run.cjs`, `scripts/harness-benchmark/lib/report-builder.cjs`

**Engineering checks:** `npm run benchmark:static` exit 0 on minimal fixture set once T02 lands; schema validation passes.

**Sabotage verification:** N/A for static-only path (sensor dimensions null); document in report.

---

### Step 4 — T02: Fixture corpus + mini-app template (AC17, AC18, AC19)

**Action:** Add four fixtures and shared mini-app template.

**Details:**

| Fixture | Size | Orch | Purpose |
|---------|------|------|---------|
| `fx-lite-readme` | small | lite | One markdown deliverable |
| `fx-node-helper` | medium | lite | `.cjs` helper + named test in spec |
| `fx-incomplete` | small | lite | Weak spec; oracle `expectCompletenessMax` ≤ 5 |
| `fx-standard-mock` | large | standard | Exercises plan.index + ledger + negativeScenarios linking |

Each fixture directory: `spec.md`, `oracle.json` with AC ids, expected output paths, expected test names (from spec text, not hashed bodies), `maxHarnessBytes`, `maxWallSec`, live `minVerifyScore`, `failIf` rules.
- Every `spec.md` includes DoR table row, Validation Notes, and `### Negative & Failing Test Scenarios` (authoring gate).
- `fx-node-helper`: add `invert.patch` for discrimination sensor (AC15).
- `fx-incomplete`: set `expectCompletenessMax: 5` (AC18); may use thin negative subsection.
- `fx-standard-mock`: include ≥1 negative scenario bullet expected to be linked in live `ac-ledger.json` (verify score cap otherwise 8 per MEMORY).
- `benchmarks/fixtures/_template/mini-app/`: minimal Node project skeleton (`package.json`, `.agents/skills/ws-shared/config.json` seed with `dryRun: true`, `autoMode: true`, empty specs dir).

**Files touched:** `benchmarks/fixtures/fx-lite-readme/*`, `benchmarks/fixtures/fx-node-helper/*` (+ `invert.patch`), `benchmarks/fixtures/fx-incomplete/*`, `benchmarks/fixtures/fx-standard-mock/*`, `benchmarks/fixtures/_template/mini-app/**`

**Engineering checks:** each `spec.md` passes `validate_spec.cjs --mode=authoring`; oracle JSON parses; expected paths/tests quoted from spec ACs only.

**Defect-class sibling sweep:** grep existing test fixtures / temp mini-apps in `test/` for reusable patterns; do not duplicate large harness trees.

---

### Step 5 — T03: Prepare sandbox (AC10, AC11, AC24)

**Action:** Implement `prepare --fixture <id>` in `lib/prepare-sandbox.cjs`.

**Details:**
- Create sandbox outside SoT (`fs.mkdtemp` under OS tmp or configurable `--sandbox-root`); never use upstream clone cwd for product edits.
- Copy `_template/mini-app/`, fixture `spec.md` → sandbox `{specsDir}` (from sandbox config, default `.agents/specs`).
- **Default:** copy current `{skillsRoot}` from SoT clone into sandbox `.agents/skills/` using `resolve_consumer_root.cjs`.
- **Optional:** `prepare --install` runs `node bin/cli.js install --project <sandbox>` instead of raw copy when tarball fidelity is required.
- Set sandbox `config.json` `defaults.dryRun: true`, `defaults.autoMode: true`.
- Write `RUN.md` with exact orch command (`ws-spec-to-pr` or lite per fixture oracle `orch`), `dryRun: true`, and the follow-up `node scripts/harness-benchmark/cli.cjs collect --sandbox <path>` command.
- Do **not** create `{plansDir}` artifacts in the upstream clone during prepare.

**Files touched:** `scripts/harness-benchmark/lib/prepare-sandbox.cjs`, `cli.cjs` prepare handler

**Engineering checks:** prepare output path ∉ repo root; `RUN.md` contains `dryRun: true`; upstream `.agents/plans/` unchanged.

**Defect-class sibling sweep:** grep CLI/skill scripts for `git push`, `create-pr`, `gh pr create` spawn patterns; ensure benchmark CLI contains no push/PR spawn (AC24). Mirror dry-run defaults used in orch docs.

---

### Step 6 — T03: Collect + live loop (AC6, AC7, AC12, AC13, AC14, AC16, AC24)

**Action:** Implement `collect --sandbox <path>` and `run --mode live` orchestration glue.

**Details:**
- **Traceability gate:** require sandbox `{plansDir}/{slug}/plan.index.json` and `ac-ledger.json` for live collect (lite or standard).
- **verifyScore (AC12):** spawn `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs verify --ledger <path> --boundary step5`; never parse agent markdown score integers.
- **Completeness (AC13):** per AC, 0 when ledger lacks file:line evidence and no cited `git diff` hunk; else ratio × 10 capped by oracle AC count.
- **Judge + honesty (AC14):** `lib/judge-checks.cjs` runs mechanical fable-judge checks in sandbox (diff vs ledger scope, re-run `verification.backendTest` when set, four fraud heuristics); map verdict to judge dimension; honesty = 10 − 3×frauds (floor 0).
- **Reports (AC6, AC7, AC16):** write schema-valid `report.json` + human `report.md` with PASS/FAIL, dimension table, per-AC evidence or `EXPLICIT ZERO`, sensor block, `diffRange` (`fromSha`…`toSha`); populate `meta.models` from sandbox config presets when present.
- **Live run (AC1):** `run --mode live --fixture <id>` calls prepare, prints sandbox path + `RUN.md`, prints collect command, exits 0. **No terminal-state polling.** `--collect-only --sandbox <path>` skips prepare.
- **Safety (AC24):** recipes and sandbox config enforce `dryRun: true`; static analysis test asserts CLI source has no push spawn.

**Files touched:** `scripts/harness-benchmark/lib/collect-run.cjs`, `lib/judge-checks.cjs`, `lib/report-builder.cjs`, `cli.cjs` collect/live handlers

**Engineering checks:** collect rejects ledger with narrative-only score; `report.md` sections present; meta fields populated.

**TDD baseline (V12–V15):** add failing tests in `test/test-harness-benchmark.js` for ledger-only score rejection, evidence-or-zero completeness, and judge fraud detection **before** implementing collect logic; observe red, then green.

---

### Step 7 — T03: Discrimination sensor (AC15)

**Action:** Implement `lib/sensor.cjs` and wire into `collect`.

**Details:**
- When fixture `oracle.json` has `invert.patch` or `sabotage: true`:
  1. Record pre-sensor `git status --porcelain` in sandbox.
  2. Create isolated scratch copy of relevant test/source files (file copies in temp dir — **never** `git stash` on sandbox).
  3. Apply patch or `python .agents/skills/ws-testing/scripts/run_sabotage.py` with explicit launcher per `tools.md`.
  4. Run oracle-named tests; expect failure.
  5. Restore scratch; delete temp.
  6. Assert post-sensor porcelain equals pre-sensor; fail run if mutant survives or porcelain drifts.
- Store `sensor` block in report: injected count, killed count, porcelain OK, PASS/FAIL.

**Files touched:** `scripts/harness-benchmark/lib/sensor.cjs`, `lib/collect-run.cjs`

**Engineering checks:** sensor fixture fails when mutant survives (synthetic test); porcelain unchanged after restore.

**Sabotage verification:** run `run_sabotage.py` on scratch copy in test harness; confirm named tests fail pre-restore; confirm restore returns clean porcelain (AC26).

**Defect-class sibling sweep:** grep for other mutation/sabotage callers (`run_sabotage`, `invert.patch`) and align launcher/spawn style with `ws-testing` / fix-pr class-sweep tests.

---

### Step 8 — T04: Snapshot + compare + lessons (AC21, AC22, AC23, AC27)

**Action:** Implement `snapshot` and `compare` subcommands.

**Details:**
- **snapshot (AC21):** `snapshot --run <runId> --name <label>` copies slim JSON to `benchmarks/baselines/<label>.json` containing only `meta`, `dimensions`, `index`, `fixtureId` (no sandbox blobs). First maintainer anchor: `snapshot --name 0.3.48-initial` (or `{packageVersion}-initial` at run time).
- **compare (AC22):** print per-dimension delta table between `--from` baseline and `--to` report/baseline; exit 1 when `--to` fixture oracle `failIf` rules or `--fail-if` file matches.
- **Regression policy (AC23):** document and implement default fail when `index` drops >5 points or `verifyScore` drops >1 vs `--from` unless `--allow-regression`.
- **Lessons (AC27):** `--record-lessons` default false; when compare detects regression, write `{sharedDir}/memory/YYYY-MM-DD-harness-benchmark-regression.md` trap via self-learning compile path; no write when compare passes or flag omitted.

**Files touched:** `scripts/harness-benchmark/lib/snapshot.cjs`, `lib/compare.cjs`, `cli.cjs`

**Engineering checks:** snapshot output validates against schema subset; compare exit codes 0/1 exercised in tests.

---

### Step 9 — T04: Integration tests + catalog docs (AC25, AC26)

**Action:** Add `test/test-harness-benchmark.js` and CATALOG development-command row.

**Details:**
- **Tests (AC26):**
  - Schema validation of static `report.json`.
  - Static run on at least `fx-lite-readme` (or all fixtures once stable).
  - Compare exit 1 on synthetic regression fixture/report pair.
  - Sensor fixture porcelain restoration after invert/sabotage path.
- Wire test into `npm run tests:harness-efficiency` chain (not default static benchmark in every `npm run test` per spec v1).
- **CATALOG (AC25):** add rows under § Development commands for `npm run benchmark:static` and live prepare → orch in sandbox → explicit `collect` loop (this-repo-only maintainer workflow).

**Files touched:** `test/test-harness-benchmark.js`, `CATALOG.md`, `package.json` `tests:harness-efficiency` script line

**Engineering checks:** `node test/test-harness-benchmark.js` exit 0; CATALOG markdown link targets valid.

**Defect-class sibling sweep:** align test helpers with `test/harness-test-utils.cjs` patterns used by `test-ac-ledger.js` and package exclusion tests.

---

## 4. Permissions, Tenancy & i18n

- **Permissions:** maintainer-local CLI; no RBAC or auth surfaces (spec assumption confirmed).
- **Tenancy:** sandboxes are ephemeral; no multi-tenant data paths.
- **i18n:** en-us only in CLI help, `report.md`, and CATALOG rows; no locale keys.

## 5. Test Coverage

| AC | Test case | Method |
|----|-----------|--------|
| AC1 | CLI `--help` lists run, prepare, collect, snapshot, compare | V1:cli-help-lists-subcommands |
| AC2 | `npm run benchmark` and `benchmark:static` invoke cli.cjs | V2:npm-benchmark-scripts |
| AC3 | npm pack dry-run excludes harness-benchmark and runs dir | V3:pack-excludes-benchmark-paths |
| AC4 | All new helpers are `.cjs` with no new dependencies | V4:cjs-runtime-audit |
| AC5 | report.schema.json requires meta, dimensions, index, perAc, sensor, diffRange, verdict | V5:report-schema-required-keys |
| AC6 | static/collect report.json passes validate_json_schema | V6:report-json-schema-valid |
| AC7 | meta records packageVersion, gitSha, fixtureId, mode, orch, dryRun, timestamp | V7:meta-fields-present |
| AC8 | static run exits 0 without LLM and without SoT skills writes | V8:static-no-llm-no-sot-writes |
| AC9 | static efficiency from measure_harness scenario matching orch | V9:static-efficiency-scenario |
| AC10 | prepare creates external sandbox and RUN.md with dryRun | V10:prepare-sandbox-runmd |
| AC11 | prepare copies spec to sandbox specsDir only | V11:prepare-spec-copy-isolated |
| AC12 | collect verifyScore from ac_ledger verify not markdown | V12:collect-ledger-verify-score |
| AC13 | collect completeness zero without file:line evidence | V13:collect-evidence-or-zero |
| AC14 | collect runs fable-judge fraud checks for judge and honesty | V14:collect-judge-honesty |
| AC15 | sensor injects fault, tests fail, restore, porcelain unchanged | V15:sensor-discrimination-porcelain |
| AC16 | report.md includes PASS/FAIL, dimensions, per-AC, sensor, diffRange | V16:report-md-sections |
| AC17 | four fixtures exist with spec.md and oracle.json | V17:fixture-corpus-present |
| AC18 | fx-incomplete expectCompletenessMax le 5 | V18:incomplete-oracle-cap |
| AC19 | oracles list spec-anchored paths and test names not hashes | V19:oracle-spec-anchored |
| AC20 | gitignore runs/; fixtures schema baselines trackable | V20:gitignore-benchmark-layout |
| AC21 | snapshot writes slim baseline json | V21:snapshot-slim-baseline |
| AC22 | compare prints deltas and exits 1 on failIf match | V22:compare-failif-exit |
| AC23 | compare fails index drop gt 5 or verifyScore drop gt 1 | V23:compare-regression-thresholds |
| AC24 | live prepare/collect recipes dryRun; CLI no push spawn | V24:no-push-dryrun-safety |
| AC25 | CATALOG documents benchmark:static and live loop | V25:catalog-dev-commands |
| AC26 | test-harness-benchmark covers schema, static, compare, sensor porcelain | V26:integration-test-suite |
| AC27 | record-lessons off by default; writes memory trap on regression only | V27:record-lessons-opt-in |

**Red-before-green:** V12–V15 and V15 sensor cases must fail on stub collect before Step 6–7 implementation lands (ws-interview failing-test baseline rule).

## 6. Invariants (Do Not Violate)

- Upstream SoT remains `.agents/skills/` for packaged skills; benchmark CLI is **not** install content.
- `commitPlanFilesOnlyAtStep8: true` — deliver benchmark via product commit at Step 8, not plan-dir staging in SoT mid-run.
- New scripts: Node `.cjs` only; zero new npm runtime dependencies.
- Reuse existing gate scripts; do not fork `measure_harness.cjs`, `ac_ledger.cjs`, validators.
- Portable vocabulary: no host-product names in CLI help or reports.
- Live benchmark never pushes or opens PRs; sandbox only.
- Oracle asserts spec outcomes, not implementation gold files.
- Default `npm run test` unchanged in v1 (static benchmark via `npm run benchmark:static` only).
- `paths.cjs` and prepare must use `resolve_consumer_root.cjs`; never hardcode `.agents/skills` for hybrid consumers.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`scripts/`, `benchmarks/`, `test/`, docs only).
- [ ] All AC1–AC27 mapped in §3 steps and §5 tests.
- [ ] `node --check` passes on every new `.cjs` under `scripts/harness-benchmark/`.
- [ ] `npm run benchmark:static` exit 0 after fixtures land.
- [ ] `node test/test-harness-benchmark.js` exit 0.
- [ ] `npm run test` (existing suite) still exit 0.
- [ ] `ws-check-harness` 0 critical findings.
- [ ] `npm run generate-integrity` && `npm run verify-integrity` exit 0.
- [ ] CATALOG § Development commands updated (AC25).
- [ ] `.gitignore` and `package.json` `files` verified (AC3, AC20).
- [ ] Sensor sabotage path verified with porcelain restore (AC15, AC26).
- [ ] No `git push` / PR spawn in benchmark CLI (AC24).
- [ ] V12–V15 observed red before collect/judge/sensor implementation.

## 8. Open Questions

None remaining. Interview autoMode closed every draft §8 item plus audit findings (see ## Interview registry). Implementers must follow §0 binding decisions; do not re-open these choices.

Closed (was draft §8):

1. Sandbox skills source → default copy via `resolve_consumer_root.cjs`; optional `prepare --install`.
2. Live collect trigger → explicit `collect` only; no terminal-state polling.
3. First baseline naming → `{packageVersion}-initial` (currently `0.3.48-initial`).
4. Static run scope → all fixtures by default; `--fixture` filter for iteration.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|-----------|
| G1 | blocking | §8 Q1 / Step 5 | Sandbox skills copy vs `bin/cli.js install` unresolved | Default copy for speed; optional `--install` | closed | Copy `{skillsRoot}` from SoT via `resolve_consumer_root.cjs`; `prepare --install` for tarball fidelity | project | Spec § Assumptions sandbox row; step-00 spec Architecture prepare table | |
| G2 | blocking | §8 Q2 / Step 6 | Live collect auto-detect vs explicit collect ambiguous | Explicit collect after agent finishes (TLC Execute) | closed | `run --mode live` prints collect command and exits; no poll for `step-08-*.result.md`; `--collect-only` skips prepare | model-inferred | Plan §8 Q2 recommendation; spec live runner assumption "prepare + collect; no session-host spawn" | G1 |
| G3 | non-blocking | §8 Q3 / Step 8 | First baseline label used stale example version | Use live `package.json` version at snapshot | closed | Name baselines `{packageVersion}-initial` (e.g. `0.3.48-initial`) | project | `package.json` version `0.3.48`; spec Notes example `0.3.30-initial` is illustrative only | |
| G4 | non-blocking | §8 Q3 / Step 3 | Static run single-fixture vs all-fixtures default unset | All fixtures for `benchmark:static`; `--fixture` for fast runs | closed | Iterate all `benchmarks/fixtures/*` except `_template` by default | model-inferred | npm script `benchmark:static` intent; plan §8 Q4 recommendation | |
| G5 | blocking | Step 4 / AC17 | Fixture specs may fail authoring validation (DoR/Notes/negatives) | Require full authoring sections per validate_spec | closed | Every fixture `spec.md` passes `validate_spec.cjs --mode=authoring` including negative subsection | project | MEMORY 2026-08-27 Authoring validation; `validate_spec.cjs` authoring mode | |
| G6 | blocking | §2 paths.cjs | Hybrid skill roots could be hardcoded | Use `resolve_consumer_root.cjs` everywhere | closed | `paths.cjs` and prepare copy resolve consumer roots via shared resolver only | project | MEMORY hybrid resolution; `test/test-hybrid-consumer-root.js` mkdtemp fixtures | |
| G7 | blocking | Step 6 / AC14 | Plan says "run ws-fable-judge" but skill has no CLI | Mechanical judge subset in Node | closed | Add `lib/judge-checks.cjs` implementing SKILL.md Steps 2–4 fraud/diff/verify checks | model-inferred | `ws-fable-judge/SKILL.md` protocol only; no scripts/ CLI in skill tree | G2 |
| G8 | blocking | Step 4 / AC12 | Live verify score cap when negativeScenarios uncovered | fx-standard-mock must exercise negative linking | closed | Standard fixture includes negative bullets + oracle expects linked NS rows for 9/10 score path | project | MEMORY verify score fail-close on uncovered negatives; `ac_ledger.cjs` knownDefect cap 8 | G5 |
| G9 | non-blocking | Step 7 / AC15 | Sensor isolation mechanism unspecified vs stash trap | File-copy scratch only | closed | Scratch via temp file copies; never `git stash` on sandbox porcelain baseline | project | Spec discrimination sensor row; MEMORY sabotage restore patterns | |
| G10 | non-blocking | Step 2 / AC3 | Tarball exclusion not yet asserted for benchmark paths | Extend package exclusion test | closed | Add deny patterns to `test/test-package-runtime-exclusions.js` in T01 sibling sweep | project | Existing test patterns for `/runs/`, `__pycache__`; plan Step 2 sibling sweep | |
| G11 | blocking | §5 V12–V15 | Collect/judge/sensor tasks lack failing test baseline | Red tests before implementation | closed | V12–V15 in `test/test-harness-benchmark.js` must fail on stubs before Step 6–7 code | project | `ws-interview/SKILL.md` Audit blocking gap rule; spec-dor interview precedent | G7 G9 |
| G12 | non-blocking | §4 probes | Soft-deletion, concurrency, list sizing, rate limits | N/A for maintainer CLI | closed | No entities, API, auth, or shared mutable store beyond ephemeral sandboxes | project | Spec auth/tenancy N/A; `config.json` database none | |
| G13 | non-blocking | §2 meta | `meta.models` recording unspecified in plan steps | Copy preset ids from sandbox config on live collect | closed | Populate optional `meta.models` from sandbox `config.json` defaults/presets | project | step-00 spec Notes Models row; schema `meta` optional models | G2 |
| G14 | non-blocking | plan.index | Step 1 index may map ACs to all tasks | Refined plan §3/§5 is SoT for task mapping | closed | Do not edit `plan.index.json` in Step 2; rebuild after this refined plan | assumed-default | Interview protocol; plan_index build command in Step 2 handoff | |
