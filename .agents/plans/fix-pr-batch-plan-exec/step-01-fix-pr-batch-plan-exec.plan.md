---
superseded: true
supersededBy: step-02-fix-pr-batch-plan-exec.plan.refined.md
slug: fix-pr-batch-plan-exec
title: "fix-pr: plan substep (reviewer model) then execute (fix model) per batch"
status: active
step: 1
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
startedAt: "2026-08-25T16:39:00Z"
endedAt: "2026-08-25T16:49:15.493Z"
acRefs: []
---
## 0. Summary & Business Rules

Upgrade each cooperative Fix-PR batch from one combined score/plan/edit pass to an explicit plan-then-execute sequence. The outer workflow remains standard Step 9 or lite Step 5; the two substeps are internal roles owned by `ws-fix-pr`, including when `ws-goal-fix-pr` invokes it for an Act round.

Business and safety rules:

1. A batch is all active threads scored in one `ws-goal-fix-pr` Act round, or all active threads in one standalone `/fix-pr` invocation. It is not one model switch per thread.
2. `fixPrPlan` fetches, scores, classifies, and writes the existing uncommitted `plan-gate.md` before any product-file edit. The gate records each thread's score and proposed action and reserves `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped`.
3. `fixPrPlan` may write only the gate artifact. Product edits, commits, pushes, and remote `resolve-thread` mutations are forbidden.
4. `fixPrExec` reads and follows the gate. A newly discovered fact that changes the action must be appended as a plan amendment before further product edits.
5. Standard/standalone hosts with `dispatch-agent` run the plan role with reviewer-class resolution and the execute role with execution-class resolution. Empty, rejected, or unsupported models fall back to the active session without aborting the batch.
6. Lite remains inline under `currentModel`; it ignores `fixPrPlan`/`fixPrExec` model switches but enforces the same durable plan-before-edit order.
7. The execute substep retains CI baseline triage, the cooperative repo-wide defect-class sweep, verification, post-round self-learning, resolution, commit, and push ordering.
8. `AUTO_FIX.md`, SCM provider APIs, the 0–9 FSM, and historical round reports remain unchanged.

Security mitigations are the plan barrier before all product/remote mutations, path-scoped and provider-delegated operations, explicit amendment history, and existing dry-run suppression of commits, pushes, learning writes, and remote resolution.

## 1. Definition of Ready & Scope

Definition of Ready:

- The project config resolves to the Node 22 skill package with `.agents/skills` as upstream skill SoT, `test/` as the test layer, and `verification.backendTest: "npm run test"`.
- Design-intent history confirms `reviewFix` established role-first model resolution and that `plan-gate.md` was introduced as the Fix-PR confirmation artifact. The implementation must extend those contracts rather than create a second vocabulary.
- MEMORY's Medium-severity Fix-PR rule is binding: the execute pass must name the defect class, sweep repo-wide and all named sibling paths, and record skipped hits with path and reason.
- Current runtime evidence shows `workflow_state.cjs` recognizes only `dag`, `scoreAndRefine`, and `reviewFix`; `standardPhaseKey()` sends every recognized role to `executionModel`. Runtime support is therefore required, not documentation alone.
- No specialized Fable domain adapter applies to these Markdown/JavaScript harness changes.

Resolved scope:

- Keep the existing gate path `{skillsRoot}/ws-fix-pr/runs/pr-<PR-ID>/plan-gate.md`; extend its required content rather than adding a successor or dual folder.
- Keep goal-loop revision/blocked runtime under `{plansDir}/{slug}/.runtime`; the plan gate is separate uncommitted batch evidence.
- Keep numeric `stepModels["9"]` as the model for the outer Step 9 skill. Internal role keys take precedence for nested plan/execute dispatches.
- Use the exact substep tokens `fixPrPlan` and `fixPrExec`.

AC-to-plan-step coverage:

