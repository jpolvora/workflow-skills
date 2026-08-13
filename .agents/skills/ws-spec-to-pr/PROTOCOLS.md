# Spec-to-PR — Protocols & State

Load on demand from [`SKILL.md`](SKILL.md) when advancing steps, applying gates, writing state, or handling errors.

Sibling protocol files under [`protocols/`](protocols/) remain authoritative for board/hygiene/cleanup/delivery detail when linked below.

## Protocols

### Authorization Ladder

| Level | Ops | Gate |
|-------|-----|------|
| G0 | Read, RO reports | — |
| G1 | Edit WT, plans, impl (no commit) | Transition gate |
| G2-code | `git commit` **code only** (`src/`, `web/`, `tests/`) | Step 4 / 6 fix substep / 7 fix |
| G2-delivery | `git commit` **configured delivery artifacts only** (see [`ARTIFACTS.md`](ARTIFACTS.md) § Step 8 / `defaults.deliveryCommitArtifacts`) | Step 8 combined delivery+ship gate |
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

**Normal:** N done → `update_state` (+ `--jsonl-out`) → checkpoint `before-step-{N+1}` → `validate_state --pre-advance {N+1}` (shell; skip when `skipQualityGates` / `--skip-gates`) → Board → summary → Transition Gate → dispatch N+1.

**Auto:** auto-gate + dispatch N+1 same turn.

**Forbidden:** mutating step or commit without gate.

### Universal step controls (every boundary)

Available at **every** transition gate (normal mode; under **More options…** when not primary):

| Control | Action |
|---------|--------|
| **Next** | Advance to Step N+1 (default Recommended) |
| **Previous** | Go back to an earlier completed step (backward nav) |
| **Replay** | Re-dispatch current step from checkpoint |
| **Refine** | Replay with refinement intent (maps to Replay + log `refine-replay`) |
| **Commit** | When step produced uncommitted code changes — explicit G2-code menu (never implicit) |
| **Undo** | Revert to checkpoint before current step (manifest algorithm) |

`autoMode`: only **Next** (auto-gate index 0). Backward/Replay/Refine/Commit/Undo disabled.

### Refinement FSM (Step 2)

2a/2b/2d → `ws-interview`. Orch: 2c Escalate, 2e Shared Understanding, redispatch.

| State | Owner | Output |
|-------|-------|--------|
| 2a Audit | refine | `gap_registry[]` by design-tree |
| 2b Resolve | refine | Project-context sweep then close with evidence; `autoMode` → model-inferred (no `needs_user`); else escalate |
| 2c Escalate | orch | user-gate — **one** question; max 3 rounds; always **End refinement and advance** |
| 2d Exit | refine | §8 empty or `assumed-default`; `shared_understanding: pending` |
| 2e Shared Understanding | orch | Only if 2c did **not** exit via End refinement. Else auto-confirm. |

Rules: multiple `needs_user` → one by design-tree priority. **End refinement and advance** → log `assumed-default`, set `shared_understanding: confirmed`, skip 2e. Block Step 3 only if interview ran and `refine.shared_understanding !== confirmed`.

**Conditional skip:** See [`gates.md`](../ws-shared/gates.md) § Conditional interview. Step 2 grills the **plan**, not the spec.

### Complexity / Dynamic Execution

Before Step 1, classify per [`gates.md`](../ws-shared/gates.md) § Complexity gate. User may override when ambiguous: **Simple path** / **Standard path** (rec) / **Full grill**.

**Simple path:** stub `step-01-{slug}.plan.md`, `execMode: sequential`, skip Steps 1–2–3, jump to Step 4.

### Worktree policy

```text
dryRun → no worktree
default → branch-direct (preferred on win32 and most consumers)
worktree when config.plans.useWorktrees=true AND path≤180 AND git worktree add succeeds
```

Any step **may** use a worktree when `useWorktrees=true`. **Preferred** for code-mutating steps 4, 6-fix, 7. branch-direct: edits on `state.branch`; subagent `wip(us-{id}): step-{N}` or dirty WT. Post-step: files exist, expected diff, build/tests per STACK.md.

### State Hygiene

→ [`protocols/state-hygiene.md`](protocols/state-hygiene.md)

