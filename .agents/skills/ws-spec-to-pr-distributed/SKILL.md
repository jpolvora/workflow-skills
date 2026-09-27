---
name: ws-spec-to-pr-distributed
description: Distributed Spec-to-PR — drives the shared standard 0–9 step set across multiple CLI processes on one machine via the deterministic step coordinator and state-file baton. Explicit opt-in only.
disable-model-invocation: true
invocation_names:
  - spec-to-pr-distributed
  - ws-spec-to-pr-distributed
---
# ws-spec-to-pr-distributed

> When this skill is loaded, output "ws-spec-to-pr-distributed loaded."

**Explicit opt-in only.** This workflow runs only on `/spec-to-pr-distributed` (or its skill id). The `ws-spec-to-pr` classifier, `ws-spec-multi`, and any auto-router never select it without an explicit consumer choice (AC10).

## What this skill is

A thin specialized execution layer over the **standard** `ws-spec-to-pr` FSM. It owns the distributed (multi-CLI) capability and nothing else:

- runner mapping + fail-closed validation (`defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton`);
- the deterministic coordinator run loop (`scripts/step_coordinator.cjs`, plain Node, no LLM);
- state-file baton claim/release/expiry and one-shot non-interactive worker spawn;
- coordinator gate surfacing;
- the baton-specific reference prose (see [`references/coordinator.md`](references/coordinator.md)).

It does **not** fork the FSM: the 0–9 step index, step bodies, artifact names, gate vocabulary, and model routing (`stepModels` / `modelPresets`) stay owned by `ws-spec-to-pr` and `{skillsRoot}/ws-shared/runtime`. Every step is delegated to the same shared pipeline skills (`ws-spec-write` … `ws-fix-pr`). The shared baton primitive `{skillsRoot}/ws-shared/runtime/scripts/step_baton.cjs` stays neutral and shared; this skill is its only workflow consumer.

## Behavior parity

- The workflow state file is the **only** turn signal (no side-channel or IPC bus).
- Unmapped steps execute through the existing single-host dispatch tiers (Tier 1/2/3 + `stepModels`); mapped steps execute through the coordinator.
- Concurrency and git ownership follow the shared contract ([`git-ownership.md`](../ws-shared/runtime/git-ownership.md) §5 matrix: this skill is `git-mutating`); stage only own paths, never undo foreign work, advance the baseline instead of resetting.
- Baton contract is unchanged from the standard feature: revision-checked claim with atomic dual-write, exactly-once release on `finish` in the same update that advances `currentStep`, re-claimable lease expiry with logged attempts, `blocked` after `maxAttempts` (default 2), one-shot non-interactive workers, and gate-shaped worker output recorded as a protocol violation without advancing.
- Step numbering, artifact names, telemetry event names (`baton_*` / `runner_*`), and `ws-monitor` holder/lease fields are identical to the shipped feature.

## Bootstrap

1. Read `config.json` → `pathTokens`, `plans.dir`, `project.*`.
2. **Validate run config before Step 0** (fail closed): `node {skillsRoot}/ws-shared/runtime/scripts/step_baton.cjs` validation via the coordinator, or the shared `validateRunConfig`. An unknown step key, unknown runner id, empty command, or non-positive timeout fails fast with a named error (`RUNNER_STEP_OUT_OF_RANGE`, `RUNNER_UNKNOWN_ID`, `RUNNER_EMPTY_COMMAND`, `RUNNER_INVALID_TIMEOUT`, `STEPBATON_*`) and starts no partial run.
3. Load the shared step dispatch from [`../ws-spec-to-pr/SKILL.md`](../ws-spec-to-pr/SKILL.md) and [`../ws-spec-to-pr/STEP-DISPATCH.md`](../ws-spec-to-pr/STEP-DISPATCH.md). Worker turn rules: [`../ws-spec-to-pr/WORKER-TURN-RULES.md`](../ws-spec-to-pr/WORKER-TURN-RULES.md).
4. Run the coordinator:

   ```bash
   node {skillsRoot}/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs \
     --state {plansDir}/{slug}/{workflow-id}.state.json
   ```

   Configure runners with `defaults.stepRunners` / `defaults.runners`; tune polling/attempts with `defaults.stepBaton`.

## Exit & handoff

Same terminal semantics as the standard orchestrator: Step 8 close sets `status: completed`; shipping (`ws-ship-pr`) and Step 9 fix-pr follow. The coordinator exits when the run reaches a terminal `shipStatus` or a hard stop; blocked/exhausted attempts surface as a named exit and leave the state file untouched beyond the failed attempt record.

## Files

| Path | Role |
|------|------|
| `SKILL.md` | This body |
| `scripts/step_coordinator.cjs` | Deterministic multi-CLI run loop (the only owner) |
| `references/coordinator.md` | Baton prose re-homed from `{skillsRoot}/ws-shared/runtime` (worker spawn vocabulary, liveness, gates) |

The baton primitive `step_baton.cjs` remains at `{skillsRoot}/ws-shared/runtime/scripts/step_baton.cjs`; the coordinator `require`s it through the shared-hub resolver (fail-closed if the resolved runtime is not the expected `ws-shared` tree).