| AC | Plan step(s) |
|----|--------------|
| AC1 | 2, 3 |
| AC2 | 2, 3 |
| AC3 | 2 |
| AC4 | 2 |
| AC5 | 1, 2, 3 |
| AC6 | 1, 4 |
| AC7 | 1, 4 |
| AC8 | 3 |
| AC9 | 3 |
| AC10 | 2, 3 |
| AC11 | 5, 6 |
| AC12 | 2, 5 |
| AC13 | 2, 3, 4, 6 |

Out of scope:

- New FSM steps, new completed-step entries, per-thread dispatches, provider intent changes, and skill-boundary merges.
- Dual-model behavior in `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`.
- Rewriting archived `{reviewsDir}/PR-*-round-*.md` reports or introducing compatibility folders/shims.
- Committing project-local `.agents/skills/ws-shared/config.json`.

## 2. Technical Design & Architecture

The feature crosses the `skills-sot` and `tests` layers only; there are no frontend, database, migration, API, tenancy, or i18n changes.

### Batch execution sequence

Standard workflow or standalone host with `dispatch-agent`:

1. Outer Step 9 dispatches `ws-goal-fix-pr` or `ws-fix-pr` once, preserving numeric Step 9 model semantics.
2. `ws-fix-pr` resolves `fixPrPlan`, dispatches the plan-only agent, and, when orch-owned, records `update_state.cjs dispatch --step 9 --substep fixPrPlan --model <resolved>`.
3. The plan agent fetches/triages threads and CI, writes `plan-gate.md`, and returns without product or remote mutation.
4. `ws-fix-pr` resolves `fixPrExec`, dispatches the execute agent, and records `--substep fixPrExec --model <resolved>` when orch-owned.
5. The execute agent validates the gate, appends any amendment before deviating, performs proactive discovery and fixes, verifies, learns, resolves, commits, and pushes.
6. Step 9 finishes once. JSONL/state evidence records substep/model telemetry without adding an FSM step.

Lite workflow or a host without `dispatch-agent`:

1. Execute the same plan and execute phases sequentially in the session.
2. Write and validate `plan-gate.md` before edits.
3. Stay on `currentModel`; model names may be shown as hints only when the host supports hints, never as a session switch.

### Model resolution

| Role | Resolution order | Phase fallback |
|------|------------------|----------------|
| `fixPrPlan` | `stepModels.fixPrPlan` → active preset `steps.fixPrPlan` → top-level phase key → preset phase key → session | `reviewerModel` |
| `fixPrExec` | `stepModels.fixPrExec` → active preset `steps.fixPrExec` → top-level phase key → preset phase key → session | `executionModel` |

`"current"` resolves immediately to the session model. Empty values continue down the chain. A host rejection is non-blocking and runs the substep in-session.

### Concrete file design

