---
slug: continuous-ai-verification-quality-gates
title: "Continuous AI Verification & Quality Gates Engine"
status: "plan refined ok"
refinedFrom: step-01-continuous-ai-verification-quality-gates.plan.md
refinedAt: "2026-07-28T09:20:00Z"
---

## 0. Summary & Business Rules

Enhance the `ws-spec-to-pr` / `ws-spec-to-pr-lite` orchestrators with a unified quality-gate layer. Three subsystems already exist (pre-PR fable-judge gate, post-step state validation, complexity classification in `ws-multi-spec`) but need formal gate/board integration. Four subsystems are new work: pre-advance CI validation, JSONL telemetry streaming, gate bypass mechanism, and cross-workflow aggregate telemetry. All changes are confined to `.agents/skills/` (skills layer) and `bin/` (CLI layer). No frontend, no database.

**Refinement decisions (autoMode assumed-defaults):**
1. AC2 pre-advance runs as a **shell command in the orch post-mutating path** (not a separate subagent).
2. AC3 YAML frontmatter in `classify.cjs` uses **manual YAML parsing** (mirror `validate_state.py` mini-parser; no deps).
3. AC4 JSONL is **per-step streaming append** to `{plansDir}/{slug}/telemetry/step-{NN}.jsonl`.
4. AC7 aggregate scans **current project only** (`{plansDir}/**/*.state.md`).

## 1. Definition of Ready & Scope

**In scope:** 7 ACs across 3 subsystems (formalization) + 4 subsystems (new). All artifacts follow `ARTIFACTS.md` naming (extend registry for classify + telemetry). New standalone scripts prefer Node `.cjs` (existing provider pattern + `tools.md` launchers). Existing Python scripts (`validate_state.py`, `update_state.py`) extended in place.

**Out of scope:** Dashboard UI for aggregate telemetry, real-time network streaming, ML-based classification, auto-remediation of failed gates.

**Assumptions:**
- `config.json.fable.*` flags remain the primary control for fable integration.
- `config.json.dagThresholds` remains the sole numeric threshold source for lite vs standard recommendation.
- Existing `state.md` telemetry stays unchanged (dual-write, no migration).
- `auditVerdictsBlockShip` remains the safety floor (never bypassed).
- Classifier axis (`standard`/`lite`) is **orthogonal** to the existing Complexity gate (`simple`/`standard`/`complex` in `gates.md`). Both remain.

## 2. Technical Design & Architecture

### Layer: skills (`.agents/skills/`)

| Skill / file | AC | Change |
|-------------|-----|--------|
| `ws-ship-pr/PREPARE-CHECKLIST.md` | AC1 | Add fable-judge row between rows 4 and 5; renumber 5→6, 6→7 |
| `ws-spec-to-pr/ARTIFACTS.md` | AC2/AC3/AC4 | Add **Step input prerequisites** table; register `step-00-{slug}.classify.md` and `{us-dir}/telemetry/` |
| `ws-spec-to-pr/scripts/validate_state.py` | AC2 | Add `--pre-advance <N>` mode: checkpoint tag, step-input artifacts, monotonic `completedSteps` |
| `ws-spec-to-pr/STEP-DISPATCH.md` + `PROTOCOLS.md` | AC2 | Wire pre-advance shell call after checkpoint, before next dispatch |
| `ws-spec-to-pr-lite/scripts/validate_state.py` | AC2 | Mirror `--pre-advance` for lite Steps 1–5 |
| `ws-spec-to-pr-lite/SKILL.md` | AC2/AC3/AC5 | Lite transitions + `--classify` + `--skip-gates` |
| `ws-classify-complexity/` (new skill) | AC3/AC6 | `SKILL.md` + `scripts/classify.cjs` |
| `ws-spec-to-pr/SKILL.md` | AC3/AC5 | Step 0 classify wire + `--skip-gates` |
| `ws-shared/setup.md` | AC5 | Parse `skip-gates` / `skipQualityGates` in flag table |
| `ws-spec-to-pr/scripts/update_state.py` | AC4/AC5 | `--jsonl-out`, optional verification/fable/bypass fields |
| `ws-spec-to-pr-lite/scripts/update_state.py` | AC4/AC5 | Mirror JSONL dual-write |
| `ws-ship-pr/SKILL.md` | AC5/AC7 | `--skip-gates` + call aggregate on delivery completion |
| `ws-shared/config.json.example` + `config.schema.json` | AC5 | Document `invariants.skipQualityGates` (default `false`) |
| Hubs + `bin/skill-dependencies.json` | AC3 | Register `ws-classify-complexity` in Workflows package |

