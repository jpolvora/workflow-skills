# Step dispatch (canonical)

**Sole source of truth** for **`ws-spec-to-pr` (standard)** step 0–9 dispatch actions, post-mutating merge notes, and Step 8/9 gate protocols. Load from `SKILL.md` only when advancing or dispatching a step. FSM, invariants, and gates overview stay in `SKILL.md`.

**Dual-mode (mandatory):** This file is **not** the lite step index. [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md) keeps its own Steps 0–5 table. Shared gate/ship UX and artifact names stay in [`gates.md`](../ws-shared/gates.md) / [`config-resolution.md`](../ws-shared/config-resolution.md). Pipeline `ws-*` folders (folder == frontmatter `name:`; FSM steps stay 0–9 / Post) stay orch-agnostic: never assume full vs lite step numbers; orch passes `workflowType`, paths, and flags.

## Step instructions

> **Consistency:** the Skill map in `SKILL.md` (`ws-verify-plan` → Step 5, etc.) is authoritative. Keep this table aligned — never dispatch retired ids (`05-verify-sync-plan-us`, `implement-plan`, `plan-us`, …).

> **Subagent Model Switching:** The orchestrator session ALWAYS runs under the active session model (`currentModel`). Resolve subagent models from `defaults.modelsPreset` / `defaults.modelPresets`, optional `defaults.stepModels` (numeric `"0"`–`"9"`, `dag`, `scoreAndRefine`, `reviewFix`), and legacy phase keys (`plannerModel`, `executionModel`, `reviewerModel`, `testingModel`). Pass the resolved host id on `dispatch-agent` and as `--model` (plus optional `--substep` when applicable) to `update_state.cjs`. Blank `--model` backfills via `resolvePhaseModel`. **Standard buckets:** Steps 0–3 → `plannerModel`; Step 4 sequential (`enableDag: false`) → Step `4` / `executionModel` (no required `dag` key); Step 4 DAG workers (`enableDag: true`) → role `dag` / `executionModel`; Steps 5–6 → `reviewerModel`; Step 5 `scoreAndRefine` re-implement → role `scoreAndRefine` / `executionModel`; Step 6 review-fix implement → role `reviewFix` / `executionModel`; **Step 7 resolve:** `testingModel` → `executionModel` → session **after** preset/`stepModels` overrides; Steps 8–9 → session unless `stepModels["8"|"9"]` is set. Token `"current"` → session. On subagent switch failure or unconfigured model, gracefully fall back to `currentModel`.

