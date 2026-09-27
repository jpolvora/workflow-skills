---
slug: reduce-spec-to-pr-tokens
title: Reduce token usage in spec-to-pr-* workflows via prose compaction and deduplication
status: completed
step: 2
workflowId: reduce-spec-to-pr-tokens-20260927T043013Z
shared_understanding: confirmed
source_plan: .agents/plans/reduce-spec-to-pr-tokens/step-01-reduce-spec-to-pr-tokens.plan.md
interview: .agents/plans/reduce-spec-to-pr-tokens/step-02-reduce-spec-to-pr-tokens.plan-interview.md
acRefs: []
startedAt: "2026-09-27T04:46:31.631Z"
endedAt: "2026-09-27T04:46:31.631Z"
---
## 0. Summary & Business Rules

Condense `ws-spec-to-pr` and `ws-spec-to-pr-lite` orchestrator prose to cut context-token cost while preserving 100% of functional and behavioral invariants. Work is docs-only markdown refactoring across four files (`.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md`) plus byte-budget assertions in `test/test-context-budget.js`. No `.cjs` logic, FSM, gate-semantics, telemetry-schema, or guardrail changes.

Observed LF/raw baselines (2026-09-27, `fs.statSync().size`): `ws-spec-to-pr/SKILL.md` 15371 B, `STEP-DISPATCH.md` 37206 B, `PROTOCOLS.md` 31551 B, `ws-spec-to-pr-lite/SKILL.md` 13342 B (total 97470 B). Spec-of-record baselines (AC6): 15.4 KB / 36.3 KB / 31.6 KB / 13.2 KB (total ~96.5 KB). AC6 targets are authoritative as explicit 1024-base byte constants (interview Q1 resolved): ≤ 11776 B / ≤ 24064 B / ≤ 20992 B / ≤ 10240 B, total ≤ 67072 B (≥ 30% aggregate reduction, UTF-8 LF-normalized byte count; test asserts integer bytes, never KB floats).

Memory-injected constraints (applied throughout): keep one terse `state.handoffs` pointer per touched pipeline skill and never delete the phrase (vault trap `pipeline-dedup-locked-substrings`); never load or invoke `ws-run-benchmark` / harness benchmarks from this work (vault trap `spec-to-pr-no-harness-benchmark`); edit CRLF worktree files via LF-normalized single-line anchors and write back LF (local MEMORY `2026-09-25-crlf-worktree-edits`); regenerate integrity only after final skill content is stable (local MEMORY `2026-09-22-skill-ship-verify-ordering` — enforced by T08 ordering).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec): token proxy = normalized UTF-8 LF byte count; canonical step-actions SoT = `STEP-DISPATCH.md` (standard) and `ws-spec-to-pr-lite/SKILL.md` (lite); canonical gate contracts SoT = `ws-shared/runtime/gates.md`; canonical artifact names SoT = `ARTIFACTS.md`.

Interview resolutions (step-02, all closed): Q1 byte-base locked to 1024-base constants above; Q2 D1-locked substrings inventoried verbatim (see T03/T04 engineering checks); Q3 PROTOCOLS depth default 1-line pointer per step, 3-line ceiling; Q4 LF-normalized measurement authoritative, raw stat informational.

Measurable Acceptance Criteria (ACs): AC1 autoMode-table dedup; AC2 centralize host/model/preview/state recipes; AC3 consolidate PROTOCOLS per-step procedures; AC4 prose compaction per SKILL_AUTHORING §6; AC5 lite lean alignment; AC6 per-file and aggregate byte budgets; AC7 100% behavioral parity (FSM F0–F6, Steps 0–9, autoMode chaining, pause/checkpoint fallbacks, gate rules, G2-code/delivery commits, step-baton, observer contracts); AC8 byte-budget assertions in `test/test-context-budget.js`; AC9 zero-regression full suite (`test-liveness-checkpoints.js`, `test-context-budget.js`, `test-workflow-state-contract.js`, `test-run-state-integrity.js`).

Out of scope (spec): modifying Node `.cjs` execution scripts; changing FSM transitions or step numbering; changing specialized subagent skills (`ws-implement-tasks`, etc.); altering telemetry JSON schemas or `.state.json` structure; removing functional guardrails or safety stops (HS-1 to HS-5).

