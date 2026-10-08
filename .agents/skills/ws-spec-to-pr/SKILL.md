---
name: ws-spec-to-pr
description: End-to-end Spec-to-PR (steps 0–9). Verify score ≥ `defaults.minVerifyScore` (default 9) before review. Trigger for full/standard delivery.
disable-model-invocation: true
invocation_names:
  - spec-to-pr
  - ws-spec-to-pr
---
# ws-spec-to-pr

> When this skill is loaded, output "ws-spec-to-pr loaded."

**Specs family:** standard Spec→PR. Free-text → `ws-spec-write` + register; tracker id → provider fetch + `ws-spec-write` + register; existing spec → register. Batch → [`ws-spec-multi`](../ws-spec-multi/SKILL.md). Fast path → [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md).


- **Dual-mode:** Shared pipeline skills stay interchangeable with [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md).

Before Step 0 load [`setup.md`](../ws-shared/runtime/setup.md) on demand; bind host tools once per [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md).

## Native Tool Contract

Aliases: [`tools.md`](../ws-shared/runtime/tools.md). Params: `.ws/config.json`. Entry check: [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check. Host binding once at bootstrap per [`host-dispatch.md`](../ws-shared/runtime/host-dispatch.md); tiers per [`tools.md`](../ws-shared/runtime/tools.md) § Host-tool binding & dispatch tiers (code edits via Tier 3 Inline Isolated Execution only, else `dispatch-agent`). Cadence and turn rules per [`gates.md`](../ws-shared/runtime/gates.md).

| Intent | Alias | Rule |
|--------|-------|------|
| Step work | `dispatch-agent` | Target `{prefix}-step-{step}-{role}` when specialized subagents enabled, else `generalPurpose`\|`shell`; `description: "STP step {N} — {Label}"`; Step 5 product-tree readonly (never host `readonly`); step 4 DAG ≤3 parallel only when `defaults.enableDag: true` |
| User gate | `user-gate` / `user-gate-auto` | **Every step boundary:** in normal mode use `user-gate` per [`gates.md`](../ws-shared/runtime/gates.md) (cached `askQuestionTool` when bound — MUST invoke it instead of text; markdown fallback MUST output only question/options with zero tool calls in that turn); ≥2 options; cancel → HS-1; **`autoMode`:** zero prompts of any kind at every boundary, auto-select recommended option (index 0) and proceed automatically. Cadence: One Step Per Turn in normal mode — markdown fallback never starts Step N+1 in the same turn as the gate; native modal gate returning any recommended advance option proceeds in the same turn |
| Verification / SCM | `Shell` | `config.json.verification`; cite real `gh`/`git` output |
| State | `read-state` / `write-state` | Hygiene before Progress Board |
| Browser (7) | `browser-mcp` | Normal, non-dry-run, non-skip, gated |

Subagents return parseable `step-output`. Gate contexts: transitions, entry/resume/config, G2-code, Step 8 ship, Step 9 fix-pr.

**Forbidden during this workflow:** do not load `ws-run-benchmark`, and do not run `npm run benchmark`, `npm run benchmark:static`, or `scripts/harness-benchmark`. Those compare versions of the upstream package at that root only. Step `elapsedSec` is reporting telemetry for the Timing section.

## Goals & Invariants

1. **Scope:** Steps 0–7 local (first **required** product commit is G2-code after Step 5, not Step 8); Step 8 close implementation then ship; Step 9 fix-pr. No push before Step 8 ship phase. `status: completed` = implementation done (close), not PR merge.
2. **Auth:** Gate required for G1+. Cancel → HS-1. Commit → G2 + menu (HS-2).
3. **Isolation:** Subagent per step. Checkpoint tag `uswf/{id}/before-step-{N}`. Branch-direct default; worktree when `plans.useWorktrees=true`.
4. **State / Memory:** Hygiene → asserts → board (fail → HS-5). `{workflow-id}.state.json` is machine SoT (`.state.md` is the render); `{memoryDir}/MEMORY.md` generalizable.
5. **Mode Flags:** `dryRun` (no writes); `autoMode` (auto-gate 0); `skipQualityGates` (bypass banner + telemetry); `fullMode` (commit then PR). Subagent models per [`tools.md`](../ws-shared/runtime/tools.md) § Subagent model preferences (`reviewerModel` is Steps 5–6; Step 7 uses `testingModel`). Switches `enableDag` / `verboseMode` / `providerCompat` / `contextHygiene` / `reviewJury.size` per config.

### autoMode ≠ skip planning

| Does | Never |
|------|-------|
| Auto-select recommended gate option (index 0) at every boundary | Skip Steps 1–3 for `standard`/`complex` |
| Proceed continuously across step boundaries (no One Step Per Turn halt) | Edit product code before `step-01-*.plan.md` and other advance-to-4 artifacts exist on disk |
| Apply scripted `complexityClass: simple` (stub Step 1, skip 2/3) in autoMode | Ignore classifier `runInterview` / `execMode` to waive planning |
| Chain host turns: orchestrator owns Steps 0→9 in one session (Step 8 close → `ws-ship-pr` → Step 9 `ws-goal-fix-pr` until terminal) | Voluntarily end the host turn between step boundaries in `autoMode` |
| Continue through **internal checkpoints** (DAG wave end, green verify/build, end of step artifacts) until completed, failed, or a listed blocker | Yield to narrate a green wave or mid-step status and wait for another user turn |
| Resume at `state.turnPause.nextAction` / `state.stepCheckpoints[N]` when the host forced a mid-step turn end | Treat an unchanged `revision` on an active step as a stall |
| | Treat an existing parent feature branch plus a child slug as a planning waiver |

`autoMode` removes gate halts **and** host-turn limits between steps **and** internal checkpoints: keep dispatching until `status: completed`, terminal `shipStatus`, and Step 9 convergence, or a blocker in [`gates.md`](../ws-shared/runtime/gates.md) § autoMode stop conditions (canonical stop list — do not duplicate). Step-boundary index-0 auto-selection remains in place; the checkpoint rule extends unattended execution *inside* steps. Progress under `autoMode` goes to `telemetry.jsonl`, state handoffs, or gate history — not a user-facing stop. A green wave is not a stop. **Host-forced turn end only:** when the host ends the turn mid-step despite `autoMode`, run `checkpoint` and `pause-turn` through `update_state.cjs` before yielding — recipes in [`PROTOCOLS.md`](PROTOCOLS.md) § Turn-boundary pause & mid-step checkpoints. Write the pause marker only on a real forced turn end, never speculatively. The step's terminating `finish` clears both markers; a pause is not a `dispatch`.

First Step 4 `dispatch-agent` (`ws-implement-tasks`) only after fail-closed `validate_state.cjs --pre-advance 4` exits 0, unless `--skip-gates` / `skipQualityGates` is active (omit the pre-advance and log `gate-bypass | pre-advance` per [`gates.md`](../ws-shared/runtime/gates.md) § Quality gate bypass). Bypass does **not** weaken autoMode ≠ skip planning. Guard failure → **HS-5** STOP — no product-file edits, no Step 4 dispatch.
6. **Artifacts:** Never commit `{plansDir}/` in Steps 0–7. Product G2-code after Step 5 and after Step 6 review-fix uses path-scoped `files_touched` only. Delivery commit Step 8: plan + `step-08-{slug}.result.md` only.
7. **Pause / Revert:** Pause keeps `status: active`. Resume via `state.turnPause` + `state.stepCheckpoints[step]`; `finish` clears both. Revert via manifest + tag (no hard reset). **Resume pre-check:** resolve `{integrationBranch}` (`workingBranch` else `baseBranch`); do **not** compare only to `origin/{baseBranch}` when `workingBranch` is set; run `git fetch {gitRemote} {integrationBranch}` when remote exists (fetch-failed → skip-check); count via `rev-list --count origin/{integrationBranch}..HEAD`. `0` → `completed` only with product commits and `HEAD` ≠ `baselineCommit`. Stay-on-integration → skip count, log `resume-gate | skip-check`. Unavailable origin → skip-check (see [`setup.md`](../ws-shared/runtime/setup.md) §4c).
8. **Reproducible-artifact invariant (AC6):** every step artifact a later step reads must be reconstructable from state + committed diff, enforced by the pre-advance `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs <state> --pre-advance <N>` check: if a required artifact or its metadata for advancing to step N is missing, validation exits non-zero and advance is blocked (fail closed).

## Execution observer (opt-in)

Semantics per [`observer-instructions.md`](../ws-shared/runtime/observer-instructions.md). Default off dispatches zero watchers. When `monitor.autoStartObserver:true`, gate `observer.cjs should-dispatch`, reserve via `note-dispatch`, then dispatch at most one read-only watcher. Protocol: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Execution observer dispatch.

## Phases F0–F6 & Step Index

| Phase | Steps | Executor | `completedSteps` |
|-------|-------|----------|------------------|
| F0 Bootstrap | 0 | Orch + spec subagent | 0 |
| F1 Planning | 1–3 | Planner | 1–3 |
| F2 Implementation | 4 | Coder (sequential default; DAG ≤3 parallel when `enableDag: true`) | 4 |
| F3 Verification | 5 | Verifier (product-tree readonly; Shell required) | 5 |
| F4 Review + Fix | 6 (+ fix) + 6b | Reviewer + Coder | 6 |
| F5 Testing | 7 | Verifier + optional browser | 7 |
| F6 Ship + Fix-PR | 8–9 | Orch + shell (+ fix-pr) | 8 (ship) / 9 (fix-pr complete) |

Worktree & complexity rules: [`PROTOCOLS.md`](PROTOCOLS.md). Setup: [`setup.md`](../ws-shared/runtime/setup.md). Dispatch bodies: [`STEP-DISPATCH.md`](STEP-DISPATCH.md). Filenames: [`ARTIFACTS.md`](ARTIFACTS.md). Git ownership (parallel writers): [`git-ownership.md`](../ws-shared/runtime/git-ownership.md). Optional human companion via [`ws-spec-translate-to-human`](../ws-spec-translate-to-human/SKILL.md) (non-blocking; never gates advancement).

## Step 0 — Pipeline Classifier

After `step-00-{slug}.spec.md` exists and before Step 1:
1. Invoke [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) → writes `step-00-{slug}.classify.md`.
2. **User Gate** (unless `autoMode` or `skipQualityGates`): Accept recommendation (Recommended) · Override to standard · Override to lite.
3. Apply `finalPipeline` from [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) (mid-flight stay-standard rule lives there).

## Quality Gate Bypass (`skipQualityGates`)

See [`gates.md`](../ws-shared/runtime/gates.md) § Quality gate bypass. Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`.

## Step-level baton runs (multi-CLI)

Distributed multi-CLI execution is owned by the opt-in [`ws-spec-to-pr-distributed`](../ws-spec-to-pr-distributed/SKILL.md) workflow; this orchestrator stays single-host and ignores its baton run config.

## Invocation

```
/ws-spec-to-pr [flags] [preset=<name>] [US {issue_id} | {name}.spec.md | "description"]
```

## Exit & Handoff

Complete when Step 8 **close** sets `status: completed` (implementation done). Shipping (push/PR) and Step 9 fix-pr may continue in the same run; `shipStatus` tracks shipping separately. After the run reaches its finished state, the optional post-completion proof-of-work step applies per [`gates.md`](../ws-shared/runtime/gates.md) § Optional post-completion proof-of-work step (explicit `defaults.enableOptionalProofOfWork: true` only; omitted/`false` changes nothing).

**Optional post-convergence retro (opt-in):** after the ship phase ends and before the optional proof-of-work step, `node {skillsRoot}/ws-retro/scripts/retro_hook.cjs should-run --config {sharedDir}/config.json --json` (`retro.enabled` explicit true only; otherwise log `retro | skipped:{reason}`). Advisory only: `ws-retro` proposals never block close, ship, or fix-PR. Runbook: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Optional post-convergence retro.