| Step | Action | Artifact |
|------|--------|----------|
| 0 | Entry gate (user-gate). US/tracker provided → provider fetch snapshot → **prior-work sweep** (`sweep-prior-work` plus `node {skillsRoot}/ws-spec-to-pr/scripts/search_plan_history.cjs --slug {slug} --keyword <terms>`) recorded in `step-00`; surface matching completed local workflow artifacts. Then `dispatch-agent` `ws-write-spec` (reformulate & enhance to `{specsDir}/{slug}.spec.md` with agentic ACs + original human context + authoring validate). **Newly written** spec: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "{specsDir}/{slug}.spec.md"` — non-zero → **skip** `ws-local-spec-provider` register and STOP. Pre-closure existing `*.spec.md`: register allowed under `--mode=compat` (warn, do not fail). No args → free-text → same local history sweep → `dispatch-agent` `ws-write-spec` → authoring validate → register only on PASS. Existing `*.spec.md` → history sweep → compat validate → register. Optional soft clarify if AC empty. After register: `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs init --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/ac-ledger.json" --slug {slug} --workflow-id {workflow-id}` (required before pre-advance 1). | `{specsDir}/{slug}.spec.md` **then** `step-00-{slug}.spec.md` + `ac-ledger.json` |
| 1 | Complexity gate → if simple: stub plan; `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs build --plan "{us-dir}/step-01-{slug}.plan.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/plan.index.json"`; run Step 3 sequential stub below; `update_state finish --status skipped --reason interview-not-required` (step 2) and `--reason dag-disabled` (step 3); advance to 4. Else `dispatch-agent` `ws-write-plan`; same `plan_index.cjs build`; then `python {skillsRoot}/ws-spec-to-pr/scripts/check_memory_conflict.py {us-dir}/step-01-{slug}.plan.md --json` (exit 0 → proceed, including missing MEMORY.md consult-skipped; exit 2 → record trap titles and `force_interview`; exit 1 → HS-5 STOP for a missing plan file). | `step-01-{slug}.plan.md` + `plan.index.json` |
| 2 | Conditional: skip if eligible **and** `force_interview` is not true ([`gates.md`](../ws-shared/gates.md)); `finish --status skipped --reason interview-not-required`. Else `dispatch-agent` `ws-interview`; 2c End auto-confirms 2e. After refined plan: rebuild `plan_index.cjs build --plan "{us-dir}/step-02-{slug}.plan.refined.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/plan.index.json" --draft "{us-dir}/step-01-{slug}.plan.md"`. | `step-02-{slug}.plan.refined.md` (or skip) |
| 3 | When `defaults.enableDag` is `false` (default): do **not** `dispatch-agent`. Run `node {skillsRoot}/ws-spec-to-pr/scripts/write_sequential_dag.cjs --slug {slug} --workflow-id {workflow-id} --plan "{planOfRecord}" --exec-out "{us-dir}/step-03-{slug}.plan.exec.md" --dag-out "{us-dir}/step-03-{slug}.exec.dag.json"` (`{planOfRecord}` = refined plan if present, else step-01); `update_state finish --status skipped --reason dag-disabled`. When `defaults.enableDag` is `true`: `dispatch-agent` `ws-plan-to-tasks` (evaluates `dagThresholds`; sequential stub or parallel DAG). | `step-03-{slug}.plan.exec.md` + `step-03-{slug}.exec.dag.json` |
| 4 | Pre-implement check: `python {skillsRoot}/ws-spec-to-pr/scripts/check_memory_conflict.py {targetPlan} --json` (`{targetPlan}` = plan of record; exit 0 proceed including MEMORY consult-skipped; exit 2 pass DO NOT / INSTEAD DO into subagent; exit 1 HS-5). `dispatch-agent` `ws-implement-tasks` mode build; inject AC slices via `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs read --index "{us-dir}/plan.index.json" --ac AC{n}` (do not re-read superseded step-01). Verify `pattern_consult`/`memory_consult` proof; branch-direct default | verification |

| 5 | `dispatch-agent` `ws-verify-plan` **quick-score default** vs refined spec ‖ spec; full matrix if score < 9 or `--strict`; **Regression Sabotage Check** when required (missing required → score **< 9**); **&lt;9 gate** (`scoreAndRefine` until ≥ 9); then **G2-code after Step 5 before Step 6** (skip if empty) | `step-05-{slug}.plan.report.md` |
| 6 | Fail-closed dirty preflight; `dispatch-agent` `ws-code-review` (`git diff {base}...HEAD`); Critical/Warning → **fix → re-review** via `ws-implement-tasks` (max 3; not a separate step); then G2-code of review fixes if dirty; soft model tip for stronger review LLM | `step-06-{slug}.review.md` (+ optional `.fix.report.md`) |
| 7 | Machine probe first: `node {skillsRoot}/ws-testing/scripts/probe_test_surface.cjs --json`. Auto-skip **only** when `skipTesting` (`finish --reason testing-disabled`) or probe `hasTestSurface` is false and unit aliases are green (`finish --reason no-test-surface`). Agent judgment cannot skip. Else `dispatch-agent` `ws-testing`. Inside Step 7, optional **mutation** substep runs only when `verification.mutationTest` is set and `defaults.skipMutationTesting` is false; skip (log) otherwise. When mutation skipped/unset, **regression sabotage** via `run_sabotage.py`. Mutation score &lt; `verification.mutationThreshold` (default 80) or runner non-zero → Step 7 **fail-closed** (no Advance to 8); hand off to `ws-implement-tasks` fix mode. FSM stays 0–9 (no new step). | `step-07-{slug}.testing.*` |
| 8 | Delivery result + **combined ship gate** ([`gates.md`](../ws-shared/gates.md)) → `ws-ship-pr` (`workflowMode: true`, `stopBeforeFixPr: true`). **`comment-issue`** on PR create when tracker id present; **`check-pr-status`** for CI triage. MEMORY sweep after delivery commit. | `step-08-{slug}.result.md` |
| 9 | `dispatch-agent` `ws-goal-fix-pr` (default) or `ws-fix-pr` (one-shot) after PR exists. CI fixes use **`check-pr-status`** only (baseline vs diff + one flake rerun). **`comment-issue`** on in-session merge when applicable. | PR threads / merge |

### Post-mutating transition (after step N completes)

