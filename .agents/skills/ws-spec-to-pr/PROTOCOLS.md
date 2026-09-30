# Spec-to-PR — Protocols & State

Load on demand from [`SKILL.md`](SKILL.md) when advancing steps, applying gates, writing state, or handling errors.

Sibling protocol files under [`protocols/`](protocols/) remain authoritative for board/hygiene/cleanup/delivery detail when linked below.

## Protocols

### Authorization Ladder

| Level | Ops | Gate |
|-------|-----|------|
| G0 | Read, RO reports | — |
| G1 | Edit WT, plans, impl (no commit) | Transition gate |
| G2-code | `git commit` workflow product `files_touched` only (path-scoped; never `{plansDir}`) | Required: **G2-code after Step 5 before Step 6**; after Step 6 review-fix if dirty. Optional: Step 4 / Step 7 fix |
| G2-delivery | `git commit` **configured delivery artifacts only** (see [`ARTIFACTS.md`](ARTIFACTS.md) § Step 8 / `defaults.deliveryCommitArtifacts`) | Step 8 combined gate (close phase) |
| G3 | `git push`, PR create/merge | Step 8 **ship action** (within combined gate) |

```text
HS-1: user-gate cancelled → STOP; re-present gate. Never infer "yes".
HS-2: Commit without explicit gate menu selection → STOP.
HS-2a: `git add` or commit any `{plansDir}/` path during Steps 0–7 → STOP (workflow artifacts forbidden until Step 8 delivery commit).
HS-3: Mutating step success + empty files_touched → FAILED.
HS-4: Step 4/6-fix/7 success without expected files on state.branch → FAILED.
HS-5: State Hygiene or pre-advance validation failed → STOP before Progress Board; no dispatch.
```
Auto: HS-3/4/5 apply; HS-1/2 N/A.

### Transition Discipline

**Normal:** dispatch → finish → G2-code (Step 5 + Step 6 fix) → checkpoint → pre-advance → Board → gate. Recipes: [`protocols/state-hygiene.md`](protocols/state-hygiene.md); G2-code per [`gates.md`](../ws-shared/runtime/gates.md).

**Auto:** auto-gate + dispatch N+1 same turn (`autoMode` commits G2-code when the stage set is non-empty).

**Forbidden:** mutating step or commit without gate. `--pre-advance` without a step number is invalid (scripts fail closed).

### Universal step controls (every boundary)

At every gate (normal; under More when not primary):

| Control | Action |
|---------|--------|
| **Next** | Advance to N+1 (Recommended) |
| **Previous** | Go back to a completed step |
| **Replay** | Re-dispatch from checkpoint |
| **Refine** | Replay + log `refine-replay` |
| **Commit** | Explicit G2-code (required Step 5 + Step 6 fix) |
| **Undo** | Revert to checkpoint |

`autoMode`: Next only.

### Refinement FSM (Step 2)

2a/2b/2d → `ws-plan-interview`. Orch: 2c Escalate, 2e Shared Understanding, redispatch.

| State | Owner | Output |
|-------|-------|--------|
| 2a Audit | refine | `gap_registry[]` |
| 2b Resolve | refine | Sweep then close; `autoMode` → model-inferred |
| 2c Escalate | orch | One question; max 3 rounds |
| 2d Exit | refine | §8 empty or `assumed-default` |
| 2e Shared Understanding | orch | Only if 2c did not End-refine |

End-refine → `assumed-default`, `confirmed`, skip 2e. Skip rule per [`gates.md`](../ws-shared/runtime/gates.md) § Conditional interview.

### Complexity / Dynamic Execution

Before Step 1, classify per [`gates.md`](../ws-shared/runtime/gates.md) § Complexity gate. User may override when ambiguous: **Simple path** / **Standard path** (rec) / **Full grill**.

**Simple path:** stub `step-01-{slug}.plan.md`, `execMode: sequential`, skip Steps 1–2–3, jump to Step 4.

### Worktree policy

```text
dryRun → no worktree
default → branch-direct (preferred on win32 and most consumers)
worktree when config.plans.useWorktrees=true AND path≤180 AND git worktree add succeeds
```

Worktree when `useWorktrees=true` (preferred steps 4, 6-fix, 7); else branch-direct on `state.branch`.

### State Hygiene

→ [`protocols/state-hygiene.md`](protocols/state-hygiene.md)

Each step: `dispatch` before, `finish` after; pass `--jsonl-out telemetry.jsonl`. Pre-advance ≠0 → HS-5. Detail: [`protocols/state-hygiene.md`](protocols/state-hygiene.md).

