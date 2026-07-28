---
slug: continuous-ai-verification-quality-gates
title: "Continuous AI Verification & Quality Gates Engine"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Enhance the ws-spec-to-pr / ws-spec-to-pr-lite orchestrators with a unified quality-gate layer. Three subsystems already exist (pre-PR fable-judge gate, post-step state validation, complexity classification in ws-multi-spec) but need formal gate/board integration. Four subsystems are new work: pre-advance CI validation, JSONL telemetry streaming, gate bypass mechanism, and cross-workflow aggregate telemetry. All changes are confined to `.agents/skills/` (skills layer) and `bin/` (CLI layer). No frontend, no database.

## 1. Definition of Ready & Scope

**In scope:** 7 ACs across 3 subsystems (formalization) + 4 subsystems (new). All artifacts follow `ARTIFACTS.md` naming. All new scripts use Node `.cjs` per MEMORY. Existing Python scripts extended in place.

**Out of scope:** Dashboard UI for aggregate telemetry, real-time telemetry streaming, machine-learning-based classification, auto-remediation of failed gates.

**Assumptions:**
- `config.json.fable.*` flags remain the primary control for fable integration.
- `config.json.dagThresholds` remains the sole threshold source.
- Existing `state.md` telemetry stays unchanged (dual-write, no migration).
- `auditVerdictsBlockShip` remains the safety floor (never bypassed).

## 2. Technical Design & Architecture

### Layer: skills (`.agents/skills/`)

| Skill / file | AC | Change |
|-------------|-----|--------|
| `ws-ship-pr/PREPARE-CHECKLIST.md` | AC1 | Add fable-judge row between rows 4 and 5 |
| `ws-spec-to-pr/scripts/validate_state.py` | AC2 | Add `--pre-advance` mode with checkpoint + artifact checks |
| `ws-spec-to-pr/STEP-DISPATCH.md` | AC2 | Wire pre-advance call into post-mutating transition |
| `ws-spec-to-pr-lite/scripts/validate_state.py` | AC2 | Mirror pre-advance mode for lite steps 1–5 |
| `ws-classify-complexity/` (new skill) | AC3 | New skill folder with SKILL.md + `scripts/classify.cjs` |
| `ws-spec-to-pr/SKILL.md` | AC3 | Wire classifier into Step 0 flow |
| `ws-spec-to-pr/scripts/update_state.py` | AC4 | Add `--jsonl-out` flag for dual-write JSONL |
| `ws-spec-to-pr-lite/scripts/update_state.py` | AC4 | Mirror JSONL dual-write |
| `ws-spec-to-pr/SKILL.md` | AC5 | Parse `--skip-gates` flag; wire into gate logic |
| `ws-spec-to-pr-lite/SKILL.md` | AC5 | Parse `--skip-gates` flag; wire into gate logic |
| `ws-ship-pr/SKILL.md` | AC5 | Parse `--skip-gates` flag; wire into fable gate |
| `ws-classify-complexity/scripts/classify.cjs` | AC6 | Read Pass 1 scores from state.md; integrate into recommendation |
| `bin/generate-telemetry-aggregate.cjs` (new) | AC7 | Scan state.md files, write aggregate.json |

### Layer: cli (`bin/`)

| File | AC | Change |
|------|-----|--------|
| `bin/generate-telemetry-aggregate.cjs` (new) | AC7 | Standalone script; also callable from Step 8/9 delivery |
| `bin/cli.js` | AC7 | Optional `telemetry` subcommand for manual aggregate regeneration |

### Layer: tests (`test/`)

| File | AC | Change |
|------|-----|--------|
| `test/test-quality-gates.js` (new) | All | Integration tests for each AC |

### Invariant checks (config.json.invariants)

- `commitPlanFilesOnlyAtStep8: true` — new artifacts committed only at Step 8 delivery. Respected.
- No database, no ORM, no migrations. Skipped.

## 3. Step-by-Step Plan

### Step 1 — AC1: Fable-judge PREPARE board row

**Action:** Edit `ws-ship-pr/PREPARE-CHECKLIST.md` to add fable-judge verdict as row between existing rows 4 and 5.

**Details:**
- Insert new row 5: `Fable-judge audit verdict` with status ✅/❌/⏭
- Renumber existing row 5 (Consumer prepare) to 6, row 6 (Board shown) to 7
- Add "Done when" criteria: verdict shown; REFUTED → ❌ and STOP; VERIFIED/VERIFIED WITH CAVEATS → ✅; no fable config → ⏭
- Update the Rationalizations table to include fable excuse/reality

**Files touched:** `.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md`

**Engineering checks:** Markdown table syntax valid; row numbering sequential; no broken links.

---