**Order (mandatory):**

1. **`update_state.cjs`** — use `dispatch` before execution and `finish` after structured output; merge `files_touched`, record measured telemetry, and advance `currentStep`. Always pass `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl` (zero-padded `NN`; lazy-create `telemetry/`). When `--skip-gates` or `config.json.invariants.skipQualityGates` is active, run its `bypass` operation.
2. **G2-code (Steps 5 and 6 only)** — After Step 5 (score ≥ 9): **G2-code after Step 5 before Step 6** (skip if empty stage). After Step 6 review-fix: one G2-code if product files remain. Algorithm and messages: [`gates.md`](../ws-shared/gates.md) § Required G2-code save points. Uncommitted workflow product files → **STOP**; do not dispatch `ws-code-review`. `dryRun` simulates only. Other steps: skip this item.
3. **Checkpoint** — `Shell` tag `uswf/{workflow-id}/before-step-{N+1}` @ HEAD **after** any G2-code (skip tag write in `dryRun`; log only). Pre-advance soft-passes missing tags when `dryRun: true`.
4. **Pre-advance validation** — **shell command** (not `dispatch-agent`):

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs \
  {plansDir}/{slug}/{workflow-id}.state.md \
  --pre-advance {N+1}
```

On exit ≠ 0 → **HS-5**; **STOP** — no Progress Board, no Transition Gate, no dispatch to step N+1.

**Skip (pre-advance gate only):** When `--skip-gates` or `skipQualityGates` is active, **omit** step 4; log gate-bypass in JSONL (`type: gate-bypass`, `gate: pre-advance`, `reason: skip-gates|config`). Does **not** skip `update_state`, G2-code, checkpoint, build/test/security, or HS-1–HS-4.

5. **Progress Board** → **Transition Gate** → dispatch step N+1 (or auto-gate + dispatch in `autoMode`).

### Step 5 — Check-implementation (score gate)

Eval implemented code vs **refined spec when present, else `step-00-{slug}.spec.md`**. Publish integer **score 0–10** in Progress Board + report.

When `defaults.parallelVerifyReview` is `true`, first run G2-code after Step 4 and pin that immutable commit. Dispatch Steps 5 and 6 concurrently as read-only product-tree reviewers; each may write only its own workflow report and neither may write state, ledger, or product files. After both finish, the orchestrator runs `merge_verify_review.cjs`, which sorts findings by severity, path, line, id, and source, then links results serially. Any score gap or Warning/Critical enters one fix, re-verify, and re-review loop. The default remains `false`, preserving sequential Step 5 then Step 6.

When a configured format/build alias fails only on paths outside workflow `files_touched`, `link` `aliasResult` with `skipReason: baseline-dirty` (record the real non-zero `exitCode`).

When overall score is `< 9`, run `scoreAndRefine` even if `defaults.scoreAndRefine` is false. When `scoreAndRefine` mode is active (or triggered at bootstrap on completed workflows) **or** score is `< 9`:
- Evaluates each plan task in `step-01-{slug}.plan.md` on criteria fulfillment, code quality, edge-cases, and test coverage.
- Outputs `step-05-{slug}.score-analysis.md` containing task-by-task scores (0–10) and specific enhancement recommendations.
- **Optional (AC6):** When `step-05-{slug}.score-analysis.md` exists, re-invoke `ws-classify-complexity` with `--score-analysis` before the score gate — advisory only; does not block Advance.
- If overall score `< 9`: do **not** offer Accept Pass 1 As-Is. Re-dispatch `ws-implement-tasks` for tasks scoring `< 9`, then re-verify, until overall `≥ 9` (max 3 rounds; log `score-refine | round={n}/3`). After 3 rounds still `< 9`: Pause. Resume continues the loop.
- If overall score already `≥ 9` and `scoreAndRefine` flag: prompt **Pass 1 Score Analysis Gate** via `user-gate` (Option 1: Proceed with Second Pass Refinement; Option 2: Accept Pass 1 As-Is & Ship; Option 3: Selective Refinement). Option 1 or 3 re-dispatches `ws-implement-tasks` (role `scoreAndRefine`) for the **wide-context second pass** in [`gates.md`](../ws-shared/gates.md) § Score & Refine (item 4): full Pass 1 diff, overengineering sweep, unused workflow-introduced artifact removal. Option 1 runs even when zero tasks are flagged.

| Score | Behavior |
|-------|----------|
| ≥ 9 | Complete step 5; **G2-code after Step 5 before Step 6** (skip if empty); then dispatch 6 |
| &lt; 9 | **scoreAndRefine** until ≥ 9 (max 3 rounds, then Pause). Never Advance or auto-approve below 9. Refine runs **before** the product commit. |

`autoMode`: auto-run scoreAndRefine rounds; do **not** auto-approve below 9 — Pause only after max rounds still < 9.

Contract: [`gates.md`](../ws-shared/gates.md) § Check-implementation gate and § Score & Refine gate.

### Step 6 — Code-review + fix → re-review loop (substep)

| Case | Behavior |
|------|----------|
| Clean (no Critical/Warning) | Complete step 6; skip review-fix G2-code; Advance to 7 |
| Critical/Warning findings | Fix → re-review rounds via `ws-implement-tasks` mode fix (max **3**); state/memory each round; Advance only when clean |
| After loop, product files remain | One **G2-code** commit for all fix rounds (`fix({slug}): code-review fixes`); then Advance |
| Residual after 3 rounds | **Pause** (fail closed) — do not Advance with open Critical/Warning |
| `autoMode` | Autofix (no ask); same max 3; Pause on residual; G2-code when stage set non-empty |

Fix is **not** its own `completedSteps` entry — log `review-fix | round={n}/3` in gate history. Contract: [`ws-code-review`](../ws-code-review/SKILL.md) § Fix → re-review loop. **Do not dispatch** review while uncommitted workflow product files remain.

### Step 8 — Ship (delivery + push/PR)

**Order:** [`protocols/delivery-result.md`](protocols/delivery-result.md) (writes `step-08-{slug}.result.md` **with Benchmark Total wall-clock time**) → render Step 8 final board Telemetry ([`progress-board.md`](protocols/progress-board.md)) → **combined delivery + ship user-gate** → on delivery commit: MEMORY sweep → optional Phase B plan-dir temp delete per [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md).

**Phase A git cleanup:** If this Step 8 ends the workflow with `status → completed` (no Step 9 / skip-PR), run Phase A **once** before claiming ended (`python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}`). If advancing to Step 9, defer Phase A until Step 9 sets `completed` — never run Phase A at both steps. Exit 0 proceed; exit 2 surface leftovers (may claim ended); exit 1 do not claim ended.

When `scoreAndRefine` was executed, generate `step-08-{slug}.second-pass-report.md` comparing Pass 1 vs Pass 2 scores, LOC deltas, simplifications/deletions, quality gains, and test metrics. Include Pass 1 vs Pass 2 comparative summary table in `step-08-{slug}.result.md`.

Telemetry/`--elapsed` still required under `autoMode`/`fullMode` (State Hygiene → HS-5 if missing).

**Combined gate** ([`gates.md`](../ws-shared/gates.md)):

1. **Commit configured delivery artifacts, then create PR** (Recommended when `fullMode`)
2. **Commit configured delivery artifacts, push only**
3. **Commit configured delivery artifacts, skip PR**
4. **Skip delivery commit and skip shipping**
5. **Pause**

G2-delivery stages only artifacts enabled by `defaults.deliveryCommitArtifacts` — see [`ARTIFACTS.md`](ARTIFACTS.md) § Step 8.

Dispatch `ws-ship-pr` with `workflowMode: true`, `shipAction`, `stopBeforeFixPr: true` — **no goal-fix loop inside ship**; orch Advance to 9 when PR created.
After delivery commit / PR creation, auto-run [`ws-spec-index`](../ws-spec-index/SKILL.md) `sync` with `{slug}` and `shipEvidence`.

### Step 9 — Fix-PR

After Step 8 when `shipAction: create-pr` and PR exists:

1. **Wait for code-review / CI feedback** (same policy as `ws-ship-pr` Step 6 settle: wait 30s post-PR creation for code-review action to start on GitHub infrastructure, then default 300s post-push heartbeats, then poll checks + threads). Do not merge yet.
2. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot) until **no open issues to fix** (`activeThreads == 0`).
3. **Merge** via SCM provider `merge-pr` only after step 2 converges and required checks are green. Never merge with open review threads or failing required checks.

When setting `status → completed` after convergence (or equivalent terminal end), run **Phase A** git cleanup once before claiming ended — see [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md). Do not also run Phase A at Step 8 when Step 9 ran.

Stop: max exhausted · escalate · merge blocked · cancelled · PR closed · checks red after convergence attempts.
