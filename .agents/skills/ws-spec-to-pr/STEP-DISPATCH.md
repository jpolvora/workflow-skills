# Step dispatch (canonical)

**Sole source of truth** for **`ws-spec-to-pr` (standard)** step 0–9 dispatch actions, post-mutating merge notes, and Step 8/9 gate protocols. Load from `SKILL.md` only when advancing or dispatching a step. FSM, invariants, and gates overview stay in `SKILL.md`.

**Dual-mode (mandatory):** This file is **not** the lite step index. [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md) keeps its own Steps 0–5 table. Shared gate/ship UX and artifact names stay in [`gates.md`](../ws-shared/gates.md) / [`config-resolution.md`](../ws-shared/config-resolution.md). Pipeline `ws-*` folders (folder == frontmatter `name:`; FSM steps stay 0–9 / Post) stay orch-agnostic: never assume full vs lite step numbers; orch passes `workflowType`, paths, and flags.

**Host execution mode (mandatory):** Resolve `defaults.hostAdapter.mode` + `hasSubagentTool` / CLI runner per [`host-dispatch.md`](../ws-shared/host-dispatch.md) before Step 0 dispatch. Tier 1 uses native `dispatch-agent`; Tier 2 uses CLI background task; Tier 3 uses Inline Isolated Execution (session adopts step persona, context pointers only, log `inline-isolated-step`). Interactive gates bind per [`gates.md`](../ws-shared/gates.md) (in normal mode, modal tool when `hasStructuredChoiceTool`, else markdown with strict turn-yielding; in `autoMode`, auto-select index 0 and proceed automatically) and One Step Per Turn in normal interactive mode (never start Step N+1 in the same turn as Step N gate; in `autoMode`, proceed continuously).

## Step instructions

> **Consistency:** the Skill map in `SKILL.md` (`ws-plan-verify` → Step 5, etc.) is authoritative. Keep this table aligned — never dispatch retired ids (`05-verify-sync-plan-us`, `implement-plan`, `plan-us`, …).

> **Subagent Model Switching:** The orchestrator session ALWAYS runs under the active session model (`currentModel`). Resolve subagent models from `defaults.modelsPreset` / `defaults.modelPresets`, optional `defaults.stepModels` (numeric `"0"`–`"9"`, `dag`, `scoreAndRefine`, `reviewFix`, `fixPrPlan`, `fixPrExec`), and legacy phase keys (`plannerModel`, `executionModel`, `reviewerModel`, `testingModel`). Pass the resolved host id on `dispatch-agent` and as `--model` (plus optional `--substep`) to `update_state.cjs`. Blank `--model` backfills via `resolvePhaseModel`. **Standard buckets:** Steps 0–3 → `plannerModel`; Step 4 sequential (`enableDag: false`) → numeric `4` / `executionModel`; DAG → `dag` / `executionModel`; Steps 5–6 → `reviewerModel`; `scoreAndRefine` and `reviewFix` → `executionModel`; **Step 7 resolve:** `testingModel` → `executionModel` → session after overrides; Steps 8–9 → session unless their numeric override is set. Inside Step 9, capture the session fallback once: `fixPrPlan` resolves role override → preset role → `reviewerModel` → session, and `fixPrExec` resolves role override → preset role → `executionModel` → session. These two roles never consult numeric `"9"`. Token `"current"` → session. On switch failure or unconfigured model, run the role under captured `currentModel` and record that actual model.

**Verbose preview:** When `defaults.verboseMode` is explicit `true`, the **model that will execute this step** (orchestrator for orch-owned work; the dispatched subagent otherwise) must **analyze this run** (Action column, state, files already on disk, skip rules, config) and print, before any tool call:

```text
Starting step {N} ({Label}):
* {goal for this slug / this run}
* {what you will look for}
* {what you will do}
* {conditional writes}
* {how you will know the next step is ready}
```

