---
slug: benchmark-publish-fixed-models
title: Publish fixed-model comparison benchmark
status: completed
step: 1
workflowId: benchmark-publish-fixed-models-20260930T114235Z
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T11:50:44.593Z"
acRefs: []
---
## 0. Summary & Business Rules

Publish one reproducible fixed-model comparison benchmark run through `ws-benchmarks`: a single frozen PRD executed on this harness and on each included named external comparator harness, with fixed model ids per role, 3 independent samples per harness column, and a binary-check judge (pass/fail per check, no partial credit). The published report records PRD hash, harness versions, model ids, per-sample binary results, aggregate scores, judge definition, and run timestamps so any party can rerun the comparison.

Business rules:

- No forked benchmark engine: the run executes through the existing `ws-benchmarks` run and report commands (`scripts/harness-benchmark/cli.cjs`, `benchmarks_manager.cjs`).
- Same-conditions evidence: one frozen PRD revision (sha256), fixed models per role, documented-default comparator settings pinned to recorded versions; any deviation is logged as a protocol exception and fails that column unless recorded.
- Binary judging only: every check passes or fails; a judge edit after scoring invalidates prior samples (re-score required).
- Publication gates: a harness column with fewer than 3 samples, or a column mixing model versions, is rejected as invalid and blocks publication.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): sample count fixed at 3 per harness; judge binary pass/fail; comparators at documented defaults pinned to recorded versions; existing engine; report committed under `benchmarks/results/` with an evolution-index link.

Measurable ACs (spec AC1-AC8):

- AC1: one frozen PRD revision (content hash recorded) executed unchanged on this harness and each included comparator.
- AC2: model ids fixed per role for the whole run, recorded in the report; no mixed model versions within a harness column.
- AC3: each harness column carries >= 3 independent samples; per-sample results preserved alongside aggregates.
- AC4: binary-check judge (pass/fail, no partial credit); judge definition ships with the report.
- AC5: published report records PRD hash, harness versions, model ids, per-sample binary results, aggregate scores, judge definition, run timestamps.
- AC6: run executes through existing `ws-benchmarks` run and report commands; no forked engine.
- AC7: external comparators run at documented defaults pinned to recorded versions; deviations logged as protocol exceptions.
- AC8: report committed under `benchmarks/results/`; evolution index links the run.

Out of scope: standing periodic comparison service; tuning this harness to the frozen PRD; new benchmark fixtures; disputing external methodology.

## 2. Technical Design & Architecture

Stack: Node 22 skill package. Touched layers (config `stack.backend.layers`): skills-sot (`.agents/skills/ws-benchmarks/`), tests (`test/`). Benchmark data dirs (`benchmarks/comparisons/`, `benchmarks/results/`) are tracked report/data artifacts, not a code layer.

New run layout (all paths repo-relative):

- `benchmarks/comparisons/fixed-models-001/prd.md` — frozen PRD, small feature-sized spec in corpus style (unchanged after freeze; sha256 recorded).
- `benchmarks/comparisons/fixed-models-001/judge.json` — binary-check judge definition: checks derived 1:1 from PRD acceptance criteria plus negative scenarios; each check has `id`, `text`, `evidence` (which observed artifact field decides pass/fail). `judgeSha256` recorded in manifest; any edit invalidates scored samples.
- `benchmarks/comparisons/fixed-models-001/run-manifest.json` — run manifest: `runId`, `prdSha256`, `judgeSha256`, per-harness columns (`harness`, `version`, `settings`, `models` per role, `samples[]` with timestamps + artifact refs), `protocolExceptions[]`.
- `benchmarks/comparisons/fixed-models-001/samples/<harness>/sample-<n>.json` — per-sample binary results (`checks: {<id>: 0|1}`, `evidenceRefs`, `modelIds`, `timestamp`).

New/changed code:

- NEW `.agents/skills/ws-benchmarks/scripts/publish_comparison.cjs` — protocol validator + scorer + reporter. Validates the run manifest (PRD hash matches frozen file; judge hash matches; model ids uniform per role per column; >= 3 samples per column; every sample result strictly 0/1; comparator settings recorded with versions; exceptions logged), computes per-sample and aggregate scores, writes `benchmarks/results/comparison-<runId>.md` and `comparison-<runId>.json`, and appends/refreshes the comparison-runs section link in `benchmarks/results/BENCHMARK_EVOLUTION.md`. Reuses `comparisonFingerprint`/`writeComparisonFile` semantics from `benchmarks_manager.cjs` (Generated-only rewrites skipped).
- EDIT `.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs` — add `--publish-comparison --run <runDir>` passthrough to the new script, and make `--update-comparison` preserve the comparison-runs section of `BENCHMARK_EVOLUTION.md` (regenerate around it, never drop the link).
- EDIT `.agents/skills/ws-benchmarks/SKILL.md` — document the comparison publish menu action and the two commands (run + report), per the existing Steps 2-3 structure.
- NEW `test/test-benchmark-comparison-publish.js` — protocol gate tests (see section 5), registered in the suite like other `test/test-*.js` files.

Sample execution (AC6, no forked engine):

- This-harness column: 3 independent samples via the existing engine command `node scripts/harness-benchmark/cli.cjs run --mode static --fixture fx-node-helper` (each run is one sample; its `report.json` under `benchmarks/runs/` is the observed artifact the judge scores). Judge scoring reads observed artifact fields only.
- External comparator columns: each named harness runs the frozen PRD at its documented defaults; its column records harness version, settings, model ids, and 3 sample result files with evidence refs to its run artifacts. Settings/version come from the comparator's own documented output; any deviation from defaults is recorded in `protocolExceptions`.

Report outputs:

- `benchmarks/results/comparison-fixed-models-001.md` (+ `.json` twin) — PRD hash, harness versions, model ids, per-sample binary table, aggregates, judge definition, timestamps, exceptions.
- `benchmarks/results/BENCHMARK_EVOLUTION.md` — gains a `## Fixed-Model Comparison Runs` section linking the report; `--update-comparison` preserves it.

`config.json.invariants` checks: `commitPlanFilesOnlyAtStep8` honored (no `{plansDir}` staging before Step 8); no other invariant flags apply to this stack.

## 3. Step-by-Step Plan

1. Freeze the PRD — write `benchmarks/comparisons/fixed-models-001/prd.md` (small feature-sized spec: description, 5-7 one-line ACs, 2-3 negative scenarios, corpus style). Compute and record sha256. Files: `benchmarks/comparisons/fixed-models-001/prd.md`.
2. Define the binary judge — write `judge.json` with one check per PRD AC plus one per negative scenario; each check names the observed artifact field that decides pass/fail. Files: `benchmarks/comparisons/fixed-models-001/judge.json`.
3. Collect this-harness samples — run the existing static engine command 3 times for `fx-node-helper`; record the 3 `benchmarks/runs/<runId>/report.json` paths as sample evidence. No engine changes. Files: none new (run dirs are engine output; sample JSONs reference them).
4. Record comparator columns — for each named external comparator harness, record version, documented-default settings, model ids per role, and 3 per-sample result JSONs with evidence refs; log any settings deviation in `protocolExceptions`. Files: `samples/<harness>/sample-<n>.json`, `run-manifest.json`.
5. Implement the publisher — write `publish_comparison.cjs` (validate manifest + score + render report + evolution link). Reuse fingerprint/skip-unchanged semantics. Files: `.agents/skills/ws-benchmarks/scripts/publish_comparison.cjs`.
6. Wire the manager + skill docs — add `--publish-comparison` passthrough and evolution-section preservation to `benchmarks_manager.cjs`; document the action in `ws-benchmarks/SKILL.md` Steps 2-3. Files: `benchmarks_manager.cjs`, `SKILL.md`.
7. Publish the run — execute `node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --publish-comparison --run benchmarks/comparisons/fixed-models-001`; verify exit 0, report + JSON twin written, evolution link present. Files: `benchmarks/results/comparison-fixed-models-001.md`, `benchmarks/results/comparison-fixed-models-001.json`, `benchmarks/results/BENCHMARK_EVOLUTION.md`.
8. Add protocol gate tests — write `test/test-benchmark-comparison-publish.js` covering section 5 cases; wire into suite; run full `npm run test`. Files: `test/test-benchmark-comparison-publish.js`.
9. Regenerate integrity + site last — after final skill edits, `npm run generate-integrity && npm run verify-integrity`, rebuild site check. Files: `bin/skill-integrity.json`, site artifacts if any.