| Layer | Files | Planned edit |
|-------|-------|--------------|
| Fix contract | `.agents/skills/ws-fix-pr/SKILL.md` | Define the batch, split scoring/gate from execution, specify the mutation barrier, gate fields/amendments, role dispatch/fallback, and plan/execute Done-when clauses. |
| Goal loop | `.agents/skills/ws-goal-fix-pr/SKILL.md` | Keep one Act-round call to `ws-fix-pr`; require gate plan evidence plus execute/proactive evidence before resolve/push. |
| Standard orch | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` | List both roles, phase fallbacks, Step 9's single outer dispatch, and orch-owned `--model`/`--substep` telemetry. |
| Lite orch | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Require plan-before-edit per Fix-PR batch while explicitly keeping both phases inline on `currentModel`. |
| Runtime | `.agents/skills/ws-shared/scripts/workflow_state.cjs` | Add both known substeps, map `fixPrPlan` to `reviewerModel` and `fixPrExec` to `executionModel`, and include `substep` in JSONL events so both sequential dispatch records remain observable. Preserve role-before-numeric override order. |
| Config | `.agents/skills/ws-shared/config.schema.json`, `.agents/skills/ws-shared/config.json.example` | Add both role names to descriptions, `stepModels`, and every preset `steps` template. Seed values so default uses `current` and named presets fall through to their reviewer/execution phase values. |
| Tool vocabulary | `.agents/skills/ws-shared/tools.md` | Document role names, resolution chains, Step 9 internal dispatch, non-blocking fallback, and lite exclusion. |
| Configuration interview | `.agents/skills/ws-configure-project/INTERVIEW.md` | Offer `fixPrPlan` and `fixPrExec` beside existing role overrides and explain their phase fallbacks. |
| Evals | `.agents/skills/ws-fix-pr/evals/evals.json`, `.agents/skills/ws-goal-fix-pr/evals/evals.json` | Add plan-barrier/model-role and Act-round evidence scenarios without changing eval-file count. |
| Focused tests | `test/test-models-preset-and-per-step.js`, `test/test-fix-pr-proactive-class-sweep.js` | Exercise resolver/runtime telemetry, plan-before-edit language, goal Done-when evidence, lite behavior, path neutrality, and AUTO_FIX exclusion. |
| Human/harness docs | `README.md`, `FEATURES.md`, `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `docs/index.html` | Describe Step 9/Fix-PR dual substeps, keep consumer/upstream routing aligned, preserve hub byte budget, and update the website stepper/card. |
| Generated integrity | `bin/skill-integrity.json` | Regenerate after all hashed skill content is final. |

Invariant checks from `config.json`:

- `commitPlanFilesOnlyAtStep8: true`: this Step 1 plan remains a workflow artifact and is not staged during implementation.
- `skipQualityGates: false`: focused, harness, integrity, and full package checks remain mandatory.
- Skill paths are edited only in `.agents/skills/ws-*`; consumer-owned config and memory files are not published.

## 3. Step-by-Step Plan

1. **Extend role resolution and telemetry**
   - Edit `.agents/skills/ws-shared/scripts/workflow_state.cjs` to recognize `fixPrPlan` and `fixPrExec`, replace the blanket role-to-execution fallback with explicit role mapping, and serialize `substep` into dispatch/finish JSONL events.
   - Edit `.agents/skills/ws-shared/config.schema.json` and `.agents/skills/ws-shared/config.json.example` so top-level `stepModels` and all preset `steps` templates expose both roles.
   - Engineering checks: role overrides beat numeric Step 9; plan falls back to `reviewerModel`; execute falls back to `executionModel`; `"current"` and empty chains reach session; lite does not consume the role keys; no additional state step is created.

2. **Make `ws-fix-pr` the plan/execute owner**
   - Restructure `.agents/skills/ws-fix-pr/SKILL.md` so sync/fetch/CI/score and gate creation form `fixPrPlan`, while proactive discovery through push form `fixPrExec`.
   - Define one batch as all active threads in the pass; require gate scores, proposed actions, and proactive placeholders before execution.
   - State explicit plan-phase prohibitions for product edits, commits, pushes, and remote resolve mutations.
   - Require execute to read the gate and append an amendment before any behavior that differs from the approved plan.
   - Preserve `COOPERATIVE_FIX.md`, CI baseline triage, verification, post-round self-learning, dry-run, provider delegation, and existing gate location.
   - Do not edit `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`.
   - Engineering checks: search the entire Fix-PR skill tree for alternate score/edit flows, stale single-pass wording, hardcoded consumer paths, and any same-class sibling behavior that bypasses the gate.

3. **Bind goal, standard, and lite orchestration**
   - Update `.agents/skills/ws-goal-fix-pr/SKILL.md` so each Act round invokes one `ws-fix-pr` batch and its Done-when requires plan evidence plus execute/proactive evidence before push/resolve.
   - Update `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` and `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` with internal role dispatch, model recording, and the unchanged single outer Step 9/FSM contract.
   - Update `.agents/skills/ws-spec-to-pr-lite/SKILL.md` so lite Step 5 enforces gate-before-edit while both phases stay sequential on `currentModel`.
   - Engineering checks: standard records `fixPrPlan` then `fixPrExec`; standalone degrades to same-session sequence when dispatch is unavailable; lite never promises a role model switch; goal-loop revision guards and convergence checks remain unchanged.

