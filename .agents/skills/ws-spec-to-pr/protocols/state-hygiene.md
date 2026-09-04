# State Hygiene Protocol

After step N, before the progress board, the orchestrator MUST execute State Hygiene.

**Applies in `autoMode` / `fullMode` / `dryRun` the same as normal.** Skipping hygiene or a missing dispatch/finish boundary → **HS-5**.

## Automated update

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs dispatch \
  {plansDir}/{slug}/{workflow-id}.state.md \
  --step {N} \
  --model {modelName} \
  --substep {dag|scoreAndRefine|reviewFix|fixPrPlan|fixPrExec} \
  --jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl

node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs finish \
  {plansDir}/{slug}/{workflow-id}.state.md \
  --step {N} \
  --status {completed|failed|skipped} \
  --ship-status {pending|skipped|pushed|pr-open|merged|stopped} \
  --commit {sha} \
  --model {modelName} \
  --substep {dag|scoreAndRefine|reviewFix} \
  --prompt-tokens {promptTokens} \
  --completion-tokens {completionTokens} \
  --created "{comma_separated_created_files}" \
  --modified "{comma_separated_modified_files}" \
  --deleted "{comma_separated_deleted_files}" \
  --gate-decision '{"gate":"transition","choice":"{choice}","reason":"{reason}","round":{round}}' \
  --jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl
```

`--jsonl-out` is **mandatory** on every call (zero-padded `NN` = step number). Creates `{plansDir}/{slug}/telemetry/` lazily. When quality gates are bypassed, run the `bypass` operation with `--gate` and `--reason`.

On **close** (standard Step 8 / lite Step 4) `finish --status completed`, the helper sets workflow `status: completed`, `endedAt`, and `shipStatus: pending` unless `--ship-status` is passed. Later ship/fix-pr finishes update `--ship-status` only — they do **not** re-set `status`.

Step 9 internal Fix-PR roles are dispatch-only: append `fixPrPlan` then `fixPrExec` with their actual models to the same Step 9 JSONL. They bypass numeric Step 9 model fallback and never use the `finish` recipe. JSONL preserves both role dispatches; compact `stepDispatches` intentionally retains only the latest numeric Step 9 row. The outer orchestrator alone calls `finish --step 9` once after convergence or terminal stop. Preserve nested `telemetry.loc` while updating either role.

### Measured elapsed time

| Status | Rule |
|--------|------|
| `completed` / `failed` | The helper derives `elapsedSec` from persisted dispatch and finish timestamps; authored `--elapsed` is rejected. |
| `skipped` | Same derivation; use a closed `--reason` enum and machine evidence. |

Missing dispatch or finish telemetry sets `estimated: true`; report that honestly and never author a duration.

Script also:

- Writes `telemetry.steps[]` + recomputes `totalElapsedSec` / `totalTokens` (null `elapsedSec` treated as 0)
- Upserts `## Telemetry log` table row in the state body
- Appends `## Gate history` line

## Manual fallback

```yaml
- Refresh currentModel from executing session model (unknown if unavailable). If changed vs prior, log model-change | step {N} | {old} → {new} | ISO in ## Gate history. Ignore leftover modelChain.
- Pass the resolved phase model (or executing session model) into `--model {modelName}` when calling `update_state.cjs` (recorder only; not a user override flag)
- Append ## Step outputs ### Step N (include model: {modelName} in block)
- Append step-output.learning → ## Workflow memory (dedupe)
- Merge files_touched → ## Step file log ### Step N
- Append to ## Step model log: | Step N | {label} | {model} | dispatched {ISO} |
- Record telemetry: elapsedSec, promptTokens, completionTokens, estimated → ## Telemetry ### Step N
- Append to ## Telemetry log: | Step N | {label} | {model} | {elapsedSec}s | {tokens} |
- Recompute workflowManifest; update completedSteps, stepStatus, currentStep
- Assert created paths exist; currentStep = next gate
- Step 2: ## Refinement registry
```

## Pre-advance validation (before dispatch to step N+1)

After `update_state` and checkpoint tag `uswf/{workflow-id}/before-step-{N+1}`, run as a **shell command** (not `dispatch-agent`):

```bash
node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs \
  {plansDir}/{slug}/{workflow-id}.state.md \
  --pre-advance {N+1}
```

`--pre-advance` **requires** an integer 1–9. A bare flag is rejected.

Checks (per [`ARTIFACTS.md`](../ARTIFACTS.md) step-input table): checkpoint tag exists and is reachable; required input artifacts on disk; `completedSteps` monotonicity.

### Pre-advance artifact cheat sheet

`--pre-advance N` means "about to dispatch step N". Standard and lite required files:

| Next | Standard | Lite |
|------|----------|------|
| 1 | `step-00-{slug}.spec.md` + `ac-ledger.json` | same |
| 2 | `step-01-{slug}.plan.md` | same |
| 3 | `step-02-{slug}.plan.refined.md` (skip if `interview-not-required`) | — |
| 4 | `step-03-{slug}.plan.exec.md` + `plan.index.json` | `step-06-{slug}.review.md` + `plan.index.json` |
| 5 | — | `step-08-{slug}.result.md` |
| 6 | `step-05-{slug}.plan.report.md` + ledger score ≥ `defaults.minVerifyScore` (default 9) | — |
| 7 | `step-06-{slug}.review.md` | — |
| 8 | `step-07-{slug}.testing.report.md` (skip if `testing-disabled` / `no-test-surface`) | — |
| 9 | `step-08-{slug}.result.md` | — |

In-flight resume: backfill `plan.index.json` / `ac-ledger.json` before validate. See [`faq.md`](../docs/faq.md).

| Result | Action |
|--------|--------|
| exit 0 | Continue → Progress Board → Transition Gate → dispatch N+1 |
| exit ≠ 0 | **HS-5** — STOP; no board, no gate, no dispatch |

**Step 4 pre-dispatch (standard only):** Before the first Step 4 `dispatch-agent`, unless `--skip-gates` / `skipQualityGates` is active (see Bypass below), run `--pre-advance 4` even when jumping from an incomplete planning state — post-step `{N+1}` hygiene does not cover a direct implement attempt. Exit ≠ 0 → **HS-5** STOP; no product edits; no Step 4 dispatch.

**Bypass (this gate only):** When `--skip-gates` or `skipQualityGates` is active, skip this shell call. Record bypass with `update_state.cjs bypass --gate pre-advance --reason skip-gates`. Does not bypass build/test/security, HS-1–HS-4, or other quality gates.

Fail hygiene or pre-advance → **HS-5** (STOP before Progress Board).