### Layer: cli (`bin/`)

| File | AC | Change |
|------|-----|--------|
| `bin/generate-telemetry-aggregate.cjs` (new) | AC7 | Scan `{plansDir}/**/*.state.md` (+ JSONL bypass events when present); write `{plansDir}/telemetry/aggregate.json` |
| `bin/cli.js` | AC7 | Optional thin `telemetry aggregate` subcommand → same script (manual regen) |

### Layer: tests (`test/`)

| File | AC | Change |
|------|-----|--------|
| `test/test-quality-gates.js` (new) | All | Integration / unit coverage per AC |

### Evidence notes (audit)

| Claim in draft plan | Codebase finding | Refined action |
|---------------------|------------------|----------------|
| `validate_state.py` already has pre-advance logic | Script validates frontmatter, manifest paths, `currentStep` coherence, commit SHAs only — **no** `--pre-advance`, checkpoint tags, or step-input table | Implement new checks; do not assume existing coverage |
| ARTIFACTS.md step input table | Ownership + canonical names exist; **no** per-step required-input table | Add table as AC2 prerequisite |
| MEMORY “Python freeze for new scripts” | No such MEMORY entry; `tools.md` documents `node`/`python`/`bash` launchers; `.cjs` used in GitHub/fix-pr helpers | Prefer Node `.cjs` for **new** scripts; extend Python in place |
| Edit `config.json` for `skipQualityGates` | `config.json` is consumer-owned / gitignored; ship via `config.json.example` + schema | Do not commit consumer `config.json` |
| PREPARE rows 4/5/6 | Board: 1–4 quality, 5 consumer prepare, 6 show board | Insert fable as new row 5; renumber consumer→6, board→7 |
| `ws-multi-spec` classifier | Protocol-only Smart Flow (`dagThresholds` + frontmatter); no standalone skill | New skill reuses thresholds; multi-spec may later call it (not required for AC) |

### Invariant checks

- `commitPlanFilesOnlyAtStep8: true` — plan/result commit set unchanged; classify.md + telemetry are runtime (not Step 8 delivery stage set unless later explicitly expanded).
- No database / ORM / migrations.
- `auditVerdictsBlockShip` never bypassed.

## 3. Step-by-Step Plan

### Step 1 — AC1: Fable-judge PREPARE board row

**Action:** Edit `ws-ship-pr/PREPARE-CHECKLIST.md` to insert fable-judge between security (4) and consumer prepare (currently 5).

**Details:**
- Insert new row 5: `Fable-judge audit verdict` with status ✅ / ❌ / ⏭
- Renumber Consumer prepare → 6; Board shown → 7
- Update board template table and § Checklist items headings
- **Done when:** verdict shown; `REFUTED` → ❌ and STOP; `VERIFIED` / `VERIFIED WITH CAVEATS` → ✅; fable disabled / not run → ⏭ with evidence
- Enforcement remains `ws-ship-pr` Step 1 preflight (`fable.enabled` + `autoAudit` + `auditVerdictsBlockShip`); board row is visibility only
- Add Rationalizations row: “Fable already ran in orch — skip board” → Show row; credit ⏭ only with current-tree evidence

**Files touched:** `.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md`

