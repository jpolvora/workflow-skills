---
name: STP speed & determinism (consolidated)
overview: "External-judge analysis of ws-spec-to-pr end-to-end. Measured: orchestration/context is the bottleneck, not scripts. Plan makes declared skip paths fire deterministically, dedupes instruction surface, closes precision/portability gaps. No new pipeline, no weaker quality gates."
todos:
  - id: p0-classify-script
    content: "P0: classify.cjs emits complexityClass + runInterview + spec-touched layers; persist to state"
    status: pending
  - id: p0-skip-wording
    content: "P0: untangle autoMode vs simple path; align gates.md/STEP-DISPATCH Step-3 stub wording"
    status: pending
  - id: p0-simple-stub
    content: "P0: write_simple_plan_stub.cjs + pre-advance 4 accepts simple stub"
    status: pending
  - id: p0-existingspec
    content: "P0: existing-spec Step 0 short circuit (skip reformulation + full history scan)"
    status: pending
  - id: p0-files-touched
    content: "P0: intersect files_touched with git; drop phantom paths"
    status: pending
  - id: p1-dedupe
    content: "P1: canonicalize duplicated rules (model/verbose/autoMode/close-ship); fix lite labels"
    status: pending
  - id: p1-alias-notapp
    content: "P1: document + wire not-applicable alias skipReason to stop forced build/test/format runs"
    status: pending
  - id: p1-script-fixes
    content: "P1: fix \\z anchor, probe git ls-files, cap search_plan_history, atomic writes, persist hasTestSurface"
    status: pending
  - id: p2-manifest
    content: "P2: verification-manifest reuse + fx-docs-micro process-waste test"
    status: pending
isProject: false
---

# Spec-to-PR speed and determinism — consolidated plan

Supersedes and extends `.cursor/plans/orch_speed_determinism_f3f6c066.plan.md` (prior pass). This pass adds a **live sandbox simulation** and **external-judge measurements** so priorities are evidence-ranked, not intuition-ranked.

## 1. Method

- Mapped every state, step, branch, and mode flag in `ws-spec-to-pr` (standard F0–F6, steps 0–9) and `ws-spec-to-pr-lite` (0–5).
- Built a sandbox consumer (`%TEMP%\stp-sim-*`): simple spec + plan + task + AC ledger, real `config.json`, seeded state.
- Drove the deterministic FSM scripts end-to-end (`update_state`, `validate_state --pre-advance`, `plan_index`, `ac_ledger`, `write_sequential_dag`) across Step 0→6 and measured invocation count, wall-clock, gate failures, determinism, and scaling.
- Cross-checked script behavior against `gates.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md`, `ARTIFACTS.md`, `tools.md`, `classify.cjs`, `ac_ledger.cjs`, `build_dispatch_context.cjs`, `probe_test_surface.cjs`.

Raw harness: `C:\Users\jpolv\AppData\Local\Temp\opencode\stp-sim.cjs`.

## 2. Measured baseline (sandbox `stp-sim`)

| Metric | Result |
|--------|--------|
| Script invocations for Step 0→6 rehearsal | 26 |
| Total script wall-clock | **1.67 s** (~50–90 ms/call) |
| `plan_index build` scaling | 10 headings = 47 ms · 100 = 46 ms · 400 = 57 ms |
| Idempotent `finish` bytes | **byte-identical** (deterministic) |
| Standard orchestrator reading surface | **194,217 B ≈ 48.5k tokens across 13 files** |
| Lite orchestrator reading surface | **≈ 33k tokens** (9 files) |
| pre-advance 6 failure | 1 call surfaced 4 coupled failures at once |

**Conclusion:** script runtime is negligible. The cost is **LLM context read + subagent dispatch + gate work**, so surgical script micro-optimization yields ~0 speedup. Rank improvements by *tokens removed, dispatches avoided, forced work eliminated*.

## 3. Decision-tree path map (cost per path)

Entry: `free-text` | `local *.spec.md` | `GitHub {n}` | `ADO WI` → spec of record → register `step-00`.
Then, by mode/config:

| Branch | Effect | Net cost |
|--------|--------|----------|
| Lite recommended | inline 0–5, no dispatch | lowest |
| Standard `simple` | stub plan, skip 2 & 3 → Step 4 | **low (declared, but does not fire — F2)** |
| Standard `standard` | 1 → 2 (conditional) → 3 (dag) → 4 | baseline |
| `enableDag: true` | Step 3 + ≤3 parallel Step 4 | +1 dispatch, +parallel |
| Step 5 `< minVerifyScore` | scoreAndRefine loop ≤3 + re-verify | +N refine dispatches |
| `parallelVerifyReview` | 5+6 concurrent, merge serial | −wall-clock |
| `reviewJury.size` 2–3 | N reviewers + merge | +1–2 dispatches |
| Step 6 Critical/Warning | fix→re-review ≤3 | +N dispatches |
| Step 7 no test surface | auto-skip (deterministic) | −1 dispatch |
| Step 7 mutation | optional substep | +1 runner |
| Ship | close gate + ship gate + PR | 2 gates |
| Step 9 | goal-fix loop + `fixPrPlan`→`fixPrExec` | +N dispatches |