Fill 4–8 `*` bullets from that analysis. Do **not** copy a canned list from a skill, script, or prior step. Omitted or `false` → do not print this block. Schema/seed default is `true` only when `ws-configure-project` writes the key. When using `dispatch-agent`, append the VerboseMode addendum in [`PROTOCOLS.md`](PROTOCOLS.md) § Base Prompt Prefix.

| Step | Action | Artifact |
|------|--------|----------|
| 0 | Entry gate (user-gate). US/tracker provided → provider fetch snapshot → **prior-work sweep** (`sweep-prior-work` plus `node {skillsRoot}/ws-spec-to-pr/scripts/search_plan_history.cjs --slug {slug} --keyword <terms>`) recorded in `step-00`; surface matching completed local workflow artifacts. Then `dispatch-agent` `ws-spec-write` (reformulate & enhance to `{specsDir}/{slug}.spec.md` with agentic ACs + original human context + authoring validate). **Newly written** spec: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring "{specsDir}/{slug}.spec.md"` — non-zero → **skip** `ws-spec-provider-local` register and STOP. Pre-closure existing `*.spec.md`: register allowed under `--mode=compat` (warn, do not fail). No args → free-text → same local history sweep → `dispatch-agent` `ws-spec-write` → authoring validate → register only on PASS. Existing `*.spec.md` → history sweep → compat validate → register. Optional soft clarify if AC empty. After register: `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs init --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/ac-ledger.json" --slug {slug} --workflow-id {workflow-id}` (required before pre-advance 1). | `{specsDir}/{slug}.spec.md` **then** `step-00-{slug}.spec.md` + `ac-ledger.json` |
| 1 | Complexity gate → if simple: stub plan; `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs build --plan "{us-dir}/step-01-{slug}.plan.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/plan.index.json"`; run Step 3 sequential stub below; `update_state finish --status skipped --reason interview-not-required` (step 2) and `--reason dag-disabled` (step 3); advance to 4. Else `dispatch-agent` `ws-plan-write`; same `plan_index.cjs build`; then `python {skillsRoot}/ws-spec-to-pr/scripts/check_memory_conflict.py {us-dir}/step-01-{slug}.plan.md --json` (exit 0 → proceed, including missing MEMORY.md consult-skipped; exit 2 → record trap titles and `force_interview`; exit 1 → HS-5 STOP for a missing plan file). | `step-01-{slug}.plan.md` + `plan.index.json` |
| 2 | Conditional: skip if eligible **and** `force_interview` is not true ([`gates.md`](../ws-shared/gates.md)); `finish --status skipped --reason interview-not-required`. Else `dispatch-agent` `ws-plan-interview`; 2c End auto-confirms 2e. After refined plan: rebuild `plan_index.cjs build --plan "{us-dir}/step-02-{slug}.plan.refined.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/plan.index.json" --draft "{us-dir}/step-01-{slug}.plan.md"`. | `step-02-{slug}.plan.refined.md` (or skip) |
| 3 | When `defaults.enableDag` is `false` (default): do **not** `dispatch-agent`. Run `node {skillsRoot}/ws-spec-to-pr/scripts/write_sequential_dag.cjs --slug {slug} --workflow-id {workflow-id} --plan "{planOfRecord}" --exec-out "{us-dir}/step-03-{slug}.plan.exec.md" --dag-out "{us-dir}/step-03-{slug}.exec.dag.json"` (`{planOfRecord}` = refined plan if present, else step-01); `update_state finish --status skipped --reason dag-disabled`. When `defaults.enableDag` is `true`: `dispatch-agent` `ws-plan-to-tasks` (evaluates `dagThresholds`; sequential stub or parallel DAG). | `step-03-{slug}.plan.exec.md` + `step-03-{slug}.exec.dag.json` |
| 4 | Pre-implement check: `python {skillsRoot}/ws-spec-to-pr/scripts/check_memory_conflict.py {targetPlan} --json` (`{targetPlan}` = plan of record; exit 0 proceed including MEMORY consult-skipped; exit 2 pass DO NOT / INSTEAD DO into subagent; exit 1 HS-5). `dispatch-agent` `ws-implement-tasks` mode build; inject AC slices via `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs read --index "{us-dir}/plan.index.json" --ac AC{n}` (do not re-read superseded step-01). Verify `memory_consult` proof; branch-direct default | verification |
| 5 | `dispatch-agent` `ws-plan-verify` **quick-score default** vs refined spec ‖ spec; full matrix if score `< minVerifyScore` or `--strict`; **Regression Sabotage Check** when required (missing required → fail-closed below the Advance bar (`knownDefect` caps at 8)); **below-bar gate** (`scoreAndRefine` until ≥ `minVerifyScore`); then **Reach-10 offer** when conditions in [`gates.md`](../ws-shared/gates.md) hold; then **G2-code after Step 5 before Step 6** (skip if empty) | `step-05-{slug}.plan.report.md` |
| 6 | Fail-closed dirty preflight; `dispatch-agent` `ws-code-review` (`git diff {base}...HEAD`). When `defaults.reviewJury.size` is 2 or 3, dispatch that many independent reviews against the same commit, then for each juror run `node {skillsRoot}/ws-code-review/scripts/write_review_round.cjs … --jury-out {us-dir}/.runtime/step-06-{slug}.juror-{N}.json`, then `node {skillsRoot}/ws-spec-to-pr/scripts/merge_review_jury.cjs --review … --output {us-dir}/step-06-{slug}.jury.json --canonical-review-out {us-dir}/step-06-{slug}.review.md`. Union never drops Warning/Critical; identical findings collapse. Size 1 matches today. When `defaults.contextHygiene.backgroundVerboseSteps` is true, orch **may** use non-blocking `dispatch-agent` for Steps 6/7 if the host supports it; otherwise log `background-unsupported` and run blocking (no HS-5). Critical/Warning → **fix → re-review** via `ws-implement-tasks` (max 3; not a separate step); then G2-code of review fixes if dirty; soft model tip for stronger review LLM | `step-06-{slug}.review.md` (+ optional `.fix.report.md`) |
| 7 | Machine probe first: `node {skillsRoot}/ws-testing/scripts/probe_test_surface.cjs --json`. Auto-skip **only** when `skipTesting` (`finish --reason testing-disabled`) or probe `hasTestSurface` is false and unit aliases are green (`finish --reason no-test-surface`). Agent judgment cannot skip. Else `dispatch-agent` `ws-testing`. Inside Step 7, optional **mutation** substep runs only when `verification.mutationTest` is set and `defaults.skipMutationTesting` is false; skip (log) otherwise. When mutation skipped/unset, **regression sabotage** via `run_sabotage.py`. Mutation score &lt; `verification.mutationThreshold` (default 80) or runner non-zero → Step 7 **fail-closed** (no Advance to 8); hand off to `ws-implement-tasks` fix mode. FSM stays 0–9 (no new step). | `step-07-{slug}.testing.*` |
| 8 | **Close implementation** then **ship** ([`gates.md`](../ws-shared/gates.md)): delivery result → close gate (G2-delivery, MEMORY, changelog, `status: completed`, `shipStatus: pending`) → ship gate → `ws-ship-pr` (`workflowMode: true`, `stopBeforeFixPr: true`, push/PR only). **`comment-issue`** on PR create when tracker id present; **`check-pr-status`** for CI triage. | `step-08-{slug}.result.md` |
| 9 | `dispatch-agent` `ws-goal-fix-pr` (default) or `ws-fix-pr` (one-shot) after PR exists. CI fixes use **`check-pr-status`** only (baseline vs diff + one flake rerun). **`comment-issue`** on in-session merge when applicable. | PR threads / merge |

