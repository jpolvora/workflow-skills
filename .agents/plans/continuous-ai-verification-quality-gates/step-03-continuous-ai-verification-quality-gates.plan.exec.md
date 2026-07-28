# Execution Plan — continuous-ai-verification-quality-gates

**Source plan:** `.agents/plans/continuous-ai-verification-quality-gates/step-02-continuous-ai-verification-quality-gates.plan.refined.md`  
**Execution mode:** `parallel`

## Sizing decision

| Metric | Measured | Sequential limit | Result |
|---|---:|---:|---|
| Refined implementation steps | 8 | 3 | exceeded |
| Expected unique changed files | 26 | 6 | exceeded |
| Project layers touched | 3 (skills, cli, tests) | 2 | exceeded |
| Safe DAG levels | 6 | 2 | exceeded |
| Atomic tasks | 16 | n/a | parallel DAG required |

**Reason:** 8 plan steps, ~26 files, and 3 layers all exceed `dagThresholds` (`maxImplementationSteps=3`, `maxExpectedFiles=6`, `maxLayers=2`). Tasks are grouped by AC/plan steps; no same-level file overlap; max 3 concurrent per level.

## Levels and tasks

### Level 1 — independent foundations (AC1, AC3 skill, ARTIFACTS registry)

#### T1: AC1 — Fable-judge PREPARE board row
- **Depends on:** none
- **Files:** `.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md`
- **Work:** Insert fable-judge audit verdict as new row 5 between security (4) and consumer prepare; renumber consumer prepare → 6, board shown → 7. Update board template table, checklist item headings, and rationalizations (“Fable already ran — skip board” → show row; credit ⏭ only with current-tree evidence). Visibility only — enforcement stays in ws-ship-pr Step 1 preflight.
- **Acceptance:** AC1. Verdict shown; `REFUTED` → ❌ STOP; `VERIFIED` / `VERIFIED WITH CAVEATS` → ✅; fable disabled/not run → ⏭ with evidence. Tables sequential; links intact; en-us; no host product names.

#### T2: AC3 + AC6 — Create `ws-classify-complexity` skill
- **Depends on:** none
- **Files:** `.agents/skills/ws-classify-complexity/SKILL.md`, `.agents/skills/ws-classify-complexity/scripts/classify.cjs`
- **Work:** New skill folder. SKILL.md: input spec path / orch context; analyze section/AC/file/layer counts vs `config.json.dagThresholds`; write `step-00-{slug}.classify.md`; user-gate Accept / Override standard / Override lite; `autoMode` accepts index 0; document orthogonality to Complexity gate (`simple`/`standard`/`complex`); mid-flight lite switch is advisory-only by default. `classify.cjs`: manual YAML frontmatter mini-parser (no npm YAML); count ACs; read `dagThresholds`; optional `--score-analysis` for Pass 1 (AC6: defer at Step 0, re-invoke when scores exist; no silent `workflowType` switch). Exit non-zero on missing spec.
- **Acceptance:** AC3, AC6. `node --check` passes; gate ≥2 options; classify.md schema; scoreAndRefine deferred without scores; en-us; harness-neutral.

#### T3: ARTIFACTS registry (AC2 / AC3 / AC4 prerequisites)
- **Depends on:** none
- **Files:** `.agents/skills/ws-spec-to-pr/ARTIFACTS.md`
- **Work:** Add **Step input prerequisites** table (advance-to-N → required disk artifacts per refined plan §2b, including lite notes). Register `step-00-{slug}.classify.md` (not Step 8 delivery stage set). Register `{us-dir}/telemetry/` runtime path for per-step JSONL. Do not invent alternate naming.
- **Acceptance:** AC2 (G1), AC3 (G2), AC4 (G2). Table drives `verify_step_artifacts`; classify + telemetry registered before implementers invent paths.

### Level 2 — validators + standard JSONL (AC2, AC4)

#### T4: AC2 — Standard `validate_state.py` `--pre-advance`
- **Depends on:** T3
- **Files:** `.agents/skills/ws-spec-to-pr/scripts/validate_state.py`
- **Work:** Add `--pre-advance <N>`. When set: `verify_checkpoint_tag(workflow_id, N)` via `git tag -l "uswf/{workflow-id}/before-step-{N}"` + reachable commit; `verify_step_artifacts(slug, N)` using ARTIFACTS Step input prerequisites; `verify_monotonicity(completedSteps)` (sorted unique ints, no gaps min..max except logged `skippedSteps`; duplicates → error). Exit 1 + stderr on failure. Keep existing post-step path when flag absent. Honor skip-gates only at orch call-site (script may accept bypass flag if plan requires). Treat checks as **new code** (G5).
- **Acceptance:** AC2. `python -m py_compile`; tag check uses `git tag -l`; no host product names.

