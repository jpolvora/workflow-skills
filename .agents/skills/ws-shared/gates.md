# Shared Gate Contract — Dual-Mode

Canonical gate UX for [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md) and [`ws-spec-to-pr-lite`](../ws-spec-to-pr-lite/SKILL.md).
Both orchestrators MUST follow this file so shared pipeline skills stay interchangeable.

Artifact paths: [`../ws-spec-to-pr/ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md).
Config: [`.agents/skills/ws-shared/config.json`](config.json) only — see [`config-resolution.md`](config-resolution.md).

---

## Dual-mode rules (mandatory)

| Rule | Detail |
|------|--------|
| **Shared skills are workflow-agnostic** | Pipeline `ws-*` skills (`ws-spec-write`…`ws-fix-pr`, `ws-goal-fix-pr`), providers, `ws-goal-loop` never assume full vs lite step numbers. Orch passes mode, paths, and flags. `ws-plan-update` is optional Extra (invoke when installed). |
| **`workflowType`** | `standard` (full) or `lite`. Resume filters by type — never cross-resume. |
| **Close then ship (two gates)** | Orchestrator presents **close implementation** then **ship** at standard Step 8 / lite Step 4. Close sets `status: completed` before push/PR. [`ws-ship-pr`](../ws-ship-pr/SKILL.md) in workflow mode **executes** the ship option (push/PR only) — does **not** re-ask delivery commit or workflow close. Standalone `/ship-pr` may ask. |
| **Fix-PR is separate** | Standard Step 9 / lite Step 5 — **not** inside ship. `ws-ship-pr` receives `stopBeforeFixPr: true`. |
| **Artifact names** | Delivery result is `step-08-{slug}.result.md` for **both** workflows. Plan is `step-01-{slug}.plan.md`. |
| **Step ranges** | Standard: Steps 0–9. Lite: Steps 0–5. |
| **Config** | Only `.agents/skills/ws-shared/config.json`. No `ws-spec-to-pr/config.json` / `ws-spec-to-pr-lite/config.json`. |
| **User gates** | Prefer native structured choice UI when available; markdown fallback when not; HS-1 on cancel. |
| **Verbose step preview** | When `defaults.verboseMode` is explicit `true`, the model executing the step (orch for orch-owned/lite inline work; the dispatched subagent otherwise) reasons about **this run** and prints `Starting step N (label):` plus `*` bullets before any tool call. Omitted/`false` → silent. Schema/`ws-configure-project` seed writes `true`. Preview text is not canned in skills or scripts. |

---

## User gates (`user-gate`)

Portable alias: `user-gate`. Gate placement follows `defaults.gateGranularity`; hard stops are unchanged.
Host binding: [`tools.md`](tools.md) § Host capability discovery & dispatch tiers (`hasStructuredChoiceTool`).

1. Every normal-mode gate: use `user-gate` with ≥2 options; recommended first. Prefer the host's structured multiple-choice UI when available; map to portable `user-gate` vocabulary in logs.
2. In normal mode, when the cached `askQuestionTool` binding (Step 0 probe or `{sharedDir}/host-capabilities.json` hit for the current `hostId::orchestratorModel` key) resolves to a concrete tool, the orchestrator and shared skills MUST invoke that tool for all `user-gate` occurrences rather than falling back to text. Log `user-gate-modal | {gate} | ISO`.
3. If `askQuestionTool` binds `none` → present the **same options** as a short markdown list; wait for user reply. Log: `user-gate-fallback | {gate} | ISO`.
4. Markdown fallback turn-yielding (mandatory): when a `user-gate` is presented as text/markdown, output ONLY the question and options and MUST NOT emit any tool calls in the same response turn — immediately yield the turn to wait for user input. Emitting a gate plus Step N+1 tool calls in one turn violates this gate.
5. Cancelled / dismissed → **HS-1** (STOP; re-present; never infer yes).
6. `autoMode` → zero `user-gate` prompts of any kind (neither modal tool nor markdown) at **every** boundary — entry, transition, G2-code, close, ship, fix-PR; use orch auto-gate table (index 0) to automatically select the recommended option and proceed to the next step without pausing.

## Interactive execution cadence (One Step Per Turn)

In interactive execution mode (normal mode), completing Step N (dispatch, execution, state finish, pre-advance validation, and transition gate) must halt the turn. Step N+1 MUST never be initiated within the same interaction turn without explicit user confirmation. This prevents eager models from steamrolling past gates by generating a gate plus next-step tool calls in one response. **`autoMode` exception:** when running with `autoMode: true`, interactive single-turn halting does not apply; the orchestrator automatically applies the recommended option (index 0) from the auto-gate table and proceeds continuously across step boundaries.

**Orchestrator obligation:** both orchestrators resolve `defaults.gateGranularity` (`step` default, or `phase`). `step` runs `user-gate` at each step boundary. `phase` runs at most five blocking gates in a normal standard run: entry, plan approval, implementation approval, delivery, and fix-PR. Boundaries inside a phase advance after validation and state persistence without another blocking prompt. Hard stops, required save points, review findings, test failures, and safety checks never become implicit approvals.

---

## Universal step controls (every step boundary)

Both workflows expose the same control vocabulary at **every** step transition. Primary menu stays slim; extended controls live under **More options…**.

**Banner (always, before options):**

````text
Orchestrator session model: {currentModel} | Subagent phase model: {targetSubagentModel}
To use a different model for the orchestrator session: Pause → switch it in the session host → resume workflow.
````

The orchestrator session ALWAYS runs under the active session model (`{currentModel}`). Resolve `{targetSubagentModel}` from `defaults.modelsPreset` / `modelPresets`, optional `stepModels`, and legacy phase keys for the subagent at Step N (or lite telemetry); otherwise `{targetSubagentModel}` defaults to `{currentModel}`. If unknown, use `unknown`. Log `model | step {N} | {name} | ISO`. On change vs prior state value, also log `model-change | step {N} | {old} → {new} | ISO`.

For standard Step 9, capture `{currentModel}` once before internal dispatches. `fixPrPlan` falls back through `reviewerModel`; `fixPrExec` through `executionModel`. Neither role consults numeric Step 9, and neither finishes the outer step. Lite runs both phases inline without role switching.

**Primary options (always shown):**

1. **Next** — Advance to Step N+1 (Recommended)
2. **More options…**

**Under More options…** (second user-gate only if user picked More):

| Control | Action |
|---------|--------|
| **Previous** | Go back to an earlier completed step (sub-menu by phase / step list) |
| **Replay** | Re-run the current step from its checkpoint |
| **Refine** | Alias → **Replay** (same behavior; preferred label when user wants iteration) |
| **Commit** | G2-code: commit workflow `files_touched` product paths only (see [Required G2-code save points](#required-g2-code-save-points-both-orch)); never `git add -A` / `git add .` / `{plansDir}/**` |
| **Undo** | Checkpoint revert to `uswf/{workflow-id}/before-step-{N}` for the current step |
| **Pause workflow** | Keeps all artifacts; after pause, switch the model in the session host, then resume |
| Cancel without revert / Cancel and revert | HS-1 / revert per orch policy |

Do **not** offer Switch model / Choose model / concrete model-name menus. Model changes happen only via Pause → session-host model selection → Resume.

**Optional soft tip (standard orch only):** When advancing **into Step 6** (code review), add one hint line under the banner (no picker):

- `Hint: review ahead — consider a Reviewer/Thinking-class model (Pause → switch it in the session host → Resume).`

Log `model-hint | before-step-6 | current={currentModel} | ISO`. Lite: banner only (no phase soft tips).

Routine steps must not bury **Next** under five peers.

---

## Mode selection (entry)

After bootstrap / resume, when starting a **new** workflow (not resume), present once if the user did not pass an explicit density flag:

| Option | Effect |
|--------|--------|
| **Full pipeline** (ws-spec-to-pr default) | Steps 0–9 |
| **Fast (lite-like)** | Prefer `/ws-spec-to-pr-lite` or, inside full orch, complexity gate that skips 1–2–3 when eligible |
| **Auto** | `autoMode` — auto-gate index 0 |

If user invoked `/ws-spec-to-pr-lite`, skip Full vs Fast — already Fast. If `--full` / `auto` / `dry-run` already parsed, do not re-ask density.

---

## Complexity gate (full orch only)

Before Step 1, evaluate complexity (same spirit as Dynamic Execution):

| Class | Criteria | Path |
|-------|----------|------|
| **simple** | Docs-only, single-file text, no cascading side effects | Skip Steps 1–2–3; write stub `step-01-{slug}.plan.md` (goal + files + AC checklist); `execMode: sequential`; jump to Step 4 |
| **standard** | Normal feature | Steps 1 → conditional 2 → 3 → … |
| **complex** | Multi-domain, schema, tenancy, API surface | Enforce 1 + 2 + 3 |

Always write a real plan stub for **simple** (never blank plan reference). Log `complexity | simple|standard|complex | ISO`.

---

## Conditional interview (Step 2, full orch)

Skip Step 2 (mark skipped, log) when **all** hold:

- Complexity ≠ complex
- Plan Open Questions section empty or all marked resolved
- No `blocking` gaps from a 30s orch skim / prior step-output
- `check_memory_conflict.py --json` did not return `force_interview: true`

Otherwise run `ws-plan-interview` (project-context sweep before escalate; in `autoMode`, sweep-miss blocking gaps close as model-inferred — no `user-gate`). A High or Critical MEMORY trap whose `PathPattern` matches a touched plan path forces this interview even when every other skip condition passes. Choosing **End refinement and advance** at 2c **auto-sets** `shared_understanding: confirmed` (skip separate 2e). Only show 2e when 2c was not used to exit.

---

## Check-implementation gate (standard Step 5)

Eval implemented code vs **refined spec when present, else `step-00-{slug}.spec.md`**. Publish integer **score 0–10** in Progress Board + `step-05-{slug}.plan.report.md`.

| Score | Behavior |
|-------|----------|
| ≥ `defaults.minVerifyScore` (default 9) | Complete Step 5; required **G2-code after Step 5 before Step 6** (skip if empty stage); then dispatch Step 6 |
| below `defaults.minVerifyScore` | Run **scoreAndRefine** until overall score ≥ `defaults.minVerifyScore` (default 9) (even when `defaults.scoreAndRefine` is false). Write `step-05-{slug}.score-analysis.md`, re-dispatch `ws-implement-tasks` for tasks scoring below `defaults.minVerifyScore`, re-run `ws-plan-verify`. Max **3** rounds per Step 5 visit; log `score-refine round={n}/3`. After 3 rounds still below `defaults.minVerifyScore`: **Pause** (fail closed). Resume continues the loop. Refine runs **before** the product commit. Never Advance or auto-approve below `defaults.minVerifyScore`. |

`autoMode`: auto-run scoreAndRefine rounds; do **not** auto-approve below `defaults.minVerifyScore` — Pause only after max rounds still below `defaults.minVerifyScore`.

---

## Reach-10 offer (after verify, before G2-code)

When overall score **≥** resolved `defaults.minVerifyScore`, score **< 10**, ledger `knownDefect` is false, remaining gap is `missingEvidence` and/or `completeTen` false, and remaining work looks small (link tests/files, fill evidence, tiny AC polish):

`user-gate`:
1. **Reach 10 before advance** (Recommended)
2. **Advance at {score}**

Cancel → STOP (HS-1). Never infer yes. Large rework → skip this offer.

`autoMode`: skip the Reach-10 offer and advance at the current passing score.

Choosing Reach 10 runs one `scoreAndRefine` polish round (role `scoreAndRefine`), then re-verify. If still < 10, do not block Advance when score still meets `minVerifyScore`.

---

## Required G2-code save points (both orch)

Orchestrator owns `git commit` via `commit-code` ([`tools.md`](tools.md)). [`ws-code-review`](../ws-code-review/SKILL.md) does **not** commit. `skipQualityGates` does **not** skip these save points or the dirty-tree STOP.

**Staging:** union of workflow `files_touched` (created/updated/deleted) still dirty in `git status`. Drop `{plansDir}/**`, secrets, gitignored, `preExistingDirty`. `git add -- <paths>` and `git add -u --` for those deletes. Never `git add -A`, `git add .`, or directory-wide `src/` `web/` `tests/`. Empty staged set → skip, log `g2-code | skip | empty-stage | ISO`, continue. Before add/commit: `HEAD` must equal `state.branch` (checkout `state.branch` only if drifted; never reset / `-D`).

| Mode | After | Before | Message | `commits[].step` |
|------|-------|--------|---------|------------------|
| standard | Step 5 score ≥ `defaults.minVerifyScore` (default 9) | Step 6 | `feat({slug}): verified implementation` | `5` |
| lite | Step 2 implement (build/tests already in exit criteria) | Step 3 | same | `2` |
| both | Review-fix loop if product files remain (one commit for all ≤3 rounds) | Advance (std 7 / lite 4) | `fix({slug}): code-review fixes` | `6` / `3` |

Optional More-options **Commit** at Step 4 / other boundaries does not replace these points. If Step 4 already committed the full set, post-verify / post-implement is a skip. Step 7 testing G2-code (extra product files after review-fix) stays optional/required as today. Step 8 G2-delivery / G3 unchanged.

**Interactive (stage set non-empty):** (1) **Commit then advance** (Recommended) (2) **Pause**. Do not offer Next-without-commit that dispatches review while product files are dirty. Cancel → HS-1.

**Interactive (empty):** skip G2-code; normal Next.

**`dryRun`:** print message + path list; no `git commit`. Do not dispatch review if the simulated stage set is non-empty and no prior real commit exists.

**Fail-closed review preflight:** If uncommitted workflow product files remain when standard Step 6 / lite Step 3 would start → **STOP**. Offer pending G2-code / Pause. Do not dispatch `ws-code-review`. `{base}` = `config.project.baseBranch` (auto-detect `main` then `master`; never hardcode `master`). Review snapshot is `git diff {base}...HEAD` only.

**Checkpoint:** G2-code after `update_state` for the completed step and **before** tagging `before-step-{next}` so the next checkpoint is the committed snapshot. Append each real commit to `state.commits[]` (`sha`, step, message). Log `g2-code | step={N} | {sha} | {kind} | ISO`.

---

## Close implementation gate (standard Step 8 / lite Step 4 — phase A)

**Before any push or PR.** Ends spec/plan implementation; sets `status: completed`, `endedAt`, `shipStatus: pending`.

1. **Commit configured delivery artifacts** (Recommended when `fullMode`)
2. **Skip delivery commit** (still closes implementation: MEMORY + changelog + `status: completed`)
3. **Pause** (to change model: switch in IDE/agent host, then resume)

When `fullMode` is false, Recommended = **Skip delivery commit** (option 2) unless user explicitly wants delivery artifacts committed. When `fullMode` is true, Recommended = **Commit configured delivery artifacts** (option 1).

G2-delivery stages only artifacts enabled by `defaults.deliveryCommitArtifacts` — algorithm and toggle map in [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md) § Step 8 (refined-plan fallback preserved when `includeRefinedPlan` is true; delivery result not staged by default).

After successful close (options 1 or 2): MEMORY.md / ws-self-learning sweep, then `ws-changelog`. Set `status: completed`, `endedAt`, `shipStatus: pending`. Optional Phase B plan-dir temp delete (see [`artifact-cleanup.md`](../ws-spec-to-pr/protocols/artifact-cleanup.md)).

`ws-spec-index sync` on close uses **implementation** evidence only — not merged/shipped.

## Ship gate (standard Step 8 / lite Step 4 — phase B)

**After close.** Same run; workflow already `status: completed`.

1. **Create PR** (Recommended when `fullMode`)
2. **Push only**
3. **Skip PR** (no create)
4. **Skip shipping entirely**
5. **Pause**

When `fullMode` is false, Recommended = **Skip shipping entirely** (option 4) unless user explicitly wants push-only. When `fullMode` is true, Recommended = **Create PR** (option 1).

Pass the selected ship intent into `ws-ship-pr` as `shipAction: create-pr|push-only|skip` with `workflowMode: true`, `stopBeforeFixPr: true`. Update `shipStatus` per outcome (`pushed`, `pr-open`, `skipped`, `stopped`). `ws-ship-pr` in `workflowMode` does **not** own delivery commit or workflow completion.

---

## Fix-PR gate (standard Step 9 / lite Step 5)

Separate from ship. After Step 8 / lite Step 4 when `shipAction: create-pr` and a PR exists:

1. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot).
2. Each issue-fix **batch** (one Act round or one standalone `/fix-pr`) runs ordered **`fixPrPlan` → `fixPrExec`**:
   - **`fixPrPlan`** (gate-only): fetch/score threads; write complete `{skillsRoot}/ws-fix-pr/runs/pr-<PR-ID>/plan-gate.md`; no product edits, commit, push, `resolve-thread`, or outer `finish --step 9`.
   - **`fixPrExec`**: validate the gate against HEAD, follow it (amend before deviate), apply cooperative proactive sweeps, then verify / resolve / push.
3. Standard orch: role models via `fixPrPlan` → `reviewerModel` and `fixPrExec` → `executionModel` (see session-model banner above). Lite: both phases inline without role switching.
4. Merge policy per goal-fix / provider helpers.

Stop: max exhausted · merge blocked · cancelled · PR closed.

---

## Score & Refine gate (`scoreAndRefine`)

Step 5 overall score **must be ≥ `defaults.minVerifyScore` (default 9)** to Advance. A score below `defaults.minVerifyScore` **always** runs this loop, even when `defaults.scoreAndRefine` is false.

When the loop is active (score below `defaults.minVerifyScore`, or `scoreAndRefine` mode / completed-workflow bootstrap):

1. **Pass 1 Score Analysis:** Score plan tasks against acceptance criteria (`step-05-{slug}.score-analysis.md`). Flag tasks scoring below `defaults.minVerifyScore`.
2. **Below-bar loop (mandatory):** If overall score below `defaults.minVerifyScore`, do **not** offer Accept First Pass As-Is. Re-dispatch `ws-implement-tasks` for flagged tasks with scoring context, then re-run `ws-plan-verify`. Repeat until overall score ≥ `defaults.minVerifyScore` (default 9). Max **3** rounds per Step 5 visit; log `score-refine | round={n}/3`. After 3 rounds still below `defaults.minVerifyScore`: **Pause** (fail closed). Resume continues the loop. Never Advance or auto-approve below `defaults.minVerifyScore`.
3. **Optional polish (overall already ≥ `defaults.minVerifyScore` (default 9) and `scoreAndRefine` flag):** present `user-gate`:
   ```text
   Score Analysis Complete:
   - Overall Score: {score}/10
   - Tasks Flagged for Improvement: {N} tasks
   - Second pass reviews the full Pass 1 diff for overengineering and unused artifacts.

   Options:
   1. Proceed with Second Pass Refinement (Recommended)
   2. Accept First Pass As-Is & Ship
   3. Selective Refinement (choose specific tasks)
   ```
4. **Second Pass Execution:** After Pass 1 check-implementation, load the **full** Pass 1 diff (workflow `files_touched` plus `git diff` vs `{base}`), every plan task, and every AC — not only flagged task ids. Re-dispatch `ws-implement-tasks` (role `scoreAndRefine`) to:
   - Apply Pass 1 scoring recommendations for flagged tasks (Option 1: all flagged; Option 3: chosen tasks only). Option 1 runs even when zero tasks are flagged.
   - **Overengineering sweep:** if any AC/task implementation can be simpler and still meet the AC, simplify it.
   - **Dead artifact removal:** delete unused files, tests, methods, and classes **this workflow introduced** that have no remaining code or doc references. Do not delete pre-existing unused code outside `files_touched`. Do not drop ACs or spec requirements.
   Then re-run `ws-plan-verify`. Record simplifications and deletions in `step-08-{slug}.second-pass-report.md`. Post-simplify score must stay ≥ defaults.minVerifyScore (default 9).
5. **Comparative Delivery Gate:** When a 2nd pass ran, compare Pass 1 vs Pass 2 scores, LOC deltas, simplifications/deletions, and test metrics before ship/commit.

---

## Safety gates to keep

| Gate | Where |
|------|-------|
| HS-1 / HS-2 / HS-2a | Both orch |
| G2-code | Required: **G2-code after Step 5 before Step 6** (standard) / **G2-code after Step 2 before Step 3** (lite); post-review-fix when product files remain. Optional: Step 4 / Step 7 fix More-options Commit |
| G2-delivery | Inside close implementation gate (phase A) |
| Review findings | Lite Step 3; full Step 6 — fix → re-review until clean (max 3); Pause on residual Critical/Warning |
| Active Resume | `setup.md` |

---

## Auto-gate defaults (shared intent)

| Context | Index 0 |
|---------|---------|
| Transition | Next (Advance) |
| Feature branch (new start) | Stay on current (detached `HEAD`: create `feat/{slug}` from HEAD; never persist `HEAD`; `ls-remote` auth/network → local-check-only) |
| Feature branch resume mismatch | Check out `state.branch` |
| Close implementation (`fullMode`) | Commit configured delivery artifacts |
| Close implementation (not `fullMode`) | Skip delivery commit |
| Ship after close (`fullMode`) | Create PR |
| Ship after close (not `fullMode`) | Skip shipping entirely |
| Completed workflow bootstrap | Run Score & Second Pass (score-and-refine) |
| Score Analysis gate (`scoreAndRefine`) | Proceed with Second Pass Refinement |
| Check-implementation below minVerifyScore | scoreAndRefine until ≥ `defaults.minVerifyScore` (default 9) (max 3); Pause on residual (no auto-approve) |
| Review findings (full Step 6 / lite Step 3) | Autofix → re-review (max 3); Pause on residual Critical/Warning |
| Testing plan (full Step 7) | Approve without browser (or skip if `skipTesting`); mutation runs only when configured and not `skipMutationTesting` |
| Post-verify G2-code (standard after Step 5 / lite after Step 2) | Commit when stage set non-empty; skip when empty |
| Post-review-fix G2-code | Commit when stage set non-empty; skip when empty |

---

## Quality gate bypass (`skipQualityGates`)

Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`. Orchs and `ws-ship-pr` link here; do not restate the full matrix in skill bodies.

| Skipped (quality only) | Never skipped |
|------------------------|---------------|
| Classifier user-gate | Build / test / leak scans |
| Fable quality visibility (except REFUTED + `auditVerdictsBlockShip`) | SCM resolution and auth |
| Pre-advance CI (`validate_state`) | Safety floor (REFUTED) |
| Telemetry soft gates | HS-1–HS-4 stops; required G2-code save points; review dirty-tree STOP |

**Telemetry:** Append `{"type":"gate-bypass","gate":"{name}","reason":"skip-gates|config","timestamp":"ISO"}` to step JSONL. Pass `--bypassed` to `update_state`. Banner: **`[GATES BYPASSED]`**.

Ship/PREPARE nuances (row 5 visibility): [`../ws-ship-pr/PREPARE-CHECKLIST.md`](../ws-ship-pr/PREPARE-CHECKLIST.md) § 5.

## Flags

| Flag | Meaning |
|------|---------|
| `skipTesting` | Skip Step 7 Testing (auto-skip when no test surface + unit tests green) |
| `skipMutationTesting` | **Config** `defaults.skipMutationTesting` (not workflow state): skip optional mutation substep inside Step 7; default true (opt-in). Also skipped when `verification.mutationTest` empty |
| `scoreAndRefine` | Optional extra polish when Step 5 score is already ≥ `defaults.minVerifyScore` (default 9) (aliases: `analyze-second-pass`, `score-refine`): wide-context overengineering sweep plus unused workflow-introduced artifact removal. Score below `defaults.minVerifyScore` always runs this loop until ≥ `defaults.minVerifyScore` (default 9) |