## 2. Technical Design & Architecture

Layers (per `.ws/config.json` stack `node-skills-package`): `skills-sot` (`.agents/skills`) — the four markdown bodies; `tests` (`test`) — `test/test-context-budget.js` assertions. No `installer-cli` (`bin`) logic changes (T08 touches only version-bump lines and regenerated integrity data, no behavior).

SoT boundaries after refactor:

- `ws-spec-to-pr/SKILL.md` keeps the `autoMode != skip planning` table as canonical (AC1); keeps one-line FSM/phase inventory and pointers elsewhere; no paragraph-length host/model/preview/state recipes (AC2).
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` is the sole source of truth for standard step actions (Steps 0–9, Step 5 score gate, Step 6 review loop, Step 8 close+ship, Step 9 fix-pr, observer dispatch, post-mutating transition, golden-path state commands); its autoMode-table duplicate becomes a one-line reference to `SKILL.md § autoMode != skip planning` (AC1, AC3).
- `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` keeps protocols/state/dispatch contracts (authorization ladder, transition discipline, universal step controls, state hygiene, model readiness, turn-boundary pause recipes, Base Prompt Prefix, transition gates) and gate-transition summaries pointing at `gates.md`; per-step implementation/execution procedures for Step 5, Step 6, Step 8, Step 9 are removed and replaced with 1-line pointers to `STEP-DISPATCH.md` (3-line ceiling only if V7/V9 needs the extra sentence) (AC3, Q3 resolved). Must retain the Q2 D1-locked substrings verbatim: `turn-boundary`/`turn boundary`, `checkpoint`, `pause-turn`, and the absence of `does not chain host turns`.
- `ws-shared/runtime/gates.md`, `ws-shared/runtime/tools.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` (turn-boundary recipes), `ARTIFACTS.md`, `git-ownership.md` are canonical targets for centralized content; skill bodies point at them with single-sentence pointers (AC2, AC5). Verify each pointer anchor resolves before deleting source paragraphs (V3:pointer-parity).
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md` keeps the lite Steps 0–5 index and lite-only rules (inline execution, no subagents, G2-code after Step 2) while replacing restated model/preview/transition paragraphs with pointers to `gates.md`, `tools.md`, `git-ownership.md` (AC5). Must never reference `STEP-DISPATCH.md` step numbers (lite owns Steps 0–5).

Compaction method (AC4, per `SKILL_AUTHORING.md` §6 Pruning Checklist): delete historical story/issue/commit citations, no-op echo statements, redundant synonyms, dual-path ambiguity, and run-on parentheticals; convert narrative paragraphs to structured imperative bullets with empirical exit criteria; keep every checker- or test-locked substring (vault trap `pipeline-dedup-locked-substrings`: `state.handoffs` per skill, `Do not drop ACs`, `optional scoreAndRefine second pass` where present, liveness D1 phrases per Q2 inventory).

Invariant checks from `config.json invariants`: `commitPlanFilesOnlyAtStep8: true` (plan artifacts stay uncommitted until Step 8); `skipQualityGates: false`.

## 3. Step-by-Step Plan