Two orthogonal classifiers overlap (pipeline `lite|standard` vs complexity `simple|standard|complex`) and both gate Step 0/1 → confusion risk (F8).

## 4. Consolidated findings

**F1 — Speed (High).** Bottleneck is instruction surface + dispatch, not scripts. 48.5k-token standard read chain; 1.67s script cost. Dedupe + per-gate disclosure is the single highest-ROI speed lever.

**F2 — Speed (High).** Declared simple path does not fire. `SKILL.md:46-55` / `STEP-DISPATCH.md:9-18` say autoMode "Never skip Steps 1–3", colliding with the simple path in `gates.md:113-121`. Complexity class is LLM-only, and `classify.cjs:469` (`Math.max(specLayers, configLayers)`) inflates layers from the repo's 3 configured layers so `runInterview` trips on almost everything. Evidence: prior live run us-328 (13 min, 105 KB plan artifacts, ~20 LOC).

**F3 — Speed/Precision (High).** `ac_ledger.cjs:373-381`: every configured `*Build|*Test|*Format` alias must have an observed ledger result or score is capped and pre-advance 6 errors. A trivial change still forces build+test+format. `ALIAS_SKIP_REASONS` already allows `not-applicable` (`ac_ledger.cjs:12`) but no skill instructs using it.

**F4 — Precision/Drift (Medium).** Duplicated rules: model resolution ×6, verbose preview ×5, autoMode table ×3, close/ship option lists ×3. Lite telemetry labels `'Consolidation'`/`'Ship and PR'` (`ws-spec-to-pr-lite/scripts/update_state.cjs:9`, `validate_state.cjs:9`) contradict the lite step table `Ship`/`Fix-PR` (`SKILL.md:41-48`).

**F5 — Determinism (Medium).** `validateSnapshot` re-reads `.state.md` + `.state.json` + `index.json` + schema and re-parses every required artifact per call; `ac_ledger.verifyFileHashes` re-hashes every evidence/test file; `update_state` writes then immediately re-parses. Cheap today; scales with evidence rows.

**F6 — Precision (Medium).** Script defects: `build_dispatch_context.cjs:44` uses invalid JS anchor `\z` (identity escape — latent section-truncation risk); `write_sequential_dag.cjs` non-atomic write; `ac_ledger.writeJson` PID-only temp name; `search_plan_history.cjs` reads every body of every completed workflow (no slug-dir early skip); `probe_test_surface.cjs:36-64` full `walk()` instead of `git ls-files`.

**F7 — Determinism (Medium).** `files_touched` is agent-reported and not intersected with git (`workflow_state.cjs:574 normalizeFilesTouched` has no git filter) → phantom paths pollute handoffs/telemetry/commits.

**F8 — Portability (Low/Medium).** Two overlapping classifier axes; Step 0 entry wording inconsistent between `PROTOCOLS.md:161-167` (tracker/local spec "skip Step 0") and `STEP-DISPATCH.md:45`/`SKILL.md:74-79` (Step 0 always runs). Multi-hop read chains (`SKILL → setup → gates → ARTIFACTS`). Lite has no own `PROTOCOLS`/`STEP-DISPATCH`/`ARTIFACTS` and reaches into the standard tree.

**F9 — Speed (Medium).** No dispatch reduction for the `simple` class beyond skipping plan/interview/tasks; each remaining dispatch builds up to 32 KB context (`build_dispatch_context.cjs`).

**F10 — Portability/Determinism (Low).** 48 KB of prose relies on model discipline; smaller/other models diverge most on judgment calls (complexity, interview skip "30s skim", Reach-10, severity). Converting these to script outputs raises cross-model determinism.

## 5. Improvements (surgical)

### P0 — Make skip paths fire deterministically (highest ROI)

1. **Script the complexity class** — `ws-classify-complexity/scripts/classify.cjs`:
   - Emit `complexityClass: simple|standard|complex` and `runInterview` into `classify.md` and persist on state via `update_state`.
   - Count **spec-touched** layers only (map spec path-refs onto `stack.backend.layers[].path`); never `Math.max` with raw configured count.
   - `simple` = docs/test-only path-refs, AC ≤ 6, no Open Questions, no schema/API/tenancy signals; uncertain → `standard` (conservative).
   - Add `## Subagent contract`; orch must not hand-write classify.md.