### Model readiness

No in-gate model picker. At every transition, show the gates.md banner (`Orchestrator session model` + `Subagent phase model` + Pause → IDE/agent host → Resume).

Session runs as `currentModel`; resolve every subagent id per [`tools.md`](../ws-shared/runtime/tools.md) § Subagent model preferences. Model preferences apply EXCLUSIVELY to subagents spawned via `dispatch-agent`. Override per run with `preset=<name>` (persisted in state, resume-safe). Fall back to `currentModel` on switch failure.

When Advance crosses **F1→F2** (after Step 3, before Step 4) or **F3→F4** (after Step 5, before Step 6), add the soft hint from [`gates.md`](../ws-shared/runtime/gates.md) (Coder / Reviewer class). Log `model-hint | F1→F2|F3→F4 | current={currentModel} | ISO`. Tags `before-step-4`, `before-step-6` remain for telemetry only.

### Step Dispatch & Isolation

Orch calls **`dispatch-agent`** — never inline step impl (Step 3 only if `defaults.enableDag`).

```yaml
dispatch-agent:
  subagent_type: generalPurpose | shell
  description: "STP step {N} — {Label}"
  run_in_background: false
```

Anchor `uswf/{workflow-id}/before-step-{N} @ {sha}`; 1 worktree max; audit `stepDispatches[]`.
Cap per step: `stepContextBudgets[N]` else `contextBudget` (floor 18000); manifest records `budgetBytes`+`budgetSource`.

**Step 4:** sequential → one `ws-implement-tasks` build with AC slices; parallel → DAG ≤3, disjoint files.

### Check-implementation score gate (Step 5)

Step 5 actions: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Step 5; gates: [`gates.md`](../ws-shared/runtime/gates.md) § Check-implementation gate.

### Code review + fix → re-review loop (Step 6)

Step 6 actions: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Step 6 (fix → re-review, max 3); G2-code per [`gates.md`](../ws-shared/runtime/gates.md) § Required G2-code save points.

### Learning & Memory Protocol

Use the injected MEMORY slice + compact outputs (max two full). Record directives as "When X: DO NOT Y; INSTEAD DO W". Step 8: promote patterns to `{memoryDir}/memory/*.md` + `--compile` (`dryRun`: log only).

### Specification Protocol

Canonical planning spec: `{us-dir}/step-00-{slug}.spec.md` (never live tracker APIs after Step 0). Remote trackers → `ws-spec-write` enhance to `{specsDir}` then register `step-00`.

| Input | Action | Uses Step 0? |
|-------|--------|--------------|
| Tracker id | `fetch-to-spec` → enhance → register | No |
| `*.spec.md` | Register `step-00` | No |
| free-text | `ws-spec-write` → register | Yes |

Auth failure → STOP. Detail in each provider `SKILL.md`.

### Step 0 Entry Gate

Tracker id or local spec → `fetch-to-spec` + register → skip to Step 1. Free-text → `ws-spec-write` + register. Store `specPath` in `## Artifacts`.


### Build & Test Validation (4, 6-fix, 7)

Before G2-code: build (+ tests unless `skipTests`) → fix loop. Stage `files_touched` only; never `{plansDir}/` or `git add -A`.

### Testing (Step 7)

`ws-testing` via `dispatch-agent`. `skipTesting` → skip to Step 8. Mutation only when configured; fail-closed below threshold. Gates and failure options per `ws-testing` (max 3; fix via G2-code).

### Workflow Artifact Commit Protocol

| When | Allowed |
|------|---------|
| Steps 0–7 | **Product files** from workflow `files_touched` via G2-code: required after Step 5 and after Step 6 review-fix if dirty; optional at Step 4 / Step 7 fix |
| Steps 0–7 | **Forbidden:** `{plansDir}/**`, exec/dag/report/state/issue files, `git add -A`, `git add .`, empty commits |
| Step 8 | Configured delivery artifacts (`defaults.deliveryCommitArtifacts`) — delivery commit via G2-delivery gate |
| Pause | No commit; no delete |

Orch `git add` must be path-scoped — never `git add .` / `git add -A` on code-commit steps. Messages: `feat({slug}): verified implementation` then `fix({slug}): code-review fixes`. Record `{sha, step, message}` in `commits[]`.

### Ship — close implementation, then push/PR (Step 8)