- T00 Baseline capture and budget scaffolding (AC6): record LF-normalized UTF-8 sizes via `Buffer.byteLength(fs.readFileSync(f,'utf8').replace(/\r\n?/g,'\n'),'utf8')` for `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md`; confirm locked Q1 targets (11776 / 24064 / 20992 / 10240 B, total ≤ 67072 B). Affected files: the four skill markdown files. Engineering checks: sizes computed LF-normalized (not raw stat); no content edits in T00. Verification V1:byte-baseline.
- T01 autoMode-table dedup (AC1): keep canonical table in `.agents/skills/ws-spec-to-pr/SKILL.md` (`### autoMode != skip planning`); replace the duplicate `### autoMode != skip planning` block in `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` with a one-line pointer (`See SKILL.md § autoMode != skip planning — autoMode auto-selects index 0 and chains Steps 0→9 without skipping planning`). Affected files: `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`. Engineering checks: exactly one full table remains; dispatch file has zero table rows; `state.handoffs` and pause-marker mentions untouched. Verification V2:dedup-lookup.
- T02 Centralize host/model/preview/state recipes (AC2): move host execution-mode tiers, subagent model-resolution hierarchy, verbose-preview format, and golden-path state command recipes to canonical runtime docs (`ws-shared/runtime/gates.md`, `ws-shared/runtime/tools.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` for turn-boundary recipes); replace paragraph duplicates in `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` with single-sentence pointers. Affected files: `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md`. Engineering checks: no semantic loss (tiers, preset/stepModels resolution order, `preset=<name>` override, preview bullet contract, G2-code sequencing all reachable via pointer); lite still states inline-only execution itself; every pointer anchor grep-verified before source deletion. Verification V3:pointer-parity.
- T03 Consolidate PROTOCOLS per-step procedures (AC3): in `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, remove redundant implementation/execution bodies for Step 5 (check-implementation/score gate), Step 6 (code review + fix loop), Step 8 (ship/close phase), Step 9 (fix-pr); leave a 1-line pointer per step (`STEP-DISPATCH.md` for actions, `ws-shared/runtime/gates.md` for gate transitions), expanding to at most 3 lines only if V7/V9 requires it. Affected files: `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`. Engineering checks: `STEP-DISPATCH.md` remains the only full procedure; Base Prompt Prefix, transition gates, turn-boundary pause recipes, and `state.handoffs` pointers stay in PROTOCOLS; Q2 D1-locked substrings retained verbatim (`turn-boundary`, `checkpoint`, `pause-turn`; no `does not chain host turns` anywhere). Verification V4:protocol-sweep.
- T04 Prose compaction and sediment removal (AC4): apply `SKILL_AUTHORING.md` §6 across `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` — delete historical citations, no-ops/echoes, redundant synonyms, dual-path ambiguity, run-on parentheticals; rewrite narratives as imperative bullets. Affected files: the four skill markdown files. Engineering checks: LF endings preserved; single-line anchors for CRLF-safe edits; phrase-locked substrings verified present after each file (`state.handoffs`, Q2 D1 inventory: `Chain host turns:`/`chains Steps 0` in SKILL.md, `Host-forced turn end` in SKILL.md, `check_pipeline_handoff.cjs` requirements). Verification V5:compaction-diff.
- T05 Lite lean alignment (AC5): in `.agents/skills/ws-spec-to-pr-lite/SKILL.md`, replace restated model/preview/post-mutating-transition paragraphs with pointers to `ws-shared/runtime/gates.md`, `ws-shared/runtime/tools.md`, `.agents/skills/ws-shared/runtime/git-ownership.md`; keep lite-owned Steps 0–5 index, inline-execution invariant, and G2-code-after-Step-2 rule. Affected files: `.agents/skills/ws-spec-to-pr-lite/SKILL.md`. Engineering checks: zero new references to `STEP-DISPATCH.md` step numbers; `workflowType: lite` isolation statement retained. Verification V3:pointer-parity.
- T06 Byte-budget assertions (AC8, completes AC6): extend `test/test-context-budget.js` with LF-normalized `utf8Size` assertions — `.agents/skills/ws-spec-to-pr/SKILL.md` ≤ 11776 B, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` ≤ 24064 B, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` ≤ 20992 B, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` ≤ 10240 B, combined ≤ 67072 B (locked Q1 constants; assert integer bytes, never KB floats). Affected files: `test/test-context-budget.js`. Engineering checks: normalization `.replace(/\r\n?/g,'\n')` before `Buffer.byteLength` so Windows CRLF never false-fails; negative probe (inflated prose fails) covered by NS1 mapping in §5 (observe fail-then-pass, not just final green). Verification V6:context-budget.
- T07 Parity and regression gate (AC7, AC9): run `node test/test-context-budget.js` (V6:context-budget), `node test/test-liveness-checkpoints.js` (V7:liveness), `node test/test-workflow-state-contract.js` (V8:state-contract), `node test/test-run-state-integrity.js` (V9:run-integrity), then full `npm run test` (V10:full-suite); confirm FSM F0–F6, Steps 0–9, autoMode chaining, pause/checkpoint fallbacks, modal+markdown gates, G2-code save points, Step 8 delivery, step-baton, and observer contracts intact via suite assertions (no separate behavior code to inspect — docs-only change, suites are the parity proof). Also run `node .agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs --repo-root .` (V11:pipeline-handoff) per the dedup trap. Affected files: none (verification only; failures route back to T01–T06). Engineering checks: every suite exit 0; any red suite blocks ship. Verification V10:full-suite.
- T08 Upstream-ship hygiene (interview S1; runs once after T07 green, after skill content is stable per the ship-verify-ordering trap): (a) `npm run generate-integrity` + `npm run verify-integrity` in the same change; (b) one patch version bump — `package.json` version + aligned `packageVersion` in `bin/skill-dependencies.json` + site footer, strictly above the merge-base version; (c) full `ws-check-harness` Phases 0–5c + `node test/test-harness-clean.js` with 0 findings; (d) site rebuild (`node bin/build-site.js`) + README/FEATURES/hub sync for any changed behavior or CLI surface. Affected files: generated integrity data, version-bump lines, site build output (+ docs sync only if behavior/CLI surface changed). Engineering checks: integrity regenerated exactly once post-stability (never interleaved with prose edits); version bump is one patch per release PR; `ws-check-harness` subsumes V11. Verification V12:ship-hygiene (integrity verify exit 0, harness 0 findings, site build exit 0).

