# Step dispatch (canonical)

**Sole source of truth** for **`ws-spec-to-pr` (standard)** step 0–9 dispatch actions, post-mutating merge notes, and Step 8/9 gate protocols. Load from `SKILL.md` only when advancing or dispatching a step. FSM, invariants, and gates overview stay in `SKILL.md`.

**Dual-mode (mandatory):** This file is **not** the lite step index. [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md) keeps its own Steps 0–5 table. Shared gate/ship UX and artifact names stay in [`gates.md`](../ws-shared/runtime/gates.md) / [`config-resolution.md`](../ws-shared/runtime/config-resolution.md). Pipeline `ws-*` folders (folder == frontmatter `name:`; FSM steps stay 0–9 / Post) stay orch-agnostic: never assume full vs lite step numbers; orch passes `workflowType`, paths, and flags.

**Host execution mode:** bind once at bootstrap per [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md) — no mid-workflow re-probe (cache hit path only); tiers in [`tools.md`](../ws-shared/runtime/tools.md) § Host-tool binding & dispatch tiers; gates and turn rules in [`gates.md`](../ws-shared/runtime/gates.md).

### autoMode ≠ skip planning



See `SKILL.md` § `autoMode != skip planning` — autoMode auto-selects index 0 and chains Steps 0→9 without skipping planning; honor classifier `runInterview` / `execMode` outputs.





Before the first Step 4 `dispatch-agent`, unless `--skip-gates` / `skipQualityGates` is active (omit and log `gate-bypass | pre-advance` per [`gates.md`](../ws-shared/runtime/gates.md) § Quality gate bypass), run fail-closed `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs {state} --pre-advance 4`. Bypass does **not** weaken autoMode ≠ skip planning. Exit ≠ 0 → **HS-5** STOP — name missing files (`step-01-*.plan.md`, `.runtime/plan.index.json`, refined plan when interview was required; sequential Step 3 writes no stubs); do not edit product paths; do not dispatch.

## Step instructions

> **Consistency:** the Skill map in `SKILL.md` (`ws-plan-verify` → Step 5, etc.) is authoritative. Keep this table aligned — never dispatch retired ids (`05-verify-sync-plan-us`, `implement-plan`, `plan-us`, …).

> **Subagent models:** session runs as `currentModel`; resolve every subagent id per [`tools.md`](../ws-shared/runtime/tools.md) § Subagent model preferences (unknown `modelsPreset` fails closed). Steps 5-6 → `reviewerModel`; Step 7 resolves `testingModel` (fallback `executionModel`, else session model).

> **Dispatch provenance:** with `defaults.specializedSubagents.enabled` address `{prefix}-step-{step}-{role}`; record `--agent-type` and `--subagent-id` in `state.stepDispatches`. Rejected model id → retry under `currentModel` and record both ids.

**Verbose preview:** format and trigger per [`gates.md`](../ws-shared/runtime/gates.md) § Verbose step preview (`defaults.verboseMode` explicit `true`); the executing model must analyze this run before previewing, then immediately continue with tool calls in the same response; never end the turn after the preview; addendum in [`PROTOCOLS.md`](PROTOCOLS.md) § Base Prompt Prefix.

> **Dispatch context (mandatory before each `dispatch-agent`):** build the prompt with `node {skillsRoot}/ws-spec-to-pr/scripts/build_dispatch_context.cjs --skill <SKILL.md> --step {N} --slug {slug} [--ac ACn ...] --output {us-dir}/.runtime/step-{N}-dispatch-prompt.md`. Prefix contract: enhancing-skill contracts and MEMORY slice are inlined; do not reload those skill bodies (already loaded per the canonical skill-load procedure). Still Read product files and the target `## Subagent contract` if not inlined.