### Step 2 — AC2: Pre-advance CI validation (standard + lite)

**Action:** Extend `validate_state.py` with `--pre-advance` mode and wire into step transitions.

**Sub-steps:**

**2a. Extend `validate_state.py`:**
- Add `--pre-advance <N>` CLI flag
- When active, run additional checks:
  - `verify_checkpoint_tag(workflow_id, N)`: `git tag -l "uswf/{workflow-id}/before-step-{N}"` → must exist and point to valid commit
  - `verify_step_artifacts(slug, N)`: Check required input artifacts exist on disk per ARTIFACTS.md step input table
  - `verify_monotonicity(completed_steps)`: Check `completedSteps` is strictly increasing, no gaps, no duplicates
- Return exit 1 on any failure with descriptive error message

**2b. Wire into `STEP-DISPATCH.md`:**
- Add pre-advance call to post-mutating section: after `checkpoint before-step-{N+1}`, before next dispatch
- `python .agents/skills/ws-spec-to-pr/scripts/validate_state.py {workflow-id} --pre-advance {N+1}`
- On failure: HS-5 and prevent dispatch

**2c. Mirror for lite:**
- Apply same `--pre-advance` logic to `ws-spec-to-pr-lite/scripts/validate_state.py`
- Wire into lite orchestrator transitions (Steps 1–5)

**Files touched:**
- `.agents/skills/ws-spec-to-pr/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`

**Engineering checks:** `python -m py_compile validate_state.py` passes; checkpoint tag verification uses `git tag -l`; artifact checks use ARTIFACTS.md step table.

---

### Step 3 — AC3: Complexity classifier skill (`ws-classify-complexity`)

**Action:** Create new standalone skill for complexity classification.

**Sub-steps:**

**3a. Create skill folder:**
- `.agents/skills/ws-classify-complexity/SKILL.md`
- `.agents/skills/ws-classify-complexity/scripts/classify.cjs`

**3b. SKILL.md protocol:**
- Input: spec file path (`{us-dir}/step-00-{slug}.spec.md`) or `--classify` flag
- Analysis: parse spec sections, count requirements, estimate file count from references, layer count from stack config
- Threshold comparison: compare against `config.json.dagThresholds` (steps, files, layers)
- scoreAndRefine integration: if `scoreAndRefine: true` in state.md, read Pass 1 scores and analyze distribution (mean, variance, low-scoring clusters)
- Recommendation logic:
  - All within thresholds + uniform high scores → `lite`
  - All within thresholds + variable scores → `standard`
  - Any threshold exceeded → `standard`
- Output: `step-00-{slug}.classify.md` with recommendation, reasoning, threshold comparison, scoreAndRefine analysis
- User gate: **Accept recommendation** / **Override to standard** / **Override to lite**

**3c. `classify.cjs` script (Node):**
- Read spec file, parse markdown sections
- Count AC items (lines matching `- AC\d+:`)
- Estimate files: count backtick references to files/paths in spec
- Estimate layers: count distinct layer names from stack config
- Read `config.json` for dagThresholds
- Read state.md for scoreAndRefine + Pass 1 scores (if available)
- Write `step-00-{slug}.classify.md`

**3d. Wire into Step 0:**
- Add to `ws-spec-to-pr/SKILL.md` Step 0 flow: after spec creation, run classifier
- Add `--classify` flag support to `ws-spec-to-pr` and `ws-spec-to-pr-lite`

**Files touched:**
- `.agents/skills/ws-classify-complexity/SKILL.md` (new)
- `.agents/skills/ws-classify-complexity/scripts/classify.cjs` (new)
- `.agents/skills/ws-spec-to-pr/SKILL.md` (Step 0 flow)
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md` (--classify flag)
- `bin/skill-dependencies.json` (add ws-classify-complexity)

**Engineering checks:** `node --check classify.cjs` passes; classify.md follows spec format; user gate has ≥2 options.

---

### Step 4 — AC4: JSONL telemetry dual-write

**Action:** Extend `update_state.py` to write JSONL alongside existing state.md telemetry.

**Sub-steps:**

**4a. Add `--jsonl-out` flag to `update_state.py`:**
- Optional flag; when provided, also write JSONL record to `{plansDir}/{slug}/telemetry/step-{NN}.jsonl`
- Create `{plansDir}/{slug}/telemetry/` directory lazily on first write

**4b. JSONL record format:**
```json
{
  "timestamp": "ISO",
  "step": 0,
  "label": "Spec",
  "elapsedSec": 120,
  "promptTokens": 1500,
  "completionTokens": 500,
  "filesTouched": 3,
  "model": "model-name",
  "verificationScore": 8,
  "fableVerdict": "VERIFIED",
  "gateDecision": "advance",
  "errors": [],
  "bypassed": false
}
```

**4c. Extend `update_state.py` to capture new fields:**
- `verificationScore`: from step 5/6 step-output (parse score from result)
- `fableVerdict`: from step 5/6/8 fable audit result
- `gateDecision`: from `--gate-choice` argument
- `errors`: from step-output errors array
- `bypassed`: from `--skip-gates` flag or `config.json.invariants.skipQualityGates`

**4d. Mirror for lite:**
- Apply same changes to `ws-spec-to-pr-lite/scripts/update_state.py`

**Files touched:**
- `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
- `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`