Every completed/failed step: pass measured `--elapsed` into `update_state.py` (required; script rejects omit). Always pass `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl`. Upserts `## Telemetry log`. After checkpoint, run pre-advance validation (shell; see [`state-hygiene.md`](protocols/state-hygiene.md)). Missing step-output telemetry, hygiene fail, or pre-advance exit ≠ 0 → **HS-5**.

### Model readiness

No in-gate model picker. At every transition, show the gates.md banner (`Current model` + target phase model when configured in `config.json` + Pause → IDE/agent host → Resume).

When `autoMode: true` or phase models are configured in `config.json` → `defaults` (`plannerModel`, `executionModel`, `reviewerModel`, `testingModel`), the orchestrator resolves the phase model for Step N and applies it during `dispatch-agent` and `update_state.py` `--model`. On switch failure or unconfigured model, gracefully maintain the current active model.

When Advance crosses **F1→F2** (after Step 3, before Step 4) or **F3→F4** (after Step 5, before Step 6), add the soft hint from [`gates.md`](../ws-shared/gates.md) (Coder / Reviewer class). Log `model-hint | F1→F2|F3→F4 | current={currentModel} | ISO`. Tags `before-step-4`, `before-step-6` remain for telemetry only.

### Step Dispatch & Isolation

Orch calls **`dispatch-agent`** — never inline step impl.

```yaml
dispatch-agent:
  subagent_type: generalPurpose | shell
  description: "STP step {N} — {Label}"
  readonly: true   # step 5 only
  run_in_background: false   # step 4 parallel (DAG): ≤3 parallel, same worktree, no file overlap
```

Anchor (`Shell` tag): `uswf/{workflow-id}/before-step-{N} @ {sha}`. Worktree via `Shell`: `worktree add` → merge → `worktree remove` → `branch -d`. Max 1 active. Audit: `Write` `stepDispatches[]`. No per-DAG-task worktree.

**Step 4 dispatch:**
- `defaults.enableDag: false` (default) or `execMode: sequential` → single `dispatch-agent` `ws-implement-tasks` mode `build` with `step-01-*.plan.md` directly (sequential subagent task execution, no DAG).
- `defaults.enableDag: true` & `execMode: parallel` → DAG: `dispatch-agent` per level, ≤3 concurrent, no file overlap within level.

### Check-implementation score gate (Step 5)

Eval implemented code vs **refined spec when present, else `step-00-{slug}.spec.md`**. Publish integer **score 0–10** in Progress Board + `step-05-{slug}.plan.report.md`.

| Score | Behavior |
|-------|----------|
| ≥ 7 | Complete step 5; Advance to 6 |
| < 7 | User-gate: **Refine** (replay implement + re-check) / **Replan** (back to 1) / **Respec** (back to 0) / **Approve and continue** (log `check-approve-below-7`) |

`--strict`: always run full verification matrix regardless of score. `autoMode`: do **not** auto-approve below 7 — Pause with score (fail closed).

### Code review + fix → re-review loop (Step 6)

| Case | Behavior |
|------|----------|
| Clean (no Critical/Warning) | Complete step 6; Advance to 7 |
| Critical/Warning findings | **Fix → re-review loop:** `ws-implement-tasks` mode fix → targeted re-review (max **3** rounds); each round logs gate history + Workflow memory (+ `ws-self-learning` when durable); Advance only when clean |
| Residual after 3 rounds | **Pause** (fail closed) — do not Advance with open Critical/Warning |
| `autoMode` | Autofix without asking; same max 3; Pause on residual |

Fix substep is **not** its own `completedSteps` entry — log `review-fix | round={n}/3` in `## Gate history`. Artifacts: `step-06-{slug}.review.md`, optional `step-06-{slug}.fix.report.md`. Full contract: [`ws-code-review`](../ws-code-review/SKILL.md) § Fix → re-review loop.

### Learning & Memory Protocol

At step start, subagent reads `state.md` (`## Workflow memory`, `## Accumulated decisions`, `## Step outputs`) and `{sharedDir}/MEMORY.md` index. After step, record `step-output.learning` → orchestrator appends to `## Workflow memory`.