4. **Synchronize portable configuration surfaces**
   - Update `.agents/skills/ws-shared/tools.md` with the two roles and exact fallback order.
   - Update `.agents/skills/ws-configure-project/INTERVIEW.md` to offer both role keys beside `dag`, `scoreAndRefine`, and `reviewFix`.
   - Keep all prose en-us and host-neutral, use only declared path tokens, and avoid prescribing a product-specific model picker.
   - Engineering checks: repo-wide sibling sweep for every authoritative role list (`KNOWN_SUBSTEPS`, config comments/schema descriptions, presets, interview, tools, STEP-DISPATCH, PROTOCOLS, and lite exclusions) so no list stops at `reviewFix`.

5. **Add eval and focused regression coverage**
   - Extend `.agents/skills/ws-fix-pr/evals/evals.json` with a batch scenario that must write the plan gate under `fixPrPlan`, forbid mutation, then execute under `fixPrExec` with amendment/proactive evidence.
   - Extend `.agents/skills/ws-goal-fix-pr/evals/evals.json` with a multi-thread Act-round scenario proving one shared plan/execute pair and gate evidence before resolve/push.
   - Extend `test/test-models-preset-and-per-step.js` with both template keys, role/phase fallback assertions, empty/session fallback, lite ignore behavior, and a temp-consumer Step 9 dispatch sequence whose JSONL records `fixPrPlan` then `fixPrExec`.
   - Extend `test/test-fix-pr-proactive-class-sweep.js` with named assertion blocks for batch definition, mutation barrier, plan amendment, goal Done-when, lite order, unchanged AUTO_FIX, en-us/neutral tokens, and absence of dual folders/shims.
   - Engineering checks: `test/test-evals-schema.js` remains at 43 eval files because only cases are added inside existing files.