### Post-mutating transition (after step N completes)

**Order (mandatory):**

1. **`update_state.cjs`** — use `dispatch` before execution and `finish` after structured output; merge `files_touched`, record measured telemetry, and advance `currentStep`. Always pass `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl` (zero-padded `NN`; lazy-create `telemetry/`). `finish` writes `{us-dir}/handoff/step-{NN}.json` (≤8192 B) and `{workflow-id}.state.json` first, then renders `.state.md`. When `defaults.contextHygiene.pruneAfterStep` is true (default), the next step reads that handoff plus compact state, not full prior step markdown, unless ARTIFACTS.md names the file. When `--skip-gates` or `config.json.invariants.skipQualityGates` is active, run its `bypass` operation.
2. **G2-code (Steps 5 and 6 only)** — After Step 5 (score ≥ `defaults.minVerifyScore` (default 9)): **G2-code after Step 5 before Step 6** (skip if empty stage). After Step 6 review-fix: one G2-code if product files remain. Algorithm and messages: [`gates.md`](../ws-shared/gates.md) § Required G2-code save points. Uncommitted workflow product files → **STOP**; do not dispatch `ws-code-review`. `dryRun` simulates only. Other steps: skip this item.
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

When overall score is below `minVerifyScore`, run `scoreAndRefine` even if `defaults.scoreAndRefine` is false. When `scoreAndRefine` mode is active (or triggered at bootstrap on completed workflows) **or** score is below `minVerifyScore`:
- Evaluates each plan task in `step-01-{slug}.plan.md` on criteria fulfillment, code quality, edge-cases, and test coverage.
- Outputs `step-05-{slug}.score-analysis.md` containing task-by-task scores (0–10) and specific enhancement recommendations.
- **Optional (AC6):** When `step-05-{slug}.score-analysis.md` exists, re-invoke `ws-classify-complexity` with `--score-analysis` before the score gate — advisory only; does not block Advance.
- If overall score below `minVerifyScore`: do **not** offer Accept Pass 1 As-Is. Re-dispatch `ws-implement-tasks` for tasks scoring below `minVerifyScore`, then re-verify, until overall ≥ `minVerifyScore` (max 3 rounds; log `score-refine | round={n}/3`). After 3 rounds still below `minVerifyScore`: Pause. Resume continues the loop.
- If overall score already ≥ `minVerifyScore` and `scoreAndRefine` flag: prompt **Pass 1 Score Analysis Gate** via `user-gate` (Option 1: Proceed with Second Pass Refinement; Option 2: Accept Pass 1 As-Is & Ship; Option 3: Selective Refinement). Option 1 or 3 re-dispatches `ws-implement-tasks` (role `scoreAndRefine`) for the **wide-context second pass** in [`gates.md`](../ws-shared/gates.md) § Score & Refine (item 4): full Pass 1 diff, overengineering sweep, unused workflow-introduced artifact removal. Option 1 runs even when zero tasks are flagged.