All recorded learnings and memory entries must use clear, direct, and actionable directives (e.g. "When dealing with X: DO NOT use Y because Z; INSTEAD DO W"). Avoid vague or passive descriptions so that humans and agents instantly understand what pattern to avoid and what pattern to execute.

**Step 8 sweep:** Promote generalizable patterns to `{sharedDir}/memory/*.md` + run `python {skillsRoot}/ws-self-learning/scripts/self_learning.py --compile`. Criteria: technical, generalizable, non-duplicate, concise. `dryRun`: log in `## Doc consolidation log` only.

### Specification Protocol

[`ws-spec-format`](../ws-spec-format/SKILL.md). Canonical spec for planning: `{us-dir}/step-00-{slug}.spec.md` — never live tracker APIs and never `*.issue.json` after Step 0. Every provider writes the spec of record `{specsDir}/{slug}.spec.md` **before** that workflow copy.

| Input | Tracker / provider | Action | Uses Step 0? |
|-------|--------------------|--------|--------------|
| `{n}` or `US {n}` | `providers.active` | `fetch-to-spec` → `{specsDir}/us-{n}.spec.md` → register `{us-dir}/step-00-us-{n}.spec.md` | No — skip to Step 1 |
| `{org}/{project}#{id}` / `ADO {id}` / `WI {id}` | `ws-azure-devops-provider` | `fetch-to-spec` → `{specsDir}` → register `step-00` | No — skip to Step 1 |
| `*.spec.md` | `ws-local-spec-provider` | `fetch-to-spec` → `{specsDir}` → register `step-00` | No — skip to Step 1 |
| free-text / no args | none | `ws-write-spec` → `{specsDir}/{slug}.spec.md`, then `ws-local-spec-provider` register → `{us-dir}/step-00-{slug}.spec.md` | Yes — `dispatch-agent` `ws-write-spec` (+ register before Step 1) |

Provider resolution and `fetch-to-spec` dispatch: load active provider skill; auth failure → STOP (no silent fallback). Details in each provider `SKILL.md`.

### Step 0 Entry Gate

1. **Tracker id** → provider `fetch-to-spec` → skip Step 0 → Step 1 gate.
2. **Local `*.spec.md`** → `ws-local-spec-provider` → skip Step 0 → Step 1 gate.
3. **No args / free-text** → Entry menu: issue/spec path / brainstorm (`ws-write-spec` → `{specsDir}` only, then register to `{us-dir}` before planning).

Store `specPath` in state `## Artifacts`.

### Build & Test Validation (4, 6-fix, 7)

Before G2-code commit: `config.json.rules.stackFile` → build (+ tests unless `skipTests`) → Coder fix loop. Stage **only** `src/`, `web/`, `tests/` — never `{plansDir}/`. `skipTests`: `verification.tests: skipped`.

### Testing (Step 7)

`ws-testing` via **`dispatch-agent`** (label **Testing** — broader than integration-only). `skipTesting` → skip to Step 8. `autoMode`/`dryRun` → `dispatch-agent` without browser.

Optional **mutation** substep (inside `ws-testing`, not a new FSM step): runs after green unit/integration/coverage when `verification.mutationTest` is set and `defaults.skipMutationTesting` is false; otherwise log Mutation `skipped`. Score &lt; `verification.mutationThreshold` (default 80) or runner failure → fail-closed (no Advance); hand off to `ws-implement-tasks` fix mode to strengthen tests. Lite orch does not run Step 7 / mutation.

Gates (normal): **Approve and run test battery** (rec) / **Run without browser** / **Adjust test plan** / **Skip validation** / **Pause workflow**.

Failure (max 3): **Apply fixes and revalidate** (rec) / **Accept with reservations** / **Re-run without fixes** / **Pause**. Fix: G2-code commit only. Mutation survivors count as Step 7 failure (same fix gate).

### Workflow Artifact Commit Protocol

| When | Allowed |
|------|---------|
| Steps 0–7 | **Code only** under `src/`, `web/`, `tests/` at Steps 4, 6 fix, 7 fix |
| Steps 0–7 | **Forbidden:** `{plansDir}/**`, exec/dag/report/state/issue files |
| Step 8 | Configured delivery artifacts (`defaults.deliveryCommitArtifacts`) — delivery commit via G2-delivery gate |
| Pause | No commit; no delete |