| Step | Action | Artifact |
|------|--------|----------|
| 0 | Entry gate. Tracker id → provider fetch + `ws-spec-write` enhance to `{specsDir}/{slug}.spec.md`; free-text → sweep + `ws-spec-write`; existing spec → validate then register. Prior-work sweep: `search_plan_history.cjs --slug {slug} --keyword <terms>` (index first, top-3). Validate new spec `--mode=authoring` (non-zero → skip register, STOP); pre-closure spec `--mode=compat`. Then `ac_ledger.cjs init` (required before pre-advance 1). Call `finish --step 0` once. | `{specsDir}/{slug}.spec.md` then `step-00-{slug}.spec.md` + `ac-ledger.json` |
| 1 | `simple` → `write_simple_plan_stub.cjs` + `plan_index.cjs build` + `finish-batch "2:skipped,3:skipped"`; advance to 4. Else `dispatch-agent` `ws-plan-write` + `plan_index.cjs build` + `check_memory_conflict.cjs --json` (0 proceed; 2 set `force_interview`; 1 HS-5). | `step-01-{slug}.plan.md` + `plan.index.json` |
| 2 | Skip if eligible and no `force_interview` (`finish --status skipped`). Else `dispatch-agent` `ws-plan-interview` (writes interview + refined plan); rebuild `plan_index.cjs build` with `--draft step-01`. | interview + refined plan (or skip) |
| 3 | `defaults.enableDag: false` → `finish --status skipped` (`dag-disabled`, no stubs); do **not** `dispatch-agent` `ws-plan-to-tasks`. `true` → `dispatch-agent` `ws-plan-to-tasks`. `completed` requires both files. | exec plan + dag (only when enabled) |
| 4 | Pre-advance `validate_state.cjs --pre-advance 4` (≠0 → HS-5); then `check_memory_conflict.cjs --json` (0 proceed; 2 inject traps; 1 HS-5). `dispatch-agent` `ws-implement-tasks` mode build with `plan_index.cjs read --ac AC{n}` slices; confirm sibling sweep ran. `finish` requires `files_touched` or `--noop`. Write `verification-manifest.json`. | verification |
| 5 | `dispatch-agent` `ws-plan-verify` (quick-score; full matrix if `< minVerifyScore` or `--strict`). Below bar → `scoreAndRefine` rounds, re-verify, then Reach-10 offer; then G2-code after Step 5 (`commit_g2_code.cjs --step 5`). | `step-05 report` + `scoreAndRefine` |
| 6 | Dirty preflight; `dispatch-agent` `ws-code-review` (`git diff {base}...HEAD`). Jury size 2–3 → parallel reviews + `merge_review_jury.cjs`. Critical/Warning → fix → re-review (max 3); G2-code if dirty. | `step-06 review` (+ fix report) |
| 7 | Probe `probe_test_surface.cjs`; skip only on `skipTesting` or no surface + green aliases. Else `dispatch-agent` `ws-testing`. Mutation (Regression Sabotage via `run_sabotage.cjs`) only when configured; fail-closed below threshold. | `step-07 testing` |
| 8 | Close then ship per [`gates.md`](../ws-shared/runtime/gates.md) § Step 8: delivery result → gate → close (`status: completed`) → ship via `ws-ship-pr` (`workflowMode:true`). | `step-08 result` |
| 9 | `dispatch-agent` `ws-goal-fix-pr` (default) or `ws-fix-pr` after PR exists; converge to `activeThreads == 0`, then merge. | PR threads / merge |

### Execution observer dispatch (opt-in)

- Gate `observer.cjs should-dispatch`; refused → dispatch nothing. On allow: `note-dispatch` to reserve the slot, then one read-only watcher (no product/state/commit/PR writes).
- Each `dispatch` records `state.agentTranscripts` once (`--transcript-paths` or absent marker).

### Post-mutating transition (after step N completes)

**Order (mandatory):**

1. **`update_state.cjs`** — `dispatch` before, `finish` after; pass `--jsonl-out telemetry.jsonl`. `finish` records the handoff in `{workflow-id}.state.json` under `state.handoffs`, then renders `.state.md`.
2. **G2-code (Steps 5 and 6 only)** — per [`gates.md`](../ws-shared/runtime/gates.md) § Required G2-code save points. Uncommitted product files → STOP.
3. **Checkpoint** — tag `uswf/{workflow-id}/before-step-{N+1}` @ HEAD after G2-code (`dryRun` soft-pass: log only).
4. **Pre-advance validation** — **shell command** (not `dispatch-agent`):

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs \
  {plansDir}/{slug}/{workflow-id}.state.md \
  --pre-advance {N+1}