**Engineering checks:** `python -m py_compile update_state.py` passes; JSONL is valid JSON per line; no PII or secrets in output; directory created lazily.

---

### Step 5 — AC5: Gate bypass mechanism

**Action:** Add `--skip-gates` flag and `skipQualityGates` config across orchestrators and ship-pr.

**Sub-steps:**

**5a. Add flag parsing:**
- `ws-spec-to-pr/SKILL.md`: parse `--skip-gates` → `skipQualityGates: true`
- `ws-spec-to-pr-lite/SKILL.md`: same
- `ws-ship-pr/SKILL.md`: same

**5b. Add config:**
- `config.json.invariants.skipQualityGates: false` (default)
- When true, same effect as `--skip-gates`

**5c. Wire into gates:**
- Complexity gate: skip when bypassed
- Fable-judge gate: skip when bypassed (but `auditVerdictsBlockShip` still blocks on REFUTED)
- CI validation: skip when bypassed
- Telemetry scoring: skip when bypassed

**5d. Bypass telemetry:**
- Record bypass event in JSONL: `{type: "gate-bypass", gate: "{name}", reason: "skip-gates|config", timestamp: ISO}`

**5e. Banner:**
- Progress Board shows `[GATES BYPASSED]` when active
- Delivery result shows `[GATES BYPASSED]` when active

**Files touched:**
- `.agents/skills/ws-spec-to-pr/SKILL.md`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- `.agents/skills/ws-ship-pr/SKILL.md`
- `.agents/skills/ws-shared/config.json` (add `skipQualityGates` to invariants)
- `.agents/skills/ws-shared/config.schema.json` (add `skipQualityGates` to schema)

**Engineering checks:** Flag parsed correctly; config schema validates; bypass events recorded in JSONL; banner displayed; `auditVerdictsBlockShip` still blocks on REFUTED even with bypass.

---

### Step 6 — AC6: scoreAndRefine classifier integration

**Action:** Extend classifier to consider Pass 1 scoring distribution.

**Details:** (Already covered in Step 3 — the classifier script reads state.md for Pass 1 scores when `scoreAndRefine: true` and integrates scoring distribution into recommendation logic.)

**Files touched:** Same as Step 3.

---

### Step 7 — AC7: Aggregate telemetry summary

**Action:** Create `bin/generate-telemetry-aggregate.cjs` script.

**Sub-steps:**

**7a. Script logic:**
- Scan `{plansDir}/**/*.state.md` for all workflow state files
- Parse telemetry from each state.md (steps, elapsed, scores, verdicts, errors, bypass events)
- Aggregate into summary:
  - `totalWorkflows`: count of state files
  - `completedWorkflows`: count with `status: completed`
  - `averageElapsedSec`: mean of `totalElapsedSec`
  - `averageVerificationScore`: mean of step 5/6 scores
  - `fableVerdictDistribution`: `{VERIFIED: n, VERIFIED_WITH_CAVEATS: n, REFUTED: n}`
  - `gateBypassCount`: count of bypass events
  - `errorTypeDistribution`: `{type: count}`
- Write to `{plansDir}/telemetry/aggregate.json`

**7b. Wire into Step 8/9:**
- Call from `ws-ship-pr` Step 8 (delivery) or Step 9 (fix-pr) completion
- Also callable standalone: `node bin/generate-telemetry-aggregate.cjs`

**7c. Retroactive scan:**
- First run scans all existing state.md files
- Subsequent runs regenerate from all state files (idempotent)

**Files touched:**
- `bin/generate-telemetry-aggregate.cjs` (new)
- `.agents/skills/ws-ship-pr/SKILL.md` (wire into Step 8/9 completion)

**Engineering checks:** `node --check generate-telemetry-aggregate.cjs` passes; aggregate.json is flat JSON (no nested objects beyond one level); idempotent regeneration; retroactive scan includes all existing state files.

---

### Step 8 — Integration tests

**Action:** Create `test/test-quality-gates.js` with tests for each AC.

**Files touched:**
- `test/test-quality-gates.js` (new)

---

## 4. Permissions, Tenancy & i18n