Step 8 actions: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Step 8 (close then ship via `ws-ship-pr`); gates: [`gates.md`](../ws-shared/runtime/gates.md) § Step 8 combined gate.

### Fix-PR (Step 9)

Step 9 actions: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Step 9 (converge to `activeThreads == 0` then merge); gates: [`gates.md`](../ws-shared/runtime/gates.md) § Fix-PR gate.

### Progress Board & banners

→ [`protocols/progress-board.md`](protocols/progress-board.md)

### Automatic Mode

Parse: `auto` + combinable `dry-run`, `skip-testing`, `skip-tests`, US/spec entry.

Resume: same-US `autoMode` → continue `currentStep` (or `turnPause.nextAction`); else new id. Chain Steps 0→9 in one session until terminal ship + fix-pr convergence. Host-forced ends use § Turn-boundary pause & mid-step checkpoints.

| Context | Auto choice (index 0) |
|---------|----------------------|
| Step 0 entry | I have US/issue number |
| Complexity ambiguous | Standard path |
| Transition 0–6, 9 | Advance to N+1 |
| Transition / phase model | Advance with resolved phase model |
| Step 2 needs_user | First option; early End refinement |
| Step 2e | Confirm shared understanding |
| Step 5 below min | scoreAndRefine (max 3); Pause on residual |
| Post-verify G2-code | Commit when non-empty; skip when empty |
| Post-review-fix G2-code | Commit when non-empty; skip when empty |
| Step 7 skip / no surface | Skip step |
| Step 7 plan | Approve without browser |
| Step 7 mutation skip | Log skipped; continue |
| Step 7 mutation fail | Apply fixes and revalidate |
| Step 7 failure | Apply fixes and revalidate |
| Step 8 (`fullMode`) | Commit then create PR |
| Step 8 (not `fullMode`) | Skip shipping |
| Step 9 fix-pr | Run ws-goal-fix-pr loop |

Shared defaults: [`gates.md`](../ws-shared/runtime/gates.md) § Auto-gate defaults. Log `auto-gate | step {N} | {choice} | ISO`. Disabled: backward/repeat/pause menus; Step 3 without shared understanding.

### Checkpoints

Tag `uswf/{workflow-id}/before-step-{N}` = HEAD before step N first mutation. `before-step-1` = `baselineCommit`. Mirror in `checkpoints[]`. **Delete on shipping terminal:** Phase A via [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md) when `shipStatus` is terminal (mandatory git runtime cleanup — not gated on delete-temps). Dry-run: log only (`--dry-run`).

### Turn-boundary pause & mid-step checkpoints

Distinct from the git-tag § Checkpoints above (the `checkpoints[]` mirror array and `uswf/*` tags): these are **state records** written through `update_state.cjs` when a host turn cannot finish the step. In **`autoMode`**, the orchestrator does not voluntarily end turns between steps; use this section only when the **host** forces a turn end mid-step (context limit, external interrupt) or in **normal** mode per One Step Per Turn. `status` stays `active`; whole-step gates remain authoritative.

- **Mid-step checkpoint** (`checkpoint`) — replaceable sub-progress record per step:
  `state.stepCheckpoints["N"] = { step, substep, completedUnits: [unit ids], remainingUnits: int >= 0, updatedAt }`.
  CLI: `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs checkpoint {state} --step N --progress '<json>'` or `--progress-file <path>` (mutually exclusive; file form keeps shell recipes portable — payload `{ "substep": "...", "completedUnits": ["..."], "remainingUnits": N }`). Malformed JSON, wrong types, negative counts, or an out-of-range `--step` exit non-zero with the state unchanged.
- **Turn-boundary pause** (`pause-turn`) — explicit park marker:
  `state.turnPause = { step, reason, at: ISO, nextAction }`.
  CLI: `node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs pause-turn {state} --step N --reason "<text>" [--next-action "<text>"]`. `--next-action` wins; when omitted it derives `Resume step N (<substep>; <remainingUnits> remaining)` from `state.stepCheckpoints[N]`; with neither, the call exits non-zero. Write it **only** when a turn actually ends mid-step, never speculatively.
- **Telemetry:** every `checkpoint` appends one `checkpoint` event (`step`, `substep`, `progress`, `timestamp`) and every `pause-turn` one `turn_paused` event (`reason`, `nextAction`); each call bumps `state.revision` by exactly one.
- **Resume:** a later turn reads `state.turnPause` (and `state.stepCheckpoints[turnPause.step]`) and continues `turnPause.nextAction`; the unchanged `revision` is a pause, not a stall. `ws-monitor` reports `worker-session-paused` and suppresses `worker-session-stall` while the marker exists.
- **Lifetime:** the step's terminating `finish` clears `state.stepCheckpoints["N"]` and a `state.turnPause` naming step N (an internal substep finish does not); `dispatch` never writes or clears either record. No TTL, no second state artifact.