Orch `git add` must be path-scoped — never `git add .` on code-commit steps.

### Ship — delivery + push/PR (Step 8)

→ [`protocols/delivery-result.md`](protocols/delivery-result.md) (writes `step-08-{slug}.result.md`)

**Order:** delivery result → **combined delivery + ship user-gate** → on delivery commit: MEMORY sweep → optional Phase B plan-dir temp delete per [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md).

**Terminal completed (Phase A — once):** When orch sets `status → completed` (after Step 9 convergence **or** after Step 8 when there is no Step 9 / skip-PR), run mandatory Phase A git cleanup **before** claiming ended:

```bash
python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}
```

Do **not** invoke Phase A at both Step 8 and Step 9. Phase B stays optional (delete-temps only). Keep-all still runs Phase A. Skip auto Phase A for `failed` / `cancelled` / `paused` / active Pause. Exit 0 → claim ended; exit 2 → surface leftovers, may claim ended; exit 1 → do not claim ended.

**Combined gate** ([`gates.md`](../ws-shared/gates.md) + [`STEP-DISPATCH.md`](STEP-DISPATCH.md)):

1. **Commit configured delivery artifacts, then create PR** (Recommended when `fullMode`)
2. **Commit configured delivery artifacts, push only**
3. **Commit configured delivery artifacts, skip PR**
4. **Skip delivery commit and skip shipping**
5. **Pause**

Dispatch `ws-ship-pr` with `workflowMode: true`, `shipAction`, `stopBeforeFixPr: true` — **no goal-fix loop inside ship**. Advance to Step 9 when PR created and `fullMode` / user chose create-pr.

### Fix-PR (Step 9)

First-class step after Step 8 when `shipAction: create-pr` and PR exists (canonical detail: [`STEP-DISPATCH.md`](STEP-DISPATCH.md) § Step 9):

1. **Wait for code-review / CI** (≥300s settle + poll checks/threads) — do not merge yet.
2. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot) until **no open issues** (`activeThreads == 0`).
3. **Merge** via SCM `merge-pr` only after convergence and required checks are green.

Stop: max exhausted · escalate · merge blocked · cancelled · PR closed · checks red.

### Progress Board & banners

→ [`protocols/progress-board.md`](protocols/progress-board.md)

### Automatic Mode

Parse: `auto` + combinable `dry-run`, `skip-testing`, `skip-tests`, US/spec entry.

Resume: active `autoMode` same US → continue `currentStep`; else new `workflow-id`.

| Context | Auto choice (index 0) |
|---------|----------------------|
| Step 0 entry gate | **I have a US/issue number** (user must provide in invocation) |
| Complexity ambiguous | **Standard path** |
| Transition 0–6, 9 | **Advance to Step N+1** |
| Transition / phase model | **Advance** with resolved phase model (`plannerModel`/`executionModel`/`reviewerModel`/`testingModel`; fallback to session `currentModel`) |
| Step 2 needs_user | first option; early → **End refinement and advance** (auto-confirms 2e) |
| Step 2e (only if shown) | **I confirm shared understanding — advance to Step 3** |
| Step 5 score < 7 | Pause (fail closed — no auto-approve) |
| Step 7 skipTesting / no API-UI | skip step |
| Step 7 plan | **Approve and run test battery without browser** |
| Step 7 mutation skip (`defaults.skipMutationTesting` / empty `mutationTest`) | log skipped; continue report |
| Step 7 mutation fail (score &lt; threshold) | **Apply fixes and revalidate** (strengthen tests) |
| Step 7 failure | **Apply fixes and revalidate** |
| Step 8 combined gate (`fullMode`) | **Commit configured delivery artifacts, then create PR** |
| Step 8 combined gate (not `fullMode`) | **Commit configured delivery artifacts, skip PR** |
| Step 9 fix-pr | **Run ws-goal-fix-pr loop** |

Shared defaults: [`gates.md`](../ws-shared/gates.md) § Auto-gate defaults. Log `auto-gate | step {N} | {choice} | ISO`. Disabled: backward/repeat/pause menus; Step 3 without shared understanding.