**Engineering checks:** Markdown tables sequential; links intact.

---

### Step 2 — AC2: Pre-advance CI validation (standard + lite)

**Action:** Extend `validate_state.py` with `--pre-advance` and wire as **orch shell command** (not a subagent).

**Call-site order (assumed-default OQ1):**

```
step N completes
  → update_state.py (hygiene)
  → checkpoint tag uswf/{workflow-id}/before-step-{N+1}
  → python …/validate_state.py {state} --pre-advance {N+1}
  → Progress Board → Transition Gate → dispatch N+1
```

On failure: **HS-5** and do not dispatch. Honors `--skip-gates` / `skipQualityGates` (quality gate only).

**2a. Extend `validate_state.py`:**
- Add `--pre-advance <N>` (int)
- When active, after (or instead of narrowing) normal hygiene, run:
  - `verify_checkpoint_tag(workflow_id, N)`: `git tag -l "uswf/{workflow-id}/before-step-{N}"` must list a tag; resolve to a reachable commit (`git rev-parse` / `git cat-file -t`)
  - `verify_step_artifacts(slug, N)`: required inputs from **new** ARTIFACTS.md § Step input prerequisites
  - `verify_monotonicity(completedSteps)`: sorted unique ints, no gaps from min..max for recorded completions (allow intentional `skippedSteps` entries already logged; duplicates → error)
- Exit 1 + descriptive stderr on failure
- Keep existing post-step validate path unchanged when `--pre-advance` absent

**2b. ARTIFACTS.md — Step input prerequisites (add):**

| Advance to step N | Required on disk (minimum) |
|-------------------|----------------------------|
| 1 | `step-00-{slug}.spec.md` |
| 2 | spec + `step-01-{slug}.plan.md` |
| 3 | refined plan if interview ran, else plan |
| 4 | plan or refined plan |
| 5 | plan/refined + implementation tree (manifest `created`/`artifacts` non-empty or dryRun) |
| 6 | `step-05-{slug}.plan.report.md` (or skip-testing waiver path N/A) |
| 7 | `step-06-{slug}.review.md` when review ran |
| 8 | testing report when Step 7 completed (not skipped) |
| 9 | `step-08-{slug}.result.md` + PR exists (ship evidence) |

Lite mirrors Steps 1–5 with lite artifact equivalents (`step-08` result naming still applies at lite ship).

**2c. Wire standard:** `STEP-DISPATCH.md` post-mutating line + `PROTOCOLS.md` Normal flow: after checkpoint, run validate `--pre-advance {N+1}` before board/gate/dispatch. Document in `state-hygiene.md`.

**2d. Wire lite:** same shell pattern in `ws-spec-to-pr-lite/SKILL.md` transitions for Steps 1–5.

**Clarification vs spec note:** Spec said “script already has the validation logic.” Evidence: only related hygiene exists. Treat pre-advance checks as **new code** on the existing script.