## 4. Permissions, Tenancy & i18n

RBAC permissions: none — docs-only refactor, no endpoints, no authorization attributes or route guards added or removed. Tenancy isolation: none — no tenant fields, no data-plane queries, no cross-tenant surfaces. i18n: none — no UI strings; en-us prose only per harness rule; no locale keys declared or changed.

## 5. Test Coverage

- AC1 (autoMode-table dedup in `.agents/skills/ws-spec-to-pr/SKILL.md` + `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` via T01) → V2:dedup-lookup: assert canonical table present in `SKILL.md` and only a pointer remains in `STEP-DISPATCH.md`; plus V11:pipeline-handoff (`node .agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs --repo-root .` exits 0) and V10:full-suite (`npm run test` exits 0).
- AC2 (centralized host/model/preview/state pointers across `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` via T02) → V3:pointer-parity: grep each pointer target resolves (`gates.md`, `tools.md`, `PROTOCOLS.md` turn-boundary section exist; no orphan anchors); plus V10:full-suite.
- AC3 (PROTOCOLS consolidation pointing at `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` + `gates.md` via T03) → V4:protocol-sweep: assert Step 5/6/8/9 full procedures exist exactly once (in `STEP-DISPATCH.md`) and PROTOCOLS holds only pointers (1-line default, 3-line ceiling); plus V7:liveness (`node test/test-liveness-checkpoints.js` exits 0, proving D1 chaining/pause phrases survived).
- AC4 (compaction across `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` via T04) → V5:compaction-diff: `git diff --stat` shows byte drops per file with zero `.cjs` files touched; plus V11:pipeline-handoff and V7:liveness.
- AC5 (lite alignment in `.agents/skills/ws-spec-to-pr-lite/SKILL.md` via T05) → V3:pointer-parity (pointers to `gates.md`, `tools.md`, `git-ownership.md` resolve; no `STEP-DISPATCH.md` step-number references); plus V10:full-suite.
- AC6 (byte budgets for `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md` via T00+T06) → V1:byte-baseline (LF-normalized sizes recorded) and V6:context-budget (`node test/test-context-budget.js` exits 0 with per-file and combined assertions).
- AC7 (behavioral parity, no files changed, via T07) → V7:liveness (`node test/test-liveness-checkpoints.js`), V8:state-contract (`node test/test-workflow-state-contract.js`), V9:run-integrity (`node test/test-run-state-integrity.js`), V10:full-suite (`npm run test`); all exit 0.
- AC8 (assertions in `test/test-context-budget.js` via T06) → V6:context-budget (`node test/test-context-budget.js` exits 0); negative control NS1 covered by the same gate (inflate-then-fail probe during implementation, observed fail-then-pass).
- AC9 (zero regressions via T07) → V10:full-suite (`npm run test` exits 0) encompassing V6:context-budget, V7:liveness, V8:state-contract, V9:run-integrity.
- NS1 (reintroduced duplication / inflated prose fails `test-context-budget.js`) → V6:context-budget negative probe: temporarily restore one removed duplicate, assert non-zero exit, revert.
- NS2 (omitted autoMode chaining / turn-boundary pause fails liveness D1) → V7:liveness: assert D1 checks pass; any pointer edit that drops the Q2 locked phrases fails this gate by design.
- NS3 (removed G2-code / pre-advance validation breaks state validation) → V9:run-integrity (`node test/test-run-state-integrity.js` exits 0); pointers must keep G2-code save-point and pre-advance language reachable.
- Ship hygiene (no AC; harness obligation via T08) → V12:ship-hygiene: `npm run verify-integrity` exits 0, `ws-check-harness` Phases 0–5c clean, `node test/test-harness-clean.js` reports 0 findings, site build exits 0.