### Checkpoints

Tag `uswf/{workflow-id}/before-step-{N}` = HEAD before step N first mutation. `before-step-1` = `baselineCommit`. Mirror in `checkpoints[]`. **Delete on completion:** Phase A via [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md) when `status → completed` (mandatory git runtime cleanup — not gated on delete-temps). Dry-run: log only (`--dry-run`).

### Safe Revert & Backward Navigation

**Revert** = manifest to checkpoint M. Scope: `reset --mixed` → per-path restore from `## Step file log` → remove worktrees ≥M → truncate state <M. Verify `preExistingDirty`. Forbidden: global `reset --hard`, `checkout -- .`, `restore .`, `clean -fd`, stash, push `uswf/*` tags.

**Bootstrap revert data:** `baselineCommit`, `preExistingDirty[]`, backup `{workflow-id}.baseline/`. Full reset: M=1 + new workflow-id.

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
checkpoints, workflowManifest, commits: [{sha, step, message}]
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

→ [`setup.md`](../ws-shared/setup.md) § Resume / reset

### Base Prompt Prefix (`dispatch-agent` body)

```markdown
# Subagent — Step {STEP} — {Label}
Read state: `{us-dir}/{workflow-id}.state.md`
Skill: {SKILL.md path} — read full.
Orch: SKILL.md § Step {STEP} · model {currentModel} · {modeFlags}
Enhancing skills (mandatory): ws-karpathy-guidelines, ws-senior-developer, ws-tdah, ws-self-learning
Read: state workflow memory + decisions + doc log; MEMORY.md index; `config.json.rules.stackFile`.
Anchor: uswf/{workflow-id}/before-step-{STEP} @ {sha} · CWD: {repo-root | worktree}
Role: fresh; no resume. files_touched required (revert). model: {currentModel}.
Rules: no `{plansDir}/` in git-add except Step 8 G2-delivery; needs_user: ≥2 choices, recommended first.
Learning: read ## Workflow memory + ## Step outputs (all prior steps) for traps/errors. Do NOT repeat broken approaches. Record own mistakes in step-output.learning.
Telemetry required: elapsedSec, promptTokens + completionTokens (from LLM metadata if available, else estimate chars/3.5 with estimated: true).
End with ```step-output(status, step, artifacts, files_touched, verification, refine, summary, evidence, decisions, doc_consolidation, needs_user, errors, retry_hint, learning, model, telemetry{elapsedSec, promptTokens|null, completionTokens|null, estimated})
```
```

### Transition Gates

Post-step: `update_state` (+ JSONL) → checkpoint (`Shell` tag) → pre-advance validate (shell) → short summary → gate. Board at phase boundaries.

| Mode | Tool |
|------|------|
| auto | auto-gate table → immediate `dispatch-agent`/`Shell` |
| normal | Prefer `user-gate`; slim menu per [`gates.md`](../ws-shared/gates.md) |

Shows gates.md banner (`Current model` + Pause → IDE/agent host → Resume) and `**Next step:** {N+1} — {Label}`. Primary: **Advance** (Recommended) / **More options…** (universal controls). Soft tips at F1→F2 / F3→F4 only.

---

## Bootstrap & Entry

→ [`setup.md`](../ws-shared/setup.md) § Bootstrap & Entry

## Step instructions

→ [`STEP-DISPATCH.md`](STEP-DISPATCH.md) (load when advancing/dispatching)

## Error policy

Retry: max 3; backoff 0s→30s→60s. Revert: Checkpoint Algorithm only. Conduct: orch never implements code; fresh `dispatch-agent`/step; branch-direct default; G2-code steps 4/6-fix/7; G2-delivery step 8; G3 step 8 push/PR; HS-2a blocks plan-dir commits mid-workflow.

## Post-workflow (outside this agent)

Manual QA after workflow completion (or pause before Step 8) not resumed here. Use [`ws-update-plan-implementation`](../ws-update-plan-implementation/SKILL.md) — append plan §9, implement delta, update `step-08-{slug}.result.md`, certify for PR. Distinct from Step 6 fix → re-review loop (in-pipeline review fixes).