**Files touched:**
- `.agents/skills/ws-spec-to-pr/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr/ARTIFACTS.md`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` (and/or `protocols/state-hygiene.md`)
- `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`

**Engineering checks:** `python -m py_compile` on both validators; tag check uses `git tag -l`; no host product names.

---

### Step 3 — AC3: Complexity classifier skill (`ws-classify-complexity`)

**Action:** Create standalone skill; wire after Step 0 spec exists (before Step 0 advance / before Complexity gate at Step 1).

**Timing (refined):** Spec says “before spec finalization.” Practical order: **after** `step-00-{slug}.spec.md` exists (write-spec or provider), **before** advancing to Step 1. Standalone: `--classify <spec-path>`.

**Orthogonal to Complexity gate:** Classifier recommends `workflowType` **`lite` | `standard`**. Existing `gates.md` Complexity gate (`simple`/`standard`/`complex`) still runs before Step 1 on full orch. Do not merge the two axes.

**3a. Create folder:**
- `.agents/skills/ws-classify-complexity/SKILL.md`
- `.agents/skills/ws-classify-complexity/scripts/classify.cjs`

**3b. SKILL.md protocol:**
- Input: spec path or orch context `{us-dir}/step-00-{slug}.spec.md`
- Analysis: section count, AC/requirement count, estimated files (backtick path refs), layers from stack/`dagThresholds` context
- Compare to `config.json.dagThresholds` (`maxImplementationSteps`, `maxExpectedFiles`, `maxLayers`)
- Output: `step-00-{slug}.classify.md` (register in ARTIFACTS.md; not Step 8 delivery stage set)
- User gate: **Accept recommendation** / **Override to standard** / **Override to lite**
- `autoMode`: accept recommendation (index 0)
- If recommendation is `lite` while running under `ws-spec-to-pr`: log + offer override; switching orch type mid-flight is **not** silent — prefer override-to-standard stay, or document restart on lite (implementation: log `classify | lite-recommended | stay-standard-unless-override`; only switch when user/auto explicitly chooses lite **and** orch supports handoff — default stay on current orch with advisory)

**3c. `classify.cjs` (Node, assumed-default OQ2):**
- Manual YAML frontmatter parse (flat keys + simple lists; same spirit as `validate_state.parse_frontmatter`)
- No npm YAML dependency
- Count ACs (`- AC\d+:` / Acceptance Criteria bullets)
- Read `dagThresholds` from `{sharedDir}/config.json`
- Optional: read state.md Pass 1 scores when present (see Step 6 / AC6)
- Write classify.md; exit non-zero on missing spec

**3d. Packaging:**
- Add to `bin/skill-dependencies.json` → `packages.workflows.skills` + `dependencies` for orch
- Sync hub skill indexes (root `AGENTS.md`, `.agents/AGENTS.md` as needed)
- Mirror packaged graph under `ws-shared/skill-dependencies.json` when that file is regenerated by install tooling

**Files touched:**
- `.agents/skills/ws-classify-complexity/SKILL.md` (new)
- `.agents/skills/ws-classify-complexity/scripts/classify.cjs` (new)
- `.agents/skills/ws-spec-to-pr/SKILL.md`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- `.agents/skills/ws-spec-to-pr/ARTIFACTS.md`
- `bin/skill-dependencies.json` (+ packaged copy if required by ship gate)
- Hub indexes if skill catalog lists Workflows skills

**Engineering checks:** `node --check classify.cjs`; gate ≥2 options; en-us; harness-neutral.

---

### Step 4 — AC4: JSONL telemetry dual-write

**Action:** Extend `update_state.py` with `--jsonl-out` (assumed-default OQ3: **per-step streaming append**).

**4a. Flag + path:**
- `--jsonl-out` optional path; orch recipes **always pass**  
  `{plansDir}/{slug}/telemetry/step-{NN}.jsonl` after this ships
- Create `{plansDir}/{slug}/telemetry/` lazily (`mkdir -p` / `Path.mkdir(parents=True)`)
- Append one JSON object per line per successful `update_state` invocation for that step (streaming)

**4b. Record schema (flat object):**
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
  "verificationScore": null,
  "fableVerdict": null,
  "gateDecision": "advance",
  "errors": [],
  "bypassed": false
}
```

**4c. New optional CLI fields on `update_state.py`:**
- `--verification-score <int>`
- `--fable-verdict <str>`
- `--errors <comma-or-json-array>`
- `--bypassed` / derive from env or `--skip-gates` presence when orch passes `--bypassed`
- `gateDecision` from existing `--gate-choice`

**4d. Safety:** Never write source code, secrets, or PII; scores/verdicts/hashes only.

**4e. Mirror lite** `update_state.py`.