## 6. Stack & Security Invariants Verification Plan

Stack (`node-skills-package`, Node 22, CommonJS `.cjs`, LF blobs, zero Python dependency): this plan touches markdown (`skills-sot` prose) and one test assertion file (`tests`); it authorizes zero `.cjs`/`.js` logic edits, zero `bin/` behavior changes, and zero new interpreters. Verification: `git status --porcelain` shows only the five planned paths (four skill markdown files + `test/test-context-budget.js`) plus T08-controlled generated files (integrity data, version-bump lines, site build output); `node --check` not applicable (no logic files); byte-budget gate V6:context-budget doubles as the prose-size invariant.

Touched framework boundaries (explicit):

- Authorization & endpoint protection: NOT TOUCHED — no routes, policies, or guards in scope; verification is the absence proof (`git diff --name-only` contains no `.cjs`/server files; PROTOCOLS authorization-ladder section retained as pointer/summary, confirmed by V7:liveness + V9:run-integrity).
- Concurrency & async safety: NOT TOUCHED — no async code, no step-coordinator changes; verification is V8:state-contract + V9:run-integrity exits 0 with step-baton/multi-CLI prose intact.
- Input validation & DTO boundary: NOT TOUCHED — no schemas or DTOs; verification is V8:state-contract exits 0 (telemetry/state schemas untouched).
- Subscription & lifecycle cleanup: NOT TOUCHED — no watchers/streams; observer contract stays prose-only and opt-in (verified by V7:liveness presence checks, never by starting a watcher; per memory trap, harness benchmarks stay unloaded).

Harness hygiene invariants: LF line endings (write back LF; verify with `git diff --check` and V6 normalization); Node-only (no `.py` files added — verify by path list); surgical diffs (every changed line traces to AC1–AC8 or T08 ship obligations; unrelated dead code mentioned, not deleted); integrity regenerated only after final content is stable (T08 ordering enforces the local MEMORY trap: prose edits T01–T06, parity gate T07, then integrity+version+harness+site exactly once).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (markdown + one test file only, plus T08-controlled generated files; no `.cjs`/`bin` behavior edits).
- [ ] Domain entities and mappings encapsulated (N/A — no domain model changes).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — prose retains ladder pointers; verified by V7/V9).
- [ ] Stack & security invariants verified (auth, async, validation, cleanup — all NOT TOUCHED with absence proofs above).
- [ ] i18n keys declared (N/A — en-us prose only).
- [ ] Test cases cover all ACs (AC1–AC9 each map to ≥1 T-step and ≥1 V-gate in §5; NS1–NS3 mapped; T08→V12 covers ship hygiene).
- [ ] Integrity regenerated + verified in the same change (`npm run generate-integrity` + `npm run verify-integrity`, post-stability).
- [ ] One patch version bump (`package.json` + `packageVersion` + site footer above merge-base).
- [ ] Full `ws-check-harness` + `test-harness-clean.js` 0 findings; site rebuilt and docs/hubs in sync.

## 8. Open Questions (all resolved at interview — no blocking questions remain)

- Q1 Byte-base → RESOLVED: 1024-base byte constants (11776 / 24064 / 20992 / 10240 / 67072 B); test asserts integer bytes. Rationale in interview registry (model-inferred; byte-exact precedent in `test-context-budget.js`).
- Q2 D1-locked phrases → RESOLVED: verbatim inventory in interview registry (project-sourced from `test-liveness-checkpoints.js:340-354`); retain exactly, never reword.
- Q3 PROTOCOLS depth → RESOLVED: 1-line pointer default, 3-line ceiling if V7/V9 requires it (model-inferred; leanest form that keeps gates green).
- Q4 Baselines → RESOLVED: LF-normalized measurement authoritative; raw stat informational; pass/fail = Q1 constants (project-sourced normalization precedent).
