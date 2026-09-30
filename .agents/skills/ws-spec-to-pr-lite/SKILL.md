---
name: ws-spec-to-pr-lite
description: Fast Spec-to-PR (steps 0–5). Plan, implement, commit, review, ship. Trigger for lite/fast delivery.
disable-model-invocation: true
invocation_names:
  - spec-to-pr-lite
  - ws-spec-to-pr-lite
---
# Spec-to-PR Lite — Orchestrator

> When this skill is loaded, output "ws-spec-to-pr-lite loaded."

Sequential spec→ship orchestrator executing inline steps (0–5). Do **not** use `STEP-DISPATCH.md` for lite step numbers.

**Specs family:** Lite Spec→PR; entry per standard (`{specsDir}` draft → validate → register, skip register on fail; tracker → `ws-spec-write`; `--mode=compat` pre-closure). Prefer when `ws-classify-complexity` recommends lite. Batch → [`ws-spec-multi`](../ws-spec-multi/SKILL.md). Router: [`../ws-shared/runtime/autoload.md`](../ws-shared/runtime/autoload.md).

Before Step 0, on-demand load [`setup.md`](../ws-shared/runtime/setup.md) for bootstrap.

## Native Tool Contract

Host mode: resolve the host-tool binding once at bootstrap per [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md). At **every step boundary** in normal mode: use `user-gate` with ≥2 options per [`gates.md`](../ws-shared/runtime/gates.md); cancel → HS-1. **`autoMode`:** zero user-gate prompts at every boundary; auto-select index 0 (step-boundary auto-selection stays). Interactive cadence: in normal mode, enforce One Step Per Turn per [`gates.md`](../ws-shared/runtime/gates.md) — markdown fallback never starts Step N+1 in the same turn as the gate; native modal gate returning any recommended advance option proceeds in the same turn; in `autoMode`, continue through close/`ws-ship-pr`/fix-pr **and internal checkpoints** (wave end, green verify/build, end of artifacts) until completed/failed or a blocker in [`gates.md`](../ws-shared/runtime/gates.md) § autoMode stop conditions (do not copy). Progress → telemetry / state handoffs / gate history. A green wave is not a stop.

## Invariants & Mode Rules