```

On exit ≠ 0 → **HS-5**; **STOP** — no Progress Board, no Transition Gate, no dispatch to step N+1.

**Skip:** with `--skip-gates` omit step 4; log `gate-bypass`.

5. Board → gate → dispatch N+1 (auto-gate in `autoMode`). Cadence: One Step Per Turn in normal mode — markdown fallback never starts Step N+1 in the same turn as the gate; native modal gate returning any recommended advance option proceeds in the same turn.

### Golden-path state commands (per gate)

Per [`gates.md`](../ws-shared/runtime/gates.md) § Golden-path state commands — never hand-edit `.state.*` or `ac-ledger.json`.

---
### Step 5 — Check-implementation (score gate)

Eval vs refined spec else `step-00`; publish integer 0–10. Off-tree alias failure → `link aliasResult skipReason:baseline-dirty`.

`parallelVerifyReview:true` → G2 after Step 4, concurrent read-only 5+6, merge via `merge_verify_review.cjs`; default `false` sequential.

Below `defaults.minVerifyScore` → `scoreAndRefine` (max 3): write `score-analysis.md`, re-dispatch below-bar tasks, re-verify; Pause after 3. At/above with flag, **normal mode only** → Pass 1 gate (Proceed / Accept As-Is / Selective); role `scoreAndRefine` runs the wide-context second pass per [`gates.md`](../ws-shared/runtime/gates.md) § Score & Refine — Option 1 runs even when zero tasks are flagged (`dispatch --substep scoreAndRefine`).

| Score | Behavior |
|-------|----------|
| ≥ `minVerifyScore` | Complete; Reach-10 offer (normal mode); G2-code; dispatch 6 |
| below | Refine until ≥ min (max 3, then Pause). Never Advance below. |

`autoMode`: auto-run below-bar rounds with no prompt. At or above `minVerifyScore`, skip Pass 1 and Reach-10; G2-code when the stage set is non-empty; `finish --step 5`; dispatch Step 6 in the same turn. Do not end the turn to ask the user to continue from Step 5. Never finish or dispatch 6 below min.

Finish: `update_state.cjs finish --step 5 --verification-score {score}`; after G2 link SHA via `ac_ledger.cjs link` before pre-advance 6. Await each subagent before its `finish`.

Contract: [`gates.md`](../ws-shared/runtime/gates.md) § Check-implementation gate, § Score & Refine.

### Step 6 — Code-review + fix → re-review loop (substep)

| Case | Behavior |
|------|----------|
| Clean | Complete; Advance to 7 |
| Critical/Warning | Fix → re-review (max 3); Advance only when clean |
| Residual | Pause; never Advance with open findings |

Fix logs `review-fix | round={n}/3` (no `completedSteps` entry). Never dispatch review with uncommitted product files. Contract: [`ws-code-review`](../ws-code-review/SKILL.md).

### Step 8 — Close implementation, then ship

**Semantics:** `status: completed` marks **end of spec/plan implementation**, not PR merge. `shipStatus` tracks shipping (`pending` → `skipped` \| `pushed` \| `pr-open` \| `merged` \| `stopped`). Phase A git cleanup runs when shipping is **terminal**, not when `status` flips to `completed`.

**User-gate (default — primary question + overflow, rule 8):** [`gates.md`](../ws-shared/runtime/gates.md) § Step 8 combined gate. Primary: **Commit configured delivery artifacts and Create PR** (Recommended when `fullMode`) / **Commit configured delivery artifacts and Push only** / **More options…**. Overflow (second gate when More): **Commit configured delivery artifacts and Skip shipping** / **Skip delivery commit and Create PR** / **Separate gates / Pause** (legacy close-then-ship two-prompt flow).

**Mechanical sequence:**

1. [`protocols/delivery-result.md`](protocols/delivery-result.md) (writes `step-08-{slug}.result.md` **with Timing Total wall-clock time**). Never load `ws-run-benchmark` or run `npm run benchmark` / `benchmark:static` / `scripts/harness-benchmark` here.
2. Render Step 8 final board Telemetry ([`progress-board.md`](protocols/progress-board.md)).
3. **Close phase** per choice: G2-delivery except when skipping the delivery commit; Pause only on Separate gates / Pause.
4. After successful close: MEMORY sweep → `ws-changelog`.
5. Set `status: completed`, `endedAt`, `shipStatus: pending`. `finish --step 8` records step 8; overall workflow `status` is set here, **not** in Step 9.
6. [`ws-spec-index`](../ws-spec-index/SKILL.md) `sync` with `{slug}` and **implementation** evidence only — do not treat as merged/shipped. Required leg of the pre-ship doc-sync trio.
7. [`ws-wiki`](../ws-wiki/SKILL.md) `sync` when the wiki dir (`plans.wikiDir`) exists — otherwise **warn-and-skip** with a visible `wiki-sync skipped: no wiki configured` warning; this conditional leg never blocks. When the effective gate flag is false this leg is offered, not mandatory.
8. **Pre-ship doc-sync gate** (`defaults.requirePreShipDocSync`, default true; absent, non-boolean, or invalid → effective true): when the effective flag is true, the three legs — items 6 and 7 plus the `ws-changelog` entry from item 4 — must all be recorded before the ship phase in item 10. Do **not** advance `shipStatus` to `pending`/`pushed`/`pr-open` while a required leg is outstanding. The wiki leg warn-skips (item 7) without blocking. Re-entering close after a leg succeeded is idempotent (do not duplicate the changelog entry or the `index.PRD` row). When the flag is false, keep today's behavior (`ws-spec-index` sync and changelog as today; `ws-wiki` sync offered, not mandatory).
9. Optional Phase B plan-dir temp delete per [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md).
10. **Ship phase** (Create PR / Push only / Skip-delivery-commit+Create PR): dispatch `ws-ship-pr` with `workflowMode: true`, `shipAction`, `stopBeforeFixPr: true` — **no delivery commit, no goal-fix loop inside ship**; orch advances to Step 9 when `shipAction: create-pr` and PR exists. Skip-shipping skips remote ship (`shipStatus: skipped`). Separate gates / Pause does not advance. Write back ship fields with the sanctioned writer (us-414 AC3): `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs finish {state} --step 8 --ship-status pushed|pr-open|skipped|stopped --pr-number <N> --pr-url <URL>` (omit `--pr-number`/`--pr-url` only when no PR exists, e.g. `skipped`). Stay children (`state.branch` equals `baseBranch`) ship via the `ws-ship-pr` shared-head rule (PR head into config base, or push-only when no distinct base exists); Step 9 convergence is unchanged.

When `scoreAndRefine` was executed, generate `step-08-{slug}.second-pass-report.md` comparing Pass 1 vs Pass 2 scores, LOC deltas, simplifications/deletions, quality gains, and test metrics. Include Pass 1 vs Pass 2 comparative summary table in `step-08-{slug}.result.md`.

Dispatch/finish timestamps still required under `autoMode`/`fullMode` (State Hygiene → HS-5 if missing). Authored `--elapsed` is rejected.

G2-delivery stages only artifacts enabled by `defaults.deliveryCommitArtifacts` — see [`ARTIFACTS.md`](ARTIFACTS.md) § Step 8.

**Phase A git cleanup:** Run **once** when shipping is terminal — skip-ship after close (`shipStatus: skipped`), skip-PR with no Step 9, or after Step 9 stop/merge (`node {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs --workflow-id {workflow-id}`). **Do not** run Phase A at close when ship is still `pending`/`pr-open`/`pushed`. Exit 0 proceed; exit 2 surface leftovers (may claim ended); exit 1 do not claim ended.

### Step 9 — Fix-PR

After Step 8 when `shipAction: create-pr` and PR exists:

1. **Wait for code-review / CI feedback** (adaptive per `ws-goal-fix-pr`: exit immediately when checks are green and `activeThreads == 0`; otherwise poll with backoff per configured convergence). Do not merge yet.
2. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot) once under the outer numeric Step 9 model. Internal roles never consult numeric Step 9; invoke a step with `preset=<name>` to override the preset per run. Each internal batch then runs `fixPrPlan` before `fixPrExec`: emit ordered `dispatch --step 9 --substep fixPrPlan` and `dispatch --step 9 --substep fixPrExec` JSONL events with actual models when `dispatch-agent` is available. The plan role may write only its complete gate; execution validates/follows it and records amendments before deviations. Internal roles never call `finish --step 9`; JSONL is their history while compact `stepDispatches` keeps only the latest Step 9 dispatch.
3. Continue until **no open issues** (`activeThreads == 0`), then **merge** via SCM provider `merge-pr` only when required checks are green. When merge succeeds and tracker `id` is present, dispatch **`comment-issue`** then **`close-issue`** by intent name (same order as `ws-ship-pr` Step 7). The outer orchestrator calls `finish --step 9` exactly once after convergence or terminal stop. Never merge with open review threads or failing required checks.

When shipping reaches a **terminal** `shipStatus` after Step 9 convergence (or skip-ship/skip-PR after close), run **Phase A** git cleanup once before claiming the run fully ended — see [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md). Do **not** set `status: completed` again in Step 9 (`status` was set at close). On merge, the single outer `finish --step 9` carries the ship writeback (us-414 AC3): `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs finish {state} --step 9 --ship-status merged --pr-number <N> --pr-url <URL>` (terminal stop without merge: `--ship-status stopped`). This finish also records the Step 9 handoff; a `completed` run never leaves ship fields empty after a merged PR. Do not run Phase A at both Step 8 close and Step 9.

**Post-completion proof-of-work (optional, orch-owned runbook):** after shipping reaches a terminal `shipStatus` (or skip-ship/skip-PR after close with no Step 9), execute in order:

1. Normal mode with `defaults.enableOptionalProofOfWork` explicit `true` and `defaults.enableAutomaticEvidenceCollectForProofOfWork` not explicit `true`: present the [`gates.md`](../ws-shared/runtime/gates.md) § Optional post-completion proof-of-work step gate (**Start evidence collection** / **Skip**) and keep the decision for step 2. Every other switch/`autoMode` combination skips this prompt.
2. Run `node {skillsRoot}/ws-shared/runtime/scripts/resolve_proof_of_work.cjs --config {sharedDir}/config.json --slug {slug} --project-root {projectRoot}` plus `--auto-mode` when in `autoMode`, `--collector-installed` when the consumer-installed `proof-of-work` skill resolves, `--browser-capable` when the host exposes browser capability, and `--gate-decision start|skip|cancel` from step 1 when a gate was presented (dismissal forwards `cancel`).
3. On `{"action":"start","folder"}`: invoke the `proof-of-work` collector with the resolved folder and log `proof-of-work | started:{folder}`.
4. On `{"action":"skip","reason"}`: log `proof-of-work | skipped:{reason}` and end (reasons: `disabled` · `gate-declined` · `auto-skip` · `collector-missing` · `no-browser-capability`).
5. On `{"action":"cancel"}`: apply HS-1 — STOP, re-present the gate, never infer; record no completed skip.

Omitted/`false` switch short-circuits at step 2 with `skip:disabled` — nothing else runs. Never inside `ws-ship-pr`; never re-ask close or ship; never commit the evidence folder; never mutate product files.

Stop: max exhausted · escalate · merge blocked · cancelled · PR closed · checks red after convergence attempts.

**Exit branches** (three; shared verbatim with `ws-goal-fix-pr` § Exit branches — a batch iteration never sends outer-step completion or goal-level exit, only per-batch dispatch telemetry):
1. **Converged** — `activeThreads == 0` with green required checks → pre-merge verification gate → merge handoff (the caller merges).
2. **Stopped** — `max` iterations reached, escalation, or user abort → final report with remaining threads; the caller decides.
3. **Clean-immediate** — fresh read already clean on entry → exit without arming a heartbeat.

Batch workers spawn with cwd = the workflow workspace (repo root owning the state file); dispatch events record configured-vs-actual model provenance. `agentType: generic:<Tool>` names the dispatch-agent tool binding, not a host session id: host subagent counts live in another domain, so `0 subagents` on the host alongside `generic:Task` telemetry is expected on inline/Tier-3 runs, not a mismatch (us-414 AC6). `--jsonl-out` is append-only: exit/finish/dispatch events are appended to the single `telemetry.jsonl` stream, never rewritten. `shipStatus` vocabulary (never blank; defaults `pending`): `pending` · `pushed` · `pr-open` · `merged` · `stopped` · `skipped` (terminal: `merged` / `stopped` / `skipped`).