2. **Untangle autoMode wording** in `SKILL.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md` (single canonical copy in `gates.md`): autoMode never waives planning for standard/complex, but the simple-path stub + skip 2/3 **does** apply in autoMode.
3. **Script the simple stub** — new `write_simple_plan_stub.cjs` (goal + files from path-refs + AC checklist); then `plan_index.cjs build`, `finish --status skipped` for 2/3; pre-advance 4 accepts `complexityClass: simple`.
4. **Existing-spec Step 0 short circuit** — if `{specsDir}` spec validates under `--mode=authoring|compat`, skip `ws-spec-write` reformulation and the full-body `search_plan_history.cjs` scan; still register, `ac_ledger init`, classify, `finish`.
5. **`files_touched ∩ git`** in `workflow_state.cjs normalizeFilesTouched` — drop paths absent from `git status --porcelain`/`git diff --name-only`; log dropped phantoms.
6. **Resolve Step 3 contradiction** — `enableDag:false` = `finish dag-disabled`, **no** `write_sequential_dag.cjs` files. Fix the `state-hygiene.md` cheat sheet that still requires `step-03-*.plan.exec.md`.

### P1 — Cut redundant work + precision

7. **Canonicalize duplicated rules**: keep one copy in `gates.md`; `STEP-DISPATCH`/`PROTOCOLS`/`SKILL` link. Target the autoMode table, post-mutating order, model resolution, verbose preview, Step 5/6 score tables, close/ship options. Cuts read tokens on every run.
8. **Fix lite telemetry labels** to match the lite step table.
9. **Alias applicability**: document `--alias-result … skipReason: not-applicable` in the Step 5 verify contract and `ws-plan-verify`; allow a change-class justification instead of forcing irrelevant build/format runs. Non-zero exits still set `knownDefect`; no weakening.
10. **Persist + cap**: persist `hasTestSurface` and `force_interview` on state; Step 4 re-runs `check_memory_conflict.py` only if plan mtime changed; `search_plan_history.cjs` reads at most top-3 matching workflows; `probe_test_surface.cjs` uses `git ls-files`.
11. **Script fixes**: `build_dispatch_context.cjs` replace `\z` with `$` (with `m` flag) or explicit `$`-of-input handling; make `write_sequential_dag.cjs` atomic; use unique temp names in `ac_ledger.writeJson`.
12. **Per-gate disclosure**: split `gates.md`/`PROTOCOLS.md` so a step reads only its gate section (index + anchors), not the full 26 KB each time.

### P2 — Contract-level determinism

13. **Verification-manifest reuse**: after Step 4 write `.runtime/verification-manifest.json` (alias exits, `scan_stack_invariants.cjs`, sabotage). Steps 5/6/7 re-run only if `files_touched` changed; otherwise link the manifest. Step 8 credits the pinned SHA.
14. **Process-waste test**: fixture `test/fixtures/fx-docs-micro/` (existing spec, 1 md + 1 test AC) + `test/test-workflow-process-waste.js` asserting `complexityClass: simple`, `runInterview: false`, Step 2/3 skipped with canonical reasons, `files_touched ⊆ git`, and an artifact-byte ceiling vs product LOC.

## 6. Steps to add or remove (explicit)

- **Remove (for `simple`)**: LLM `ws-plan-write` (replace with script stub), Step 2 interview, Step 3 tasks, full-body history scan.
- **Add**: `complexityClass` script decision + persistence; `write_simple_plan_stub.cjs`; alias `not-applicable` guidance; persisted `hasTestSurface`/`force_interview`; `verification-manifest.json`.
- **Keep unchanged (non-negotiable quality floor)**: `minVerifyScore` 9, G2-code save points, HS-1..HS-5, dirty-tree review STOP, no `{plansDir}` in product commits, portability/path tokens.

## 7. Out of scope

- New third orchestrator or collapsing standard into lite.
- Lowering `minVerifyScore` or auto-approving below bar.
- Host-specific dispatch or product-branded prose.
- Running a live LLM sandbox in CI (unit/script fixtures only).
- Decoupling package version stamps from hub-hash edits (separate release-process issue).

## 8. Verification per PR

- New narrow tests: classify fixtures (docs-micro / multi-layer / open-questions), simple-path pre-advance 4 without interview/DAG artifacts, autoMode wording regression, `files_touched` phantom drop, existing-spec short circuit, lite label parity, alias `not-applicable`.
- Existing: `node test/test-workflow-state-contract.js`, `test/test-artifact-economy.js`, `test/test-classifier-history.js`, `node test/test-node-helper-ports.js`.
- `ws-check-harness` Phases 0–5c on touched skills; `ws-check-workflows`.
- `npm run generate-integrity && npm run verify-integrity` when hashed bodies change.
- Update `FEATURES.md` / hub / `README.md` only for user-visible skip behavior; one patch bump per release PR.