| Score | Behavior |
|-------|----------|
| ≥ `minVerifyScore` | Complete step 5; **Reach-10 offer** when conditions in [`gates.md`](../ws-shared/gates.md) hold; **G2-code after Step 5 before Step 6** (skip if empty); then dispatch 6 |
| below `minVerifyScore` | **scoreAndRefine** until ≥ `minVerifyScore` (max 3 rounds, then Pause). Never Advance or auto-approve below `minVerifyScore`. Refine runs **before** the product commit. |

`autoMode`: auto-run scoreAndRefine rounds; do **not** auto-approve below `minVerifyScore` — Pause only after max rounds still below `minVerifyScore`.

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

### Step 8 — Close implementation, then ship

**Semantics:** `status: completed` marks **end of spec/plan implementation**, not PR merge. `shipStatus` tracks shipping (`pending` → `skipped` \| `pushed` \| `pr-open` \| `merged` \| `stopped`). Phase A git cleanup runs when shipping is **terminal**, not when `status` flips to `completed`.

**A. Close implementation (always before any remote ship):**

1. [`protocols/delivery-result.md`](protocols/delivery-result.md) (writes `step-08-{slug}.result.md` **with Timing Total wall-clock time**). Never load `ws-run-benchmark` or run `npm run benchmark` / `benchmark:static` / `scripts/harness-benchmark` here.
2. Render Step 8 final board Telemetry ([`progress-board.md`](protocols/progress-board.md)).
3. **Close implementation gate** ([`gates.md`](../ws-shared/gates.md) § Close implementation):
   - Commit configured delivery artifacts (G2-delivery) **or** skip that commit.
   - Pause remains available.