**Files touched:**
- `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
- `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`
- Orch hygiene recipe lines in `PROTOCOLS.md` / lite SKILL (pass `--jsonl-out`)
- `ARTIFACTS.md` runtime note for `{us-dir}/telemetry/`

**Engineering checks:** `python -m py_compile`; each line `json.loads`; state.md telemetry path unchanged (MEMORY: preserve nested telemetry serialization).

---

### Step 5 — AC5: Gate bypass mechanism

**Action:** `--skip-gates` + `invariants.skipQualityGates`.

**5a. Flag parsing:**
- Add to `ws-shared/setup.md` Parse flags table: `skip-gates` → `skipQualityGates: true`
- Document on `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-ship-pr` SKILL surfaces

**5b. Config templates (not consumer `config.json`):**
- `config.json.example` → `"skipQualityGates": false` under `invariants`
- `config.schema.json` → document property under `invariants` (schema currently allows free object; still document in example)

**5c. Gates skipped when true:**
- Complexity **classifier** user-gate / recommendation enforcement
- Fable-judge **quality** visibility path (PREPARE may ⏭) — **except** when `auditVerdictsBlockShip` + REFUTED (safety floor still STOP)
- Pre-advance CI validation
- Telemetry scoring soft gates (scoreAndRefine advisory reclassify prompts)

**Not skipped:** build, test, security/leak scan, SCM resolution, State Hygiene required `--elapsed`, HS-1..HS-4.

**5d. Bypass telemetry:** append JSONL event  
`{"type":"gate-bypass","gate":"{name}","reason":"skip-gates|config","timestamp":"ISO"}`  
to the current step’s JSONL file (or `telemetry/bypass.jsonl` if no step context).

**5e. Banner:** Progress Board + delivery result show `[GATES BYPASSED]` when active.

**Files touched:**
- `.agents/skills/ws-shared/setup.md`
- `.agents/skills/ws-shared/config.json.example`
- `.agents/skills/ws-shared/config.schema.json` (description only if needed)
- `.agents/skills/ws-spec-to-pr/SKILL.md`
- `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- `.agents/skills/ws-ship-pr/SKILL.md`
- Progress board / delivery-result protocols for banner

---

### Step 6 — AC6: scoreAndRefine classifier integration

**Action:** Wire Pass 1 scoring into classifier **when scores exist**.

**Timing gap (resolved):** Pass 1 scores are produced at Step 5 (`step-05-{slug}.score-analysis.md`) when `scoreAndRefine: true`. Step 0 classify **cannot** see them yet.

**Design:**
1. **Step 0 / first `--classify`:** threshold-only recommendation; classify.md § scoreAndRefine = `deferred (Pass 1 scores unavailable)`.
2. **After Pass 1 (score analysis written):** orch may re-invoke `classify.cjs` with `--score-analysis <path>` (or auto-detect score-analysis artifact). Update classify.md with distribution (mean, variance, low-score clusters). Recommendation may flip lite↔standard **advisories only** unless user re-gates; do not silently change `workflowType` mid-flight.
3. Heuristic: high task count + uniform high scores → may recommend `lite`; moderate count + high variance → `standard`.

**Files touched:** Same as Step 3 + Step 5 score-analysis reader in `classify.cjs`; optional note in `STEP-DISPATCH.md` Step 5 when `scoreAndRefine`.

---

### Step 7 — AC7: Aggregate telemetry summary

**Action:** `bin/generate-telemetry-aggregate.cjs` (assumed-default OQ4: **current project `{plansDir}` only**).

**7a. Script:**
- Resolve `plans.dir` from config (default `.agents/plans`)
- Scan `{plansDir}/**/*.state.md`
- Parse telemetry / status / verdicts / errors; optionally merge gate-bypass events from `{plansDir}/**/telemetry/*.jsonl`
- Write `{plansDir}/telemetry/aggregate.json`:
  - `totalWorkflows`, `completedWorkflows`, `averageElapsedSec`, `averageVerificationScore`
  - `fableVerdictDistribution` (one-level map)
  - `gateBypassCount`
  - `errorTypeDistribution` (one-level map)