- **Permissions:** No new RBAC. All gates are workflow-level, not user-level.
- **Tenancy:** No tenant data. All telemetry is workflow-scoped, not user-scoped.
- **i18n:** All output in en-us. No i18n keys needed.

## 5. Test Coverage

| AC | Test case | Method |
|----|-----------|--------|
| AC1 | PREPARE board shows fable row | `testFableRowExists` |
| AC1 | REFUTED → ❌ and STOP | `testFableRefutedBlocks` |
| AC2 | Checkpoint tag verification passes when tag exists | `testCheckpointTagValid` |
| AC2 | Checkpoint tag verification fails when tag missing | `testCheckpointTagMissing` |
| AC2 | Artifact presence check passes when artifacts exist | `testArtifactsExist` |
| AC2 | Artifact presence check fails when artifacts missing | `testArtifactsMissing` |
| AC2 | Monotonicity check passes on valid sequence | `testMonotonicityValid` |
| AC2 | Monotonicity check fails on gap | `testMonotonicityGap` |
| AC2 | HS-5 triggered on pre-advance failure | `testPreAdvanceHS5` |
| AC3 | Classifier outputs recommendation artifact | `testClassifyOutput` |
| AC3 | Classifier respects dagThresholds | `testClassifyThresholds` |
| AC3 | Classifier considers scoreAndRefine | `testClassifyScoreAndRefine` |
| AC3 | User gate offers override | `testClassifyOverride` |
| AC4 | JSONL record written with all fields | `testJsonlFields` |
| AC4 | JSONL directory created lazily | `testJsonlLazyDir` |
| AC4 | No PII in JSONL output | `testJsonlNoPII` |
| AC4 | Dual-write: state.md unchanged | `testDualWriteStateMd` |
| AC5 | --skip-gates flag parsed correctly | `testSkipGatesFlag` |
| AC5 | skipQualityGates config works | `testSkipGatesConfig` |
| AC5 | Bypass events recorded in JSONL | `testBypassTelemetry` |
| AC5 | GATES BYPASSED banner shown | `testBypassBanner` |
| AC5 | auditVerdictsBlockShip still blocks with bypass | `testBypassSafetyFloor` |
| AC6 | Classifier reads Pass 1 scores | `testClassifierPass1Scores` |
| AC6 | Score distribution affects recommendation | `testScoreDistributionImpact` |
| AC7 | aggregate.json has all required fields | `testAggregateFields` |
| AC7 | Retroactive scan includes existing workflows | `testAggregateRetroactive` |
| AC7 | Idempotent regeneration | `testAggregateIdempotent` |

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8: true` — all new artifacts committed only at Step 8 delivery.
- No database, no ORM, no migrations.
- All new scripts are Node `.cjs` (per MEMORY Python freeze for new scripts).
- Existing Python scripts (validate_state.py, update_state.py) extended in place.
- `auditVerdictsBlockShip` is the safety floor — never bypassed regardless of `--skip-gates`.
- All artifacts follow `ARTIFACTS.md` naming conventions.
- No host-product names in any skill body, gate, banner, or template.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills / cli / tests).
- [ ] All new scripts pass syntax check (`node --check`, `python -m py_compile`).
- [ ] All artifacts follow `ARTIFACTS.md` naming.
- [ ] No host-product names in any file.
- [ ] Test cases cover all ACs.
- [ ] `ws-check-harness` passes with 0 critical findings.
- [ ] `ws-check-workflows` passes with 0 critical findings.
- [ ] `npm run tests -- --local` passes.
- [ ] `npm run generate-integrity` && `npm run verify-integrity` exit 0.
- [ ] `config.json` schema validates.

## 8. Open Questions

1. **AC2 pre-advance call site:** Should the pre-advance validation run inside the orchestrator's post-mutating step (as a shell command) or as a separate dispatched subagent? Current plan: shell command in post-mutating step (lighter weight, faster). Alternative: separate subagent for isolation.

2. **AC3 classifier script runtime:** MEMORY says new scripts should be Node `.cjs`. But `classify.cjs` needs to read state.md (YAML frontmatter) — parsing YAML in Node without a dependency is non-trivial. Options: (a) parse YAML manually (like validate_state.py does), (b) call Python script as subprocess, (c) use a lightweight YAML parser. Current plan: manual YAML parsing (self-contained, no dependencies).

3. **AC4 JSONL write frequency:** Should JSONL records be written per step (as each step completes) or batched at workflow completion? Current plan: per step (streaming, append-only). Alternative: batch at Step 8 (simpler but loses streaming benefit).

4. **AC7 aggregate scope:** Should aggregate.json include only current-project workflows or all workflows across projects? Current plan: current project only (scan `{plansDir}/**/*.state.md`). Alternative: global aggregate across all projects.