4. After successful close (even when delivery commit skipped): MEMORY sweep → `ws-changelog`.
5. Set `status: completed`, `endedAt`, `shipStatus: pending`. `finish --step 8` records step 8; overall workflow `status` is set here, **not** in Step 9.
6. [`ws-spec-index`](../ws-spec-index/SKILL.md) `sync` with `{slug}` and **implementation** evidence only — do not treat as merged/shipped.
7. Optional Phase B plan-dir temp delete per [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md) (close gate option).

When `scoreAndRefine` was executed, generate `step-08-{slug}.second-pass-report.md` comparing Pass 1 vs Pass 2 scores, LOC deltas, simplifications/deletions, quality gains, and test metrics. Include Pass 1 vs Pass 2 comparative summary table in `step-08-{slug}.result.md`.

Dispatch/finish timestamps still required under `autoMode`/`fullMode` (State Hygiene → HS-5 if missing). Authored `--elapsed` is rejected.

G2-delivery stages only artifacts enabled by `defaults.deliveryCommitArtifacts` — see [`ARTIFACTS.md`](ARTIFACTS.md) § Step 8.

**B. Ship (same run, optional; after close):**

**Ship gate** ([`gates.md`](../ws-shared/gates.md) § Ship after close):

1. **Create PR** (Recommended when `fullMode`)
2. **Push only**
3. **Skip PR** (no create)
4. **Skip shipping entirely**
5. **Pause**

Dispatch `ws-ship-pr` with `workflowMode: true`, `shipAction`, `stopBeforeFixPr: true` — **no delivery commit, no goal-fix loop inside ship**; orch advances to Step 9 when `shipAction: create-pr` and PR exists. Update `shipStatus` to `pushed` \| `pr-open` \| `skipped` \| `stopped` per outcome.

**Phase A git cleanup:** Run **once** when shipping is terminal — skip-ship after close (`shipStatus: skipped`), skip-PR with no Step 9, or after Step 9 stop/merge (`python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}`). **Do not** run Phase A at close when ship is still `pending`/`pr-open`/`pushed`. Exit 0 proceed; exit 2 surface leftovers (may claim ended); exit 1 do not claim ended.

### Step 9 — Fix-PR

After Step 8 when `shipAction: create-pr` and PR exists:

1. **Wait for code-review / CI feedback** (same policy as `ws-ship-pr` Step 6 settle: wait 30s post-PR creation for code-review action to start on GitHub infrastructure, then default 300s post-push heartbeats, then poll checks + threads). Do not merge yet.
2. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot) once under the outer numeric Step 9 model. Each internal batch then runs `fixPrPlan` before `fixPrExec`: emit ordered `dispatch --step 9 --substep fixPrPlan` and `dispatch --step 9 --substep fixPrExec` JSONL events with actual models when `dispatch-agent` is available. The plan role may write only its complete gate; execution validates/follows it and records amendments before deviations. Internal roles never call `finish --step 9`; JSONL is their history while compact `stepDispatches` keeps only the latest Step 9 dispatch.
3. Continue until **no open issues** (`activeThreads == 0`), then **merge** via SCM provider `merge-pr` only when required checks are green. The outer orchestrator calls `finish --step 9` exactly once after convergence or terminal stop. Never merge with open review threads or failing required checks.

When shipping reaches a **terminal** `shipStatus` after Step 9 convergence (or skip-ship/skip-PR after close), run **Phase A** git cleanup once before claiming the run fully ended — see [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md). Do **not** set `status: completed` again in Step 9 (`status` was set at close). Update `shipStatus` to `merged` or `stopped`. Do not run Phase A at both Step 8 close and Step 9.

Stop: max exhausted · escalate · merge blocked · cancelled · PR closed · checks red after convergence attempts.