- Idempotent full regenerate each run; first run is retroactive over existing state files

**7b. Wire:** Call from `ws-ship-pr` after successful delivery completion (Step 8 path) and after Step 9 convergence when that completes a workflow — non-fatal warning if script fails (do not block ship on aggregate alone unless tests require it; prefer warn + continue for ship UX, fail in unit tests).

**7c. Optional CLI:** `node bin/cli.js telemetry aggregate` → spawn same script (thin argv).

**Files touched:**
- `bin/generate-telemetry-aggregate.cjs` (new)
- `bin/cli.js` (optional subcommand)
- `.agents/skills/ws-ship-pr/SKILL.md`

**Engineering checks:** `node --check`; flat JSON with at most one nesting level for maps.

---

### Step 8 — Integration tests + packaging gates

**Action:** `test/test-quality-gates.js` covering ACs; then upstream ship prerequisites for new skill/scripts.

**Also required when implementing (upstream):**
- `npm run tests -- --local`
- `npm run generate-integrity` && `npm run verify-integrity`
- `ws-check-harness` / `ws-check-workflows` (orch/gates/dispatch changed)
- Site bump only if shipping package content in a release PR

**Files touched:** `test/test-quality-gates.js` (new); integrity manifest when hashed paths change.

---

## 4. Permissions, Tenancy & i18n

- **Permissions:** No new RBAC. Gates are workflow-level.
- **Tenancy:** No tenant data. Telemetry is workflow-scoped within the consumer repo’s `{plansDir}`.
- **i18n:** en-us only.

## 5. Test Coverage