Engineering checks per step: commands exit 0; JSON files parse; hashes recompute; no `benchmarks/results/table-*.md` churn (Generated-only skip); git status shows only intended files.

## 4. Permissions, Tenancy & i18n

N/A — no auth, no multi-tenant data, no user-facing strings. The run uses local commands plus already-credentialed model access (spec assumption). No new secrets; benchmark outputs contain hashes, scores, and model ids only.

## 5. Test Coverage

`test/test-benchmark-comparison-publish.js` (new; runs in `npm run test`):

- AC1: `frozen PRD hash mismatch rejects publish` — manifest `prdSha256` differs from file bytes → exit non-zero, no report written.
- AC2: `mixed model versions within a column rejected` — one sample with a different model id for the same role → invalid column error.
- AC3: `fewer than 3 samples blocks publication` — 2-sample column → shortfall error naming the harness.
- AC4: `non-binary result rejected` — a check value other than 0/1 (e.g. 0.5) → error; `judge edit invalidates scored samples` — judge file hash differs from manifest `judgeSha256` → re-score required error.
- AC5: `report carries all required fields` — published md/json contain PRD hash, harness versions, model ids, per-sample results, aggregates, judge definition, timestamps (assert each present).
- AC6: `no forked engine` — publisher shells only `scripts/harness-benchmark/cli.cjs` / `benchmarks_manager.cjs` paths it already uses for reads; assert the publisher source contains no `runStatic`/`prepareSandbox` reimplementation (string scan) and samples reference engine-produced `report.json` files.
- AC7: `unlogged settings deviation fails the column` — comparator column with settings differing from recorded defaults and no `protocolExceptions` entry → error; logged deviation passes with the exception rendered in the report.
- AC8: `report committed path + evolution link` — publisher writes under `benchmarks/results/` and `BENCHMARK_EVOLUTION.md` contains the comparison link; `--update-comparison` preserves the comparison section (round-trip: run update, assert link still present, assert unchanged version tables untouched).
- Negative scenarios: model-mix rejection (AC2 test), sample shortfall (AC3 test), judge-edit invalidation (AC4 test), unlogged deviation (AC7 test) — each covered above.

## 6. Stack & Security Invariants Verification Plan

Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack (spec note). Framework boundaries touched: none of auth/async/DTO/subscription — this is a local CLI report publisher with file I/O only.

Verification plan:

- Input validation boundary: manifest/judge/sample JSON parsed with schema checks; malformed JSON or missing keys fail closed with a named error (covered by AC1-AC4 tests).
- Path containment: `--run` dir and output paths resolved under the repo root; refuse writes outside `benchmarks/` (assert in tests with an outside-root `--run`).
- No secrets: report contains no tokens/credentials (model ids and versions only); secrets scan stays clean.
- Determinism: same inputs → byte-identical report body modulo `**Generated:**` stamp (assert via `comparisonFingerprint` equality across two runs).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests only; no engine fork).
- [ ] Every AC maps to plan steps and section 5 tests.
- [ ] Report + JSON twin written under `benchmarks/results/`; evolution link present and preserved by `--update-comparison`.
- [ ] `npm run test` green; `verify-integrity` green; no unrelated benchmark output staged.
- [ ] Stack & security invariants verified (validation, containment, no secrets, determinism).

## 8. Open Questions

None blocking. Comparator harness names/versions are recorded from their documented outputs at implement time; if a named comparator cannot produce 3 evidence-backed samples, its column ships as a logged protocol exception rather than fabricated results (AC7 rule).