#### T5: AC2 — Lite `validate_state.py` `--pre-advance`
- **Depends on:** T3
- **Files:** `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py`
- **Work:** Mirror standard `--pre-advance` for lite Steps 1–5 with lite artifact equivalents. Same exit semantics and monotonicity/checkpoint/artifact checks.
- **Acceptance:** AC2. `python -m py_compile`; behavior parity with standard for shared rules.

#### T6: AC4 — Standard `update_state.py` JSONL dual-write
- **Depends on:** T3
- **Files:** `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
- **Work:** Add `--jsonl-out <path>`; lazy-create parent dirs; append one flat JSON object per successful update (schema from refined plan §4b). Optional fields: `--verification-score`, `--fable-verdict`, `--errors`, `--bypassed`; `gateDecision` from `--gate-choice`. Preserve existing `state.md` nested telemetry serialization (dual-write). Never write source/secrets/PII.
- **Acceptance:** AC4. `python -m py_compile`; each line `json.loads`; state.md path unchanged.

### Level 3 — lite JSONL, aggregate script, skip-gates config (AC4, AC5, AC7)

#### T7: AC4 — Lite `update_state.py` JSONL dual-write
- **Depends on:** T3
- **Files:** `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`
- **Work:** Mirror standard `--jsonl-out` + optional verification/fable/bypass fields. Same schema and safety rules.
- **Acceptance:** AC4. `python -m py_compile`; parity with standard JSONL writer.

#### T8: AC7 — Aggregate telemetry script
- **Depends on:** none
- **Files:** `bin/generate-telemetry-aggregate.cjs`
- **Work:** New Node script. Resolve `plans.dir` from config (default `.agents/plans`). Scan `{plansDir}/**/*.state.md`; optionally merge gate-bypass events from `{plansDir}/**/telemetry/*.jsonl`. Write `{plansDir}/telemetry/aggregate.json` with flat fields: `totalWorkflows`, `completedWorkflows`, `averageElapsedSec`, `averageVerificationScore`, `fableVerdictDistribution`, `gateBypassCount`, `errorTypeDistribution` (maps at most one nesting level). Idempotent full regenerate; current project only.
- **Acceptance:** AC7. `node --check`; retroactive over existing state files; no cross-repo inventory.

#### T9: AC5 — Flag parse + config templates
- **Depends on:** none
- **Files:** `.agents/skills/ws-shared/setup.md`, `.agents/skills/ws-shared/config.json.example`, `.agents/skills/ws-shared/config.schema.json`
- **Work:** Add `skip-gates` / `skipQualityGates` to setup.md Parse flags table. Add `"skipQualityGates": false` under `invariants` in `config.json.example`. Document property under `invariants` in schema (description even if free-object). Do **not** edit consumer-owned `config.json` (G6).
- **Acceptance:** AC5 (G10, G6). Flag parse documented; example default false; schema documents property.

### Level 4 — orch wiring docs (AC2, AC3, AC4, AC5)

#### T10: AC2 + AC4 — Standard dispatch / protocols wire
- **Depends on:** T4, T6
- **Files:** `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md`
- **Work:** Post-mutating order: `update_state` → checkpoint `uswf/{workflow-id}/before-step-{N+1}` → `python …/validate_state.py {state} --pre-advance {N+1}` → Progress Board → Transition Gate → dispatch. On failure: HS-5, no dispatch. Always pass `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl` after AC4 ships (G12). Document skip-gates honor for pre-advance quality gate only. Optional Step 5 note: re-invoke classify when `scoreAndRefine` + score-analysis exists (AC6).
- **Acceptance:** AC2, AC4, AC6 (wire note). Call order matches G11; shell not subagent (OQ1).

#### T11: AC3 + AC5 — Wire standard orch SKILL.md
- **Depends on:** T2, T6, T9
- **Files:** `.agents/skills/ws-spec-to-pr/SKILL.md`
- **Work:** After Step 0 spec exists, before advance to Step 1: invoke classify (or document `--classify`); user-gate / autoMode accept. Document `--skip-gates` / `skipQualityGates`: skips classifier enforcement, fable quality visibility (except `auditVerdictsBlockShip`+REFUTED), pre-advance CI, telemetry soft gates; does **not** skip build/test/security/SCM/HS-1..4 / required `--elapsed`. Banner `[GATES BYPASSED]` on Progress Board / delivery when active. Bypass telemetry JSONL event schema. Orthogonal axes note (classifier lite|standard vs Complexity gate).
- **Acceptance:** AC3, AC5. Safety floor never bypassed; en-us; no host names.

#### T12: AC2 + AC3 + AC5 — Wire lite orch SKILL.md
- **Depends on:** T2, T5, T7, T9
- **Files:** `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- **Work:** Lite transitions Steps 1–5: same shell pre-advance after checkpoint; `--classify`; `--skip-gates` / `skipQualityGates` (same skip/not-skip matrix + safety floor); `--jsonl-out` in hygiene recipes; `[GATES BYPASSED]` banner.
- **Acceptance:** AC2, AC3, AC5. Lite Steps 1–5 covered; parity with standard flag semantics.

### Level 5 — ship-pr, CLI, packaging hubs (AC5, AC7, AC3)

#### T13: AC5 + AC7 — Wire `ws-ship-pr` SKILL.md
- **Depends on:** T8, T9
- **Files:** `.agents/skills/ws-ship-pr/SKILL.md`
- **Work:** Document `--skip-gates` surface (align with T11 matrix + safety floor). After successful delivery completion (and Step 9 convergence when that completes a workflow), call `node bin/generate-telemetry-aggregate.cjs` — non-fatal warn on failure (do not block ship). Ensure PREPARE board still shows fable row (T1) and bypass banner when active.
- **Acceptance:** AC5, AC7. Aggregate warn-and-continue for ship UX; safety floor intact.

#### T14: AC7 — Optional CLI subcommand
- **Depends on:** T8
- **Files:** `bin/cli.js`
- **Work:** Thin `telemetry aggregate` (or equivalent) argv → spawn `generate-telemetry-aggregate.cjs`. Primary entry remains direct `node bin/generate-telemetry-aggregate.cjs` (G9). Align `--help` if help lists subcommands.
- **Acceptance:** AC7 (G9). Optional wrapper only; no behavior fork from script.

#### T15: AC3 — Hub indexes + skill-dependencies
- **Depends on:** T2
- **Files:** `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`, `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`
- **Work:** Add `ws-classify-complexity` to Workflows package skills; add orch `dependencies` edges as needed for classify dispatch. Mirror packaged graph under `ws-shared/skill-dependencies.json`. Sync root + packaged hub skill indexes / task router / Layer tables for the new skill. Keep hubs en-us and portable.
- **Acceptance:** AC3 (G8). Both manifests aligned; hubs list skill; no phantom Extra routes.

### Level 6 — integration tests (All ACs)

#### T16: Integration / unit tests
- **Depends on:** T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15
- **Files:** `test/test-quality-gates.js`
- **Work:** Cover refined plan §5 cases: AC1 fable row + REFUTED contract; AC2 checkpoint/artifacts/monotonicity/HS-5; AC3 classify output/thresholds/override gate; AC4 JSONL fields/lazy dir/no PII/dual-write; AC5 skip-gates + bypass JSONL + banner + safety floor; AC6 deferred scores + distribution impact; AC7 aggregate fields/retroactive/idempotent. Prefer focused assertions; do not rewrite unrelated install suite.
- **Acceptance:** All ACs. Tests green under `npm run tests -- --local` when run after implementation; document any fixtures required.

## Parallelism rules

- Max **3** concurrent tasks per level.
- **Zero** same-level file collisions (verified in DAG JSON).
- Implementers must not edit files outside their task `files` list.
- Do not edit consumer-owned `config.json` / MEMORY / CHANGELOG.
- Integrity regenerate / site bump / harness audit are **post-implement** ship gates (plan Step 8 packaging) — not separate DAG tasks unless Step 4/8 orch expands them later.

## Handoff

Use `.agents/plans/continuous-ai-verification-quality-gates/step-03-continuous-ai-verification-quality-gates.exec.dag.json` for task dispatch.

| Level | Concurrent tasks |
|-------|------------------|
| 1 | T1, T2, T3 |
| 2 | T4, T5, T6 |
| 3 | T7, T8, T9 |
| 4 | T10, T11, T12 |
| 5 | T13, T14, T15 |
| 6 | T16 |

## Step Output

```yaml
step: 3
label: Execution Plan and DAG
status: completed
execMode: parallel
filesTouched:
  - .agents/plans/continuous-ai-verification-quality-gates/step-03-continuous-ai-verification-quality-gates.plan.exec.md
  - .agents/plans/continuous-ai-verification-quality-gates/step-03-continuous-ai-verification-quality-gates.exec.dag.json
evidence:
  - Read refined Step 2 plan, ws-plan-to-tasks, config dagThresholds, MEMORY preflight.
  - Counted 8 refined steps, ~26 unique files, 3 layers vs limits 3/6/2 → parallel.
  - Grouped by AC: PREPARE, validate_state, classify, JSONL, skip-gates, aggregate, tests, hub/deps.
  - 16 atomic tasks across 6 levels; max 3 concurrent; 0 same-level file collisions.
telemetry:
  planSteps: 8
  atomicTasks: 16
  expectedUniqueChangedFiles: 26
  safeDagLevels: 6
  maxConcurrentTasks: 3
  sameLevelFileCollisions: 0
  sequentialThresholds:
    maxImplementationSteps: 3
    maxExpectedFiles: 6
    maxLayers: 2
learning: "ARTIFACTS.md owned as its own early task so AC2/AC3/AC4 implementers share one registry source; orch SKILL wires stay off ARTIFACTS to avoid level collisions."
```