### Safe Revert & Backward Navigation

**Revert** = manifest to checkpoint M. Scope: `reset --mixed` → per-path restore from `## Step file log` → remove worktrees ≥M → truncate state <M. Verify `preExistingDirty`. Forbidden: global `reset --hard`, `checkout -- .`, `restore .`, `clean -fd`, stash, push `uswf/*` tags.

**Bootstrap revert data:** `baselineCommit` (+ `baselineSourceRef`), `preExistingDirty[]`, backup `{workflow-id}.baseline/`. Full reset: M=1 + new workflow-id.

**Baseline advancement (base branch moves mid-run):** refresh `baselineCommit` to the new tip and re-integrate the session's own commits forward — never `reset` back to the original baseline. Recipe: `node {skillsRoot}/ws-spec-to-pr/scripts/refresh_baseline.cjs --state {us-dir}/{workflow-id}.state.json --base-ref origin/{baseBranch}`, then `git fetch` + `git rebase {newTip}` (merge-forward where rebase is disallowed). A re-integration that would conflict on a path this session did not edit → STOP, report the overlapping paths, mutate nothing. Canonical ownership contract (forbidden-verb list, staging recipe, dirty-tree tolerance): [`git-ownership.md`](../ws-shared/runtime/git-ownership.md).

**Backward nav** (normal only): Gate **Go back** / **Previous** or Step 5→4 shortcut. Targets: 0–7 in `completedSteps`. Sub-menu: Planning/Implementation/Review/Testing/Ship → confirm → checkpoint revert → redispatch M. Log `backward-nav | from | to | ISO`.

---

## State & dispatch

### `state.md` YAML

```yaml
workflowId, slug, us, specSource, specPath
startedAt, endedAt, status: active|completed|cancelled|failed
currentStep, dryRun, autoMode, skipTesting, skipTests, fullMode, scoreAndRefine
execMode: sequential|parallel|null  # set after Step 3
branch, branchStrategy: from-current | from-base | stay | checkout-existing, baseBranch, baselineCommit, preExistingDirty: []
checkpoints, workflowManifest, commits: [{sha, step, message}]  # G2-code and G2-delivery append here
stepCheckpoints: {"N": {step, substep, completedUnits, remainingUnits, updatedAt}}  # mid-step progress (update_state checkpoint)
turnPause: {step, reason, at, nextAction}  # turn-boundary pause marker (update_state pause-turn)
completedSteps, stepStatus, skippedSteps, completedTasks, stepDispatches
pass1Scores, pass2Scores, scoreGateChoice
refineRound, currentModel  # session-derived; refresh on resume
stepModels: [{step: N, model: "name", dispatched: ISO}]
# modelChain removed — ignore if present in old state files
telemetry:
  workflowStartedAt: ISO
  workflowEndedAt: null
  totalElapsedSec: null
  loc: { baseline, final, added, removed, netDelta }
  totalTokens: int|null
  steps: [{ N, label, dispatchedAt, finishedAt, elapsedSec, promptTokens, completionTokens, estimated, model, filesTouched }]
```

`branchStrategy` and `baseBranch` are written at bootstrap 5b; resume trusts them; workflow-mode `ws-ship-pr` reads `branch`.

Sections: Workflow baseline, manifest, Step file log, Refinement registry, Context, Artifacts, Step outputs, Step model log, Workflow memory, Accumulated decisions, Doc consolidation log, Open items, Gate history.

### Resume / reset

→ [`setup.md`](../ws-shared/runtime/setup.md) § Resume / reset

### Base Prompt Prefix (`dispatch-agent` body)

```markdown
# Subagent — Step {STEP} — {Label}
Read state: `{us-dir}/{workflow-id}.state.json` (machine SoT), including `state.handoffs[String(previousStep)]`, and `{workflow-id}.state.md` `## Step outputs (compact)` plus at most the two most recent full step outputs. Do not reload full `step-06-*.review.md` or `step-07-*.testing.*` bodies unless ARTIFACTS.md names that file as required for this step.
Skill: {SKILL.md path} — required sections: `## Subagent contract` and the step sections named by STEP-DISPATCH (never the full skill body).
Orch: SKILL.md § Step {STEP} · model {resolvedSubagentModel} · {modeFlags}
Enhancing skills (mandatory): read only `## Subagent contract` from ws-senior-developer, ws-tdah, ws-self-learning
Read: compact state outputs; injected MEMORY slice (orchestrator path-scoped query, ≤ 4,000 B — do not read the MEMORY.md index); `config.json.rules.stackFile` slices when provided.