| AC | Test case | Method |
|----|-----------|--------|
| AC1 | PREPARE board shows fable row between 4 and consumer prepare | `testFableRowExists` |
| AC1 | REFUTED → ❌ and STOP (doc/contract) | `testFableRefutedBlocks` |
| AC2 | Checkpoint tag valid / missing | `testCheckpointTagValid` / `Missing` |
| AC2 | Artifact presence pass/fail | `testArtifactsExist` / `Missing` |
| AC2 | Monotonicity valid / gap | `testMonotonicityValid` / `Gap` |
| AC2 | Pre-advance failure → non-zero exit (HS-5 contract) | `testPreAdvanceHS5` |
| AC3 | classify.md output + thresholds | `testClassifyOutput` / `Thresholds` |
| AC3 | Override gate options present in SKILL | `testClassifyOverride` |
| AC4 | JSONL fields, lazy dir, no PII, state.md dual-write | `testJsonl*` |
| AC5 | Flag + config + bypass JSONL + banner + safety floor | `testSkipGates*` / `testBypassSafetyFloor` |
| AC6 | Deferred without scores; distribution when Pass 1 present | `testClassifierPass1Scores` / `testScoreDistributionImpact` |
| AC7 | aggregate fields, retroactive, idempotent | `testAggregate*` |

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8: true` for plan/result delivery staging.
- No database, ORM, migrations.
- New standalone scripts: Node `.cjs` with `node` launcher; extend existing Python validators/updaters in place.
- `auditVerdictsBlockShip` safety floor never bypassed.
- ARTIFACTS.md naming; register new artifact types before inventing paths.
- No host-product names in skill bodies, gates, banners, templates.
- Consumer-owned `config.json` / MEMORY / CHANGELOG not overwritten by shipping templates incorrectly.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills / cli / tests).
- [ ] Syntax: `node --check`, `python -m py_compile`.
- [ ] ARTIFACTS.md updated (inputs table + classify + telemetry).
- [ ] No host-product names.
- [ ] Tests cover all ACs.
- [ ] `ws-check-harness` 0 critical.
- [ ] `ws-check-workflows` 0 critical when orch/sim changed.
- [ ] `npm run tests -- --local` passes.
- [ ] `npm run generate-integrity` && `npm run verify-integrity` exit 0.
- [ ] `config.json.example` validates against schema.
- [ ] Skill registered in `bin/skill-dependencies.json` + hubs.

## 8. Open Questions (resolved)

| # | Question | Resolution | Basis |
|---|----------|------------|-------|
| 1 | AC2 pre-advance call site: shell vs subagent? | **Shell command in post-mutating path** after checkpoint, before dispatch | Plan Current recommendation; lighter; matches existing `python update_state.py` / `git tag` pattern in PROTOCOLS |
| 2 | AC3 YAML in Node? | **Manual YAML parsing in `classify.cjs`** (no deps) | Plan Current; mirrors `validate_state.parse_frontmatter`; avoids Python subprocess bridge |
| 3 | AC4 JSONL frequency? | **Per-step streaming append** to `step-{NN}.jsonl` | Plan Current; matches AC wording “on each step completion” |
| 4 | AC7 aggregate scope? | **Current project only** `{plansDir}/**/*.state.md` | Plan Current; portable; no cross-repo inventory |

Additional audit resolutions (not originally in §8) are recorded in the Interview registry below.

## Interview registry

| id | class | section | gap | status | resolution |
|----|-------|---------|-----|--------|------------|
| OQ1 | blocking | §8 / AC2 | Pre-advance shell vs subagent | resolved | Assumed-default: shell in post-mutating after checkpoint |
| OQ2 | blocking | §8 / AC3 | YAML parse strategy for classify.cjs | resolved | Assumed-default: manual mini-parser, no deps |
| OQ3 | blocking | §8 / AC4 | JSONL per-step vs batch | resolved | Assumed-default: per-step streaming append |
| OQ4 | blocking | §8 / AC7 | Aggregate project vs global | resolved | Assumed-default: `{plansDir}` current project only |
| G1 | blocking | §2 / AC2 | ARTIFACTS.md lacks step input prerequisites table cited by AC2 | resolved | Add table in ARTIFACTS.md as part of Step 2; drive `verify_step_artifacts` from it |
| G2 | blocking | §2 / AC3–4 | `classify.md` and `telemetry/` not in ARTIFACTS registry | resolved | Register both; classify not in Step 8 stage set |
| G3 | blocking | §3 / AC6 | Pass 1 scores unavailable at Step 0 classify | resolved | Defer scoreAndRefine section at Step 0; re-invoke classify after score-analysis exists; no silent mid-flight workflowType switch |
| G4 | non-blocking | §3 / AC3 | Classifier lite/standard vs Complexity simple/standard/complex | resolved | Keep orthogonal; document both axes; classifier does not replace Complexity gate |
| G5 | blocking | §0 notes | Spec overstates existing validate_state pre-advance coverage | resolved | Treat `--pre-advance` checks as new code; keep post-step hygiene |
| G6 | blocking | §5 / AC5 | Plan edited consumer `config.json` | resolved | Ship `config.json.example` (+ schema docs); consumers get key on configure/seed |
| G7 | non-blocking | §1 / §6 | “MEMORY Python freeze” claim unsupported | resolved | Cite `tools.md` launchers + existing `.cjs` helpers; extend Python in place |
| G8 | blocking | §3 / AC3 | New skill missing from skill-dependencies / hubs | resolved | Add to Workflows package graph + hub indexes in implement step |
| G9 | non-blocking | §2 / AC7 | `cli.js` telemetry subcommand optional | resolved | Thin optional wrapper; primary entry is `node bin/generate-telemetry-aggregate.cjs` |
| G10 | blocking | §5 / AC5 | setup.md flag parse list omits skip-gates | resolved | Add to setup.md Parse flags alongside other orch flags |
| G11 | non-blocking | §2 / AC2 | Call order vs checkpoint creation | resolved | Create `before-step-{N+1}` first, then `--pre-advance {N+1}` |
| G12 | non-blocking | §4 / AC4 | Whether orch must pass `--jsonl-out` | resolved | Yes: orch recipes always pass path after AC4 ships |