6. **Update upstream documentation and generated artifacts**
   - Update `README.md`, `FEATURES.md`, root `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, and the Fix-PR website description in `docs/index.html`.
   - Keep `.agents/skills/ws-shared/AGENTS.md` concise enough for `test/test-context-budget.js`.
   - Run `node bin/build-site.js` after source documentation edits.
   - Regenerate `bin/skill-integrity.json` only after the complete hashed skill tree is stable.
   - Engineering checks: docs describe two internal roles without implying a new FSM step; package/runtime scans find no host-specific coupling or undeclared path aliases.

7. **Verify the defect class and resistance to regression**
   - Run the focused tests, eval schema, runtime portability, context budget, doc sync, workflow audit, integrity verification, and configured `npm run test`.
   - Perform a repo-wide defect-class sibling sweep for stale role enumerations and any Fix-PR edit/resolve path that can occur before `plan-gate.md`.
   - Because mutation testing is unset, use `.agents/skills/ws-testing/scripts/run_sabotage.py` with a temporary invert patch that removes the Fix-PR plan barrier; prove `node test/test-fix-pr-proactive-class-sweep.js` turns red and that the runner restores the skill file byte-for-byte.
   - Inspect the final diff to prove `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`, provider APIs, consumer `config.json`, and FSM numbering are unchanged.

## 4. Permissions, Tenancy & i18n

- RBAC and tenancy are not applicable to this agent-skill package; no application data access or schema changes are introduced.
- Remote authorization remains delegated to the configured SCM provider's existing `validate-auth`, `list-threads`, and `resolve-thread` intents.
- The plan substep has no permission to edit product files, commit, push, or resolve threads. Those operations remain execute-only and retain dry-run suppression.
- No i18n framework exists. All new skill, eval, test-label, and documentation text must remain en-us.
- Host neutrality is mandatory: use `dispatch-agent`, `user-gate`, `currentModel`, and declared path tokens instead of host product names or private filesystem paths.

## 5. Test Coverage

| AC | Test file and named test case | Expected proof |
|----|-------------------------------|----------------|
| AC1 | `test/test-fix-pr-proactive-class-sweep.js` — assertion block `batch is one pass, not one thread`; `ws-goal-fix-pr` eval `Act round shares one batch` | One plan/execute pair covers all threads fetched in the pass. |
| AC2 | `test/test-fix-pr-proactive-class-sweep.js` — `plan gate precedes product edits` | Gate requires scores, actions, and proactive placeholders before execute language. |
| AC3 | `test/test-fix-pr-proactive-class-sweep.js` — `plan role is mutation-free` | Plan section forbids product edits, commit, push, and `resolve-thread`. |
| AC4 | `test/test-fix-pr-proactive-class-sweep.js` — `execute follows gate and appends amendments` | Execute reads the gate and records amendment before deviating. |
| AC5 | `test/test-models-preset-and-per-step.js` — `fixPr role overrides and Step 9 telemetry` | Temp consumer dispatches `fixPrPlan` then `fixPrExec`; model and substep appear in JSONL/state evidence. |
| AC6 | `test/test-models-preset-and-per-step.js` — `fixPrPlan reviewer fallback`, `fixPrExec execution fallback`, `empty chain uses session`, and static unsupported-host fallback assertions | Exact role → preset → phase → session order and non-blocking fallback. |
| AC7 | `test/test-models-preset-and-per-step.js` — `STEP_TEMPLATE_KEYS` and role-surface assertions | Schema/example presets, `tools.md`, and `STEP-DISPATCH.md` list both roles. |
| AC8 | `test/test-models-preset-and-per-step.js` — `lite ignores fixPr roles`; `test/test-fix-pr-proactive-class-sweep.js` — `lite still plans before edits` | Lite stays on session and preserves artifact order. |
| AC9 | `test/test-fix-pr-proactive-class-sweep.js` — `goal Act Done-when requires plan and execute evidence`; goal eval `gate before push/resolve` | Goal round cannot complete without gate plan fields and proactive execute fields. |
| AC10 | Existing and extended `test/test-fix-pr-proactive-class-sweep.js` — `execute retains CI, proactive sweep, and learning` | Existing baseline triage, `COOPERATIVE_FIX`, and post-round learning remain execute requirements. |
| AC11 | Both focused files above plus `test/test-evals-schema.js` — `no dual contract folder` | Plan-before-edit and role/fallback text are machine-checked; evals remain schema-valid; no shim/folder is introduced. |
| AC12 | `test/test-fix-pr-proactive-class-sweep.js` — `AUTO_FIX excludes dual-model roles`, plus final path-scoped diff check | `AUTO_FIX.md` receives no `fixPrPlan`/`fixPrExec` contract or content change. |
| AC13 | `test/test-runtime-portability.js` plus focused `en-us and declared tokens` assertions | Skill bodies remain en-us, host-neutral, and limited to `{skillsRoot}`, `{sharedDir}`, `{plansDir}`, and `{reviewsDir}` path vocabulary. |

Regression/sabotage case:

- `run_sabotage.py` temporarily removes or reverses the `plan-gate.md`-before-edit contract from `.agents/skills/ws-fix-pr/SKILL.md`.
- `node test/test-fix-pr-proactive-class-sweep.js` must fail under sabotage and pass after automatic restoration.

Verification commands:

```text
node test/test-models-preset-and-per-step.js
node test/test-fix-pr-proactive-class-sweep.js
node test/test-evals-schema.js
node test/test-runtime-portability.js
node test/test-context-budget.js
node test/test-doc-sync.js
python .agents/skills/ws-check-workflows/scripts/check_workflows.py
npm run generate-integrity
npm run verify-integrity
npm run test
```

## 6. Invariants (Do Not Violate)

1. Standard remains FSM steps 0–9 and lite remains steps 0–5; internal Fix-PR roles never enter `completedSteps`.
2. Outer numeric Step 9 dispatch remains one `ws-goal-fix-pr`/`ws-fix-pr` call; role overrides affect only the internal batch substeps.
3. `fixPrPlan` is read/gate-write only. No product edit, commit, push, or remote resolution can precede a complete gate.
4. `fixPrExec` must preserve CI baseline triage, cooperative defect-class sweep, verification, self-learning, dry-run, and provider intent boundaries.
5. `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md` and SCM provider contracts remain unchanged.
6. `.agents/skills/ws-*` is the only authoring SoT. Never edit a global install or commit consumer-owned `.agents/skills/ws-shared/config.json`.
7. Workflow plan artifacts are not committed before Step 8 (`commitPlanFilesOnlyAtStep8: true`).
8. No legacy path alias, duplicate cooperative contract, dual Fix-PR folder, or migration shim is added.
9. Skill prose remains en-us and host-neutral. Runtime paths use declared brace tokens; Markdown links use real relative paths.
10. Hashed skill changes require a regenerated and verified `bin/skill-integrity.json`; hub prose must remain within its context budget.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected.
- [ ] Domain entities and mappings encapsulated. N/A: no domain entity layer.
- [ ] Schema migrations created. N/A: no database.
- [ ] Authorization checks applied. Existing provider `validate-auth` and execute-only remote mutation preserved.
- [ ] i18n keys declared. N/A: en-us-only skill package.
- [ ] Test cases cover all ACs.
- [ ] `fixPrPlan` and `fixPrExec` resolve in role → preset → phase → session order.
- [ ] Plan gate is durable before edits and amendments are recorded before deviations.
- [ ] Goal Act round and standalone `/fix-pr` both use one batch-wide plan/execute pair.
- [ ] Lite remains inline on `currentModel` while enforcing plan-before-edit.
- [ ] `AUTO_FIX.md`, provider contracts, and FSM numbering are unchanged in the final diff.
- [ ] Repo-wide role-list and pre-gate mutation sibling sweeps are clean.
- [ ] Sabotage proof fails under inversion and restores/passes afterward.
- [ ] Focused tests, eval schema, portability, context-budget, doc-sync, workflow audit, integrity, and `npm run test` pass.
- [ ] README, FEATURES, both AGENTS hubs, and website descriptions are synchronized.

## 8. Open Questions

All product-context questions are resolved; no implementation blocker remains.

| Question | Resolution |
|----------|------------|
| What is a batch? | Resolved: one `ws-goal-fix-pr` Act round or one standalone `/fix-pr` run, covering all active threads fetched/scored for that pass. |
| Where do the roles live? | Resolved: inside `ws-fix-pr`. `ws-goal-fix-pr` delegates one Act-round batch; standard Step 9 and lite Step 5 remain one outer dispatch/action. |
| Which keys and fallbacks apply? | Resolved: `fixPrPlan` → `reviewerModel`; `fixPrExec` → `executionModel`, each after top-level and preset role overrides and before session fallback. |
| What happens to numeric `stepModels["9"]`? | Resolved: it continues to select the outer Step 9 skill model; internal role keys override it only for their subdispatches. |
| What is the exact `--substep` spelling? | Resolved: `fixPrPlan` and `fixPrExec`, matching config role keys exactly. |
| What if standalone execution lacks `dispatch-agent`? | Resolved: run plan then execute sequentially in the active session, preserving the gate barrier; show model hints only when supported. |
| Where does the plan artifact live? | Resolved: retain `{skillsRoot}/ws-fix-pr/runs/pr-<PR-ID>/plan-gate.md` as the uncommitted gate artifact; goal-loop revision/blocked state remains under `{plansDir}/{slug}/.runtime`. |
| Does the goal-loop confirmation gate change? | Resolved: no. Auto-yes occurs only after the completed plan gate is written. |
| Does Auto-Fix adopt dual models? | Resolved: no. `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md` is unchanged and remains single-pass. |