MEMORY: apply the injected slice (Severity Medium+ DO NOT / INSTEAD DO). Empty slice is valid when MEMORY.md is absent.
Proof: step-output must include `memory_consult` (see schema).
Anchor: uswf/{workflow-id}/before-step-{STEP} @ {sha} · CWD: {repo-root | worktree}
Role: fresh; no resume. files_touched required (revert). model: {resolvedSubagentModel}.
Rules: no `{plansDir}/` in git-add except Step 8 G2-delivery; needs_user: ≥2 choices, recommended first.
Turn rule: the worker's FIRST response must contain BOTH the verbose preview AND at least 2 tool calls; a response with zero tool calls ends the turn as failed delivery. The OUTPUT FORMAT example is not a valid final message on its own. Final message starts with DONE plus the step-output envelope; required artifacts must exist on disk before finish. Full text: `WORKER-TURN-RULES.md`.
Learning: use ## Step outputs (compact) plus at most two prior full outputs. Do NOT repeat broken approaches.
Telemetry is stamped by the orchestrator (`dispatchedAt`/`finishedAt`); do not author elapsedSec.
End with ```step-output(status, step, artifacts, files_touched, verification, refine, summary, evidence, decisions, doc_consolidation, needs_user, errors, retry_hint, learning, memory_consult{keywords, hits}, model)
```
```

**VerboseMode addendum** (append to the body **only** when `defaults.verboseMode` is explicit `true`; omitted/`false` → skip):

```markdown
VerboseMode: analyze THIS run (skill contract, state, files on disk, skip rules, config). Before any tool call, print `Starting step {STEP} ({Label}):` plus 4–8 `*` bullets covering goal, lookups, actions, conditional writes, and how the next step becomes ready. Then do the work — then immediately continue with tool calls in the same response; never end the turn after the preview. Do not copy a canned list. Turn rule: the FIRST response must hold BOTH that preview AND at least 2 tool calls — stopping right after the preview is failed delivery, never a complete turn.
```


### Transition Gates

Post-step: `update_state` (+ JSONL) → checkpoint (`Shell` tag) → pre-advance validate (shell) → short summary → gate. Board at phase boundaries.

| Mode | Tool |
|------|------|
| auto | auto-gate table → immediate `dispatch-agent`/`Shell` |
| normal | Prefer `user-gate`; slim menu per [`gates.md`](../ws-shared/runtime/gates.md) |

Shows gates.md banner (`Orchestrator session model` + `Subagent phase model` + Pause → IDE/agent host → Resume) and `**Next step:** {N+1} — {Label}`. Primary: **Advance** (Recommended) / **More options…** (universal controls). Soft tips at F1→F2 / F3→F4 only. Native modal gate returning any recommended advance option (**Next**, **Accept recommendation**, Commit-then-advance, Reach-10 advance, close, or ship intent) is explicit confirmation — continue in the same turn; markdown fallback yields the turn and never dispatches in the same turn (see [`gates.md`](../ws-shared/runtime/gates.md) § Interactive execution cadence and rule 7).

---

## Bootstrap & Entry

→ [`setup.md`](../ws-shared/runtime/setup.md) § Bootstrap & Entry

## Step instructions

→ [`STEP-DISPATCH.md`](STEP-DISPATCH.md) (load when advancing/dispatching)

## Error policy

Retry: max 3; backoff 0s→30s→60s. Revert: Checkpoint Algorithm only. Conduct: orch never implements code; fresh `dispatch-agent`/step; branch-direct default; **G2-code after Step 5 before Step 6** and after review-fix if dirty (optional 4 / 7-fix); G2-delivery step 8; G3 step 8 push/PR; HS-2a blocks plan-dir commits mid-workflow.

## Post-workflow (outside this agent)

Manual QA after workflow completion (or pause before Step 8) not resumed here. Optional Extra skill [`ws-plan-update`](../ws-plan-update/SKILL.md) (invoke when installed) — append plan §9, implement delta, update `step-08-{slug}.result.md`, certify for PR. Distinct from Step 6 fix → re-review loop (in-pipeline review fixes). Not a required FSM step.