1. **Isolation:** `workflowType: lite` — never cross-resume with `standard`.
2. **Execution:** Inline in main session (no subagent dispatch).
3. **State & Telemetry:** `node {skillsRoot}/ws-spec-to-pr-lite/scripts/update_state.cjs` dispatch before each inline step, `finish` after (`--jsonl-out {plansDir}/{slug}/telemetry.jsonl`); authored `--elapsed` is rejected, missing telemetry → **HS-5**.
4. **Artifacts:** `step-00` spec · `step-01` plan · `step-08` result.
5. **Commits & Cleanup:** G2-code after Step 2 before Step 3 (and after Step 3 review-fix if product files remain) per [`gates.md`](../ws-shared/runtime/gates.md) § Required G2-code save points; delivery artifacts at Step 4 close ([`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md) § Step 8). **Close** → `status: completed`, `endedAt`, `shipStatus: pending` before push/PR. Mid-run base advance: `node {skillsRoot}/ws-spec-to-pr/scripts/refresh_baseline.cjs --state {us-dir}/{workflow-id}.state.json --base-ref origin/{baseBranch}`, then `git fetch` + `git rebase {newTip}` (merge-forward where rebase is disallowed) — [`git-ownership.md`](../ws-shared/runtime/git-ownership.md). Terminal ship cleanup: [`artifact-cleanup.md`](../ws-spec-to-pr/protocols/artifact-cleanup.md) (`cleanup_workflow_git.cjs`).
6. **Auto Mode Models:** Inline only — no `dispatch-agent` (Invariant 2); the session stays under `{currentModel}`. Resolve `defaults.modelsPreset` (`preset=<name>` override) / `modelPresets` / `stepModels` `"0"`–`"5"` and phase buckets (3 / `reviewerModel` (Step 3)) per [`tools.md`](../ws-shared/runtime/tools.md) § Subagent model preferences — telemetry/banner only. Do **not** read or apply `defaults.testingModel` or role keys (`reviewFix`, `fixPrPlan`/`fixPrExec`). Fix-PR writes the gate-only plan before any product edit, then executes inline; numeric Step `5` remains the only outer telemetry row.
7. **Fable & Score/Refine:** Optional `fable.enabled` (domain@1, judge@3, verify@4). Optional `scoreAndRefine` (task score 0–10 in `step-05`, 2nd pass report in `step-08`; wide-context simplify per [`gates.md`](../ws-shared/runtime/gates.md) § Score & Refine).
8. **Config Entry Check:** Without a configured `$PWD/.ws/config.json`, `user-gate` toward [`ws-configure-project`](../ws-configure-project/SKILL.md).
9. **MEMORY Consult:** In Steps 1, 2, and 3: route through [`tools.md`](../ws-shared/runtime/tools.md) **`read-memory`** for 3–8 plan/spec keywords before coding; record `memory_consult` in step outputs.
10. **Verbose preview:** When `defaults.verboseMode` is explicit `true`, the session model must **analyze this run** and print `Starting step {N} ({Label}):` plus 4–8 `*` bullets before any tool call — then immediately continue with tool calls in the same response; never end the turn after the preview. Format per [`gates.md`](../ws-shared/runtime/gates.md) § Verbose step preview. Omitted/`false` → silent.
11. **Harness benchmark forbidden:** do not load `ws-run-benchmark`, and do not run `npm run benchmark`, `npm run benchmark:static`, or `scripts/harness-benchmark`.
12. **Prompt audit:** at each executed inline boundary, build the prompt (`build_dispatch_context.cjs` + `--manifest`), persist it (`write_dispatch_prompt_audit.cjs --dispatch-mode inline`), pass the result to `finish --prompt-path`/`--prompt-sha256`; skipped steps write `--skip-marker`. Pairs per [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md); never staged.

## Steps 0–5 Index

| Step | Label | Skill / Action | Verifiable Exit Criteria (Done When) |
|------|-------|----------------|--------------------------------------|
| 0 | Spec | providers / `ws-spec-write` (+ authoring validate; skip register on fail); **prior-work sweep** before plan/code; after register `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs init --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/ac-ledger.json" --slug {slug} --workflow-id {workflow-id}` | `{specsDir}/{slug}.spec.md` exists **and** authoring validation PASS **and** `step-00-{slug}.spec.md` registered + `ac-ledger.json` |
| 1 | Planning | `ws-plan-write`; then `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs build --plan "{us-dir}/step-01-{slug}.plan.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/.runtime/plan.index.json"` | `step-01-{slug}.plan.md` + `.runtime/plan.index.json` created & validated |
| 2 | Implementation | `ws-implement-tasks` (link spec Negative & Failing Test Scenarios into `ac-ledger.json`) | Code modified + build/tests pass (`config.json.verification`) + negative-scenario tests linked |
| 3 | Review | `ws-code-review` (+ fix) | Committed `{base}...HEAD`; `step-06-{slug}.review.md` clean (0 Critical/Warning remaining; max 3 loops) |
| 4 | Ship | orch: **close** (`status: completed`, `shipStatus: pending`, post-close doc-sync trio `ws-spec-index` + changelog + `ws-wiki sync`; gate-enforced before the ship gate when `defaults.requirePreShipDocSync`) then **ship** gate → `ws-ship-pr` (shared-head rule); after the finished state the optional post-completion proof-of-work step applies per [`gates.md`](../ws-shared/runtime/gates.md) § Optional post-completion proof-of-work step | `step-08-{slug}.result.md` + PR created/skipped per ship gate |
| 5 | Fix-PR | `ws-goal-fix-pr` / `ws-fix-pr`: for each batch, write and validate the gate-only plan before any product edit, then execute inline | Complete plan + execute/proactive evidence; PR merged or zero active threads (`activeThreads == 0`); then run the post-completion proof-of-work runbook (helper → gate → collector invoke → telemetry) per [`gates.md`](../ws-shared/runtime/gates.md) § Optional post-completion proof-of-work step |

**No Step 5/7 verify or testing:** lite does not dispatch `ws-plan-verify` or `ws-testing`. **Regression sabotage** and **mutation testing** are **standard-orch Steps 5 and 7 only** — out of scope for lite.

**Human companion (refinement, non-blocking):** Step 1 may add `{us-dir}/step-00-{slug}.spec-translated.md` via [`ws-spec-translate-to-human`](../ws-spec-translate-to-human/SKILL.md) when enabled; failures never block advance.

## Post-Mutating Transition Sequence (Steps 0–4 → 1–5)

1. **State Hygiene:** `update_state.cjs` dispatch/finish (`--gate-decision`, `--jsonl-out`; `bypass` per [`gates.md`](../ws-shared/runtime/gates.md) § Quality gate bypass). `finish` records the handoff in `{workflow-id}.state.json` under `state.handoffs`.
2. **G2-code after Step 2 before Step 3** (required; skip if empty; also after Step 3 review-fix if product files remain) per [`gates.md`](../ws-shared/runtime/gates.md) § Required G2-code save points — uncommitted product files block Step 3 `ws-code-review`.
3. **Checkpoint** `git tag uswf/{workflow-id}/before-step-{N+1}` @ HEAD after G2-code; **pre-advance CI** `node {skillsRoot}/ws-spec-to-pr-lite/scripts/validate_state.cjs {plansDir}/{slug}/{workflow-id}.state.md --pre-advance {N+1}` (exit > 0 → **HS-5**). Host-forced turn end records pause-turn checkpoints per [`gates.md`](../ws-shared/runtime/gates.md) turn-boundary pause.
4. **State commands** per [`gates.md`](../ws-shared/runtime/gates.md) § Golden-path state commands — never hand-edit `.state.*` or `ac-ledger.json` (lite: `link` + `--commit sha=<sha>,step=2`, G2-code, `score --boundary step5` before review; `score --boundary step5` at close).

## Step 0 — Pipeline Classifier

After the spec exists and before Step 1, run [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) → writes `step-00-{slug}.classify.md` (**User Gate** unless `autoMode`: Accept recommendation · Override to standard · Override to lite).

## Lite safety valve

If plan §3 lists **> 5** atomic steps, present `user-gate` (recommended first): **Continue lite** / **Switch to `ws-spec-to-pr` standard**. `autoMode`: continue lite.

## Quality Gate Bypass (`skipQualityGates`)

See [`gates.md`](../ws-shared/runtime/gates.md) § Quality gate bypass. Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`.

## Triggers

```
/ws-spec-to-pr-lite [flags] [preset=<name>] [US {issue_id} | {name}.spec.md | "description"]
```
