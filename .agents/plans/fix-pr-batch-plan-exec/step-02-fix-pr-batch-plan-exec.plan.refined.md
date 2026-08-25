---
slug: fix-pr-batch-plan-exec
title: "fix-pr: plan substep (reviewer model) then execute (fix model) per batch"
status: active
step: 2
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
sourcePlan: step-01-fix-pr-batch-plan-exec.plan.md
shared_understanding: confirmed
acRefs: []
startedAt: "2026-08-25T16:39:00Z"
endedAt: "2026-08-25T16:55:59.959Z"
---
## 0. Summary & Binding Decisions

Upgrade every cooperative Fix-PR batch from a combined score/plan/edit pass to a durable plan-then-execute sequence. The outer workflow remains standard Step 9 or lite Step 5. `ws-fix-pr` owns the two internal roles so `ws-goal-fix-pr` still invokes one Fix-PR batch per Act round.

Binding decisions:

1. A batch is all active threads fetched and scored in one `ws-goal-fix-pr` Act round, or all active threads in one standalone `/fix-pr` invocation. It is never one model pair per thread.
2. The existing gate remains `{skillsRoot}/ws-fix-pr/runs/pr-<PR-ID>/plan-gate.md`. No successor folder, compatibility alias, or committed plan artifact is introduced.
3. Repository synchronization and dirty-worktree validation occur in the outer `ws-fix-pr` preflight before `fixPrPlan`. This keeps the plan role's only local write equal to `plan-gate.md`.
4. `fixPrPlan` fetches CI/thread evidence, scores and classifies every active thread, names proposed actions, and writes a complete gate before any product or remote mutation.
5. `fixPrExec` validates the gate identity, follows it, and appends a structured amendment before any action that differs from the plan.
6. The execute role retains CI baseline triage, the full cooperative defect-class sweep, verification, post-round self-learning, provider-delegated resolution, commit, and push ordering.
7. Standard/standalone hosts with `dispatch-agent` use reviewer-class resolution for `fixPrPlan` and execution-class resolution for `fixPrExec`. Lite and hosts without dispatch capability execute the same phases inline under `currentModel`.
8. Numeric `stepModels["9"]` and preset `steps["9"]` select only the outer Step 9 skill. Internal Fix-PR roles do not inherit numeric Step 9 values.
9. Internal role dispatches append telemetry but never call `finish --step 9`. The outer orchestrator remains the sole owner of the final Step 9 finish after convergence or a terminal stop.
10. `AUTO_FIX.md`, SCM provider APIs, FSM numbering, completed-step semantics, and historical round reports remain unchanged.

## 1. Definition of Ready, Scope & AC Coverage

Definition of Ready:

- Project config resolves to the Node 22 package, `.agents/skills` is the only local authoring SoT, and `verification.backendTest` is `npm run test`.
- Runtime evidence confirms `workflow_state.cjs` currently recognizes only `dag`, `scoreAndRefine`, and `reviewFix`; every recognized role currently falls back to `executionModel`.
- Runtime evidence also confirms `commonEvent()` omits `substep`, `stepDispatches` retains only the latest row for a numeric step, and `finish --step 9` would complete the outer FSM step.
- Existing Fix-PR evidence confirms `plan-gate.md` is the single cooperative gate and `COOPERATIVE_FIX.md` owns proactive class discovery.
- MEMORY obligations are binding:
  - Sweep the full defect class and every named sibling path; record every skipped hit with path and reason.
  - Preserve nested `telemetry.loc`; do not flatten nested YAML while changing telemetry.
  - Edit and execute local `$PWD/.agents/skills/ws-*` only; never use a global install.
  - Keep `.agents/skills/ws-shared/AGENTS.md` at or below 14000 UTF-8 bytes.

Resolved scope:

- Manual source changes stay under `.agents/skills/ws-*`, `test/`, and required upstream docs.
- Consumer-owned `.agents/skills/ws-shared/config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, and `CHANGELOG.md` are read-only inputs and are not implementation outputs.
- Release-generated version/frontmatter, dependency-version, site, and integrity files are allowed only through the existing release commands.
- No frontend, database, schema migration, tenancy, RBAC, or i18n implementation applies.

AC-to-plan-step coverage:

| AC | Plan step(s) |
|----|--------------|
| AC1 | 2, 3 |
| AC2 | 2, 5 |
| AC3 | 2, 5 |
| AC4 | 2, 5 |
| AC5 | 1, 3, 5 |
| AC6 | 1, 4, 5 |
| AC7 | 1, 4, 5 |
| AC8 | 3, 5 |
| AC9 | 2, 3, 5 |
| AC10 | 2, 3, 5 |
| AC11 | 5, 6 |
| AC12 | 2, 5, 7 |
| AC13 | 2, 3, 4, 6, 7 |

Out of scope:

- New FSM steps, new `completedSteps` entries, per-thread model dispatches, provider intent changes, or skill-boundary merges.
- Dual-model behavior in `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`.
- A new Fix-PR lock service, migration shim, compatibility folder, or rewrite of `{reviewsDir}/PR-*-round-*.md`.
- Changing provider pagination/rate-limit contracts.
- Committing project-local config or plan artifacts before delivery.

## 2. Technical Design & Architecture

### 2.1 Batch lifecycle and mutation barrier

Standard workflow or standalone execution with `dispatch-agent`:

1. The outer caller dispatches Step 9 once under the numeric Step 9 model and calls `ws-goal-fix-pr` or `ws-fix-pr`.
2. `ws-fix-pr` performs preflight synchronization and dirty-worktree validation before either internal role. `git pull` is not part of `fixPrPlan`.
3. The caller captures the active session fallback once, resolves both internal role models from that stable value, and passes the resolved identifiers explicitly to `dispatch-agent` and telemetry. The plan dispatch must not contaminate execute fallback resolution.
4. When orchestrator-owned, append a `dispatch --step 9 --substep fixPrPlan --model <actual-plan-model>` event, then dispatch the plan agent.
5. `fixPrPlan` may read repository/provider evidence but may write only `plan-gate.md`. It cannot edit product files, commit, push, call `resolve-thread`, or complete Step 9.
6. Validate that the gate is complete and matches the target batch. An invalid or stale gate blocks execution and re-runs planning.
7. Append a second `dispatch --step 9 --substep fixPrExec --model <actual-exec-model>` event, then dispatch the execute agent.
8. `fixPrExec` validates the gate, re-checks stale evidence, appends amendments before deviations, performs the class-wide fix, verifies, learns, resolves, commits, and pushes.
9. `ws-goal-fix-pr` may start another Act-round batch if threads/checks remain. No internal batch calls `finish --step 9`.
10. Only the outer orchestrator records the final Step 9 finish after convergence or terminal exit. `completedSteps` receives Step 9 once.

Lite or a host without `dispatch-agent`:

1. Run the same preflight, `fixPrPlan`, gate validation, and `fixPrExec` sequence inline.
2. Stay on `currentModel`; role names are contract labels only and never switch the session.
3. Numeric lite Step 5 telemetry remains outer-step telemetry. `fixPrPlan`/`fixPrExec` role keys are ignored.

### 2.2 Gate identity and amendments

Extend the existing gate rather than create another artifact. Required batch header:

- `batchId`: unique per Act round or standalone invocation.
- `prId`, `scope` (`goal-act-round` or `standalone`), `headSha`, `plannedAt`.
- Exact `activeThreadIds` fetched for the batch.
- Plan status (`planned`, then execute evidence appended by the execute role).

Required per score 6–10 thread:

- `threadId`, `score`, `proposedAction`.
- Reserved `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped`.
- `amendments` list.

Each amendment records `timestamp`, `threadId`, `newFact`, `previousAction`, `revisedAction`, `rationale`, and evidence source. The amendment is appended before the first product edit governed by the revised action.

Execute validation:

- Gate target PR and `batchId` match the handoff.
- `headSha` still matches. A changed HEAD invalidates the gate and returns to planning before edits.
- Thread identity is rechecked. A remotely resolved/changed thread is recorded as an amendment or skip; newly material blocking work requires re-planning rather than silent expansion.

The retained per-PR path means simultaneous same-PR invocations are not fully serialized. `batchId` and `headSha` fail closed on common stale/overwrite cases without adding a new locking subsystem.

### 2.3 Model resolution

| Role | Exact internal resolution order | Phase fallback |
|------|---------------------------------|----------------|
| `fixPrPlan` | top-level `stepModels.fixPrPlan` → active preset `steps.fixPrPlan` → top-level phase key → preset phase key → captured session | `reviewerModel` |
| `fixPrExec` | top-level `stepModels.fixPrExec` → active preset `steps.fixPrExec` → top-level phase key → preset phase key → captured session | `executionModel` |

Rules:

- Internal chains never consult numeric `"9"`; numeric Step 9 remains outer-only.
- `"current"` resolves immediately to the captured session model and stops fallthrough.
- Empty strings fall through.
- Unknown preset behavior remains preset `default` when present, then legacy phase keys.
- An unsupported/rejected configured model retries the role inline under the active session model without aborting the batch; telemetry records the actual fallback model.
- Unknown `--substep` behavior remains non-throwing and does not become a new role.
- Default preset role values use `"current"`; named presets use empty role values so their reviewer/execution phase values remain effective.

### 2.4 Telemetry and state semantics

- Add `fixPrPlan` and `fixPrExec` to `KNOWN_SUBSTEPS`.
- Map `fixPrPlan` to `reviewerModel` and `fixPrExec` to `executionModel`; preserve existing mappings for `dag`, `scoreAndRefine`, and `reviewFix`.
- Add optional `substep` to `commonEvent()` so JSONL retains both ordered internal dispatches even though `state.stepDispatches` intentionally retains only the latest row for numeric Step 9.
- Do not add a new FSM step or a second completion event. Internal roles emit dispatch events only; the existing outer finish remains singular.
- Preserve `telemetry.loc` as a nested mapping and preserve existing `telemetry.steps` YAML object-array serialization.
- Document JSONL as the historical evidence for both internal dispatches; the compact state row is latest-dispatch state, not the historical log.

## 3. Concrete File Design

| Layer | Files | Planned edit |
|-------|-------|--------------|
| Fix contract | `.agents/skills/ws-fix-pr/SKILL.md` | Add outer preflight, batch definition, plan-only mutation barrier, gate schema/identity, amendment rule, role dispatch/fallback, and separate Done-when clauses. Keep `COOPERATIVE_FIX.md` linked as execute authority. |
| Goal loop | `.agents/skills/ws-goal-fix-pr/SKILL.md` | Keep one `ws-fix-pr` call per Act round; require complete plan evidence plus execute/proactive evidence before resolve/push; never finish outer Step 9 per internal batch. |
| Standard orchestration | `.agents/skills/ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md`, `protocols/state-hygiene.md` | Add both roles, exact phase fallbacks, numeric Step 9 outer-only rule, ordered dispatch telemetry, stable session fallback, and one outer finish. |
| Lite orchestration | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Enforce plan-before-edit inline on `currentModel`; explicitly ignore both role keys while preserving numeric Step 5 telemetry. |
| Runtime | `.agents/skills/ws-shared/scripts/workflow_state.cjs` | Add known roles, explicit phase mapping, outer-only numeric Step 9 behavior for internal roles, and JSONL `substep`; preserve nested telemetry and FSM completion semantics. |
| Config | `.agents/skills/ws-shared/config.schema.json`, `config.json.example` | Describe/add both role keys in `stepModels` and every preset `steps` template; default=`current`, named preset roles empty. Do not edit live `config.json`. |
| Tool/configuration docs | `.agents/skills/ws-shared/tools.md`, `.agents/skills/ws-configure-project/INTERVIEW.md`, `.agents/skills/ws-configure-project/SKILL.md` | Add both roles, exact chains, Step 9 exclusion, lite exclusion, fallback behavior, and configurable interview choices. |
| Evals | `.agents/skills/ws-fix-pr/evals/evals.json`, `.agents/skills/ws-goal-fix-pr/evals/evals.json` | Add plan-only barrier, one batch pair, amendment, proactive evidence, and no-early-finish scenarios without changing eval-file count. |
| Focused tests | `test/test-models-preset-and-per-step.js`, `test/test-fix-pr-proactive-class-sweep.js`, `test/test-update-state-yaml.js`, `test/test-telemetry-observability.js` | Exercise resolution, outer-only numeric Step 9, ordered JSONL roles, nested telemetry, gate barrier/identity/amendment, lite behavior, and unchanged Auto-Fix. |
| Human/harness docs | `README.md`, `FEATURES.md`, `AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `docs/index.html` | Describe the two internal roles without implying new FSM steps. Keep the shared hub within 14000 B and regenerate the site. |
| Release-generated | `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/skill-dependencies.json`, SKILL frontmatter versions, `docs/index.html`, `bin/skill-integrity.json` | Run one release patch bump, site generation, dependency-version sync, and final integrity regeneration after manual content is stable. |

Defect-class role-list sweep:

- Search the full repository for `reviewFix`, `KNOWN_SUBSTEPS`, `stepModels`, preset `steps`, `--substep`, and lite ignore lists.
- Update every authoritative runtime/config/skill/document/test occurrence in scope, including `ws-configure-project/SKILL.md` and `state-hygiene.md`, which the draft plan did not explicitly bind.
- Do not edit historical plans, consumer `config.json`, generated changelog history, or unrelated diff artifacts merely because the search finds them.
- Record every intentionally skipped authoritative-looking hit with path and reason in implementation evidence.

## 4. Step-by-Step Implementation Plan

1. **Extend resolver and event telemetry**
   - Add both known roles and explicit role-to-phase mapping in `workflow_state.cjs`.
   - Make internal Fix-PR roles bypass numeric Step 9 fallback.
   - Add optional `substep` to JSONL common events.
   - Preserve latest-only `stepDispatches`, nested `telemetry.loc`, and existing FSM completion behavior.
   - Export/use the existing resolver surface; do not add a second resolver or Python implementation.

2. **Split `ws-fix-pr` into preflight, plan, and execute contracts**
   - Keep sync/dirty validation before the plan role.
   - Define the batch identity and required gate structure.
   - Forbid every local write except the gate during `fixPrPlan`; forbid commit, push, resolve, and Step 9 finish.
   - Require execute gate validation, amendment-before-deviation, and stale-gate re-plan.
   - Keep `COOPERATIVE_FIX.md`, CI baseline triage, dry-run, verification, learning, provider delegation, and gate location.
   - Do not edit `scripts/AUTO_FIX.md`.

3. **Bind goal, standard, and lite orchestration**
   - Make each goal Act round invoke one batch-wide `ws-fix-pr`.
   - Record plan then execute dispatches in JSONL when orchestrator-owned.
   - Keep outer Step 9 as the only owner of `finish`; assert no internal role adds Step 9 to `completedSteps`.
   - Keep standalone fallback sequential and lite inline on `currentModel`.
   - Preserve goal-loop convergence, revision guards, provider checks, and final merge gate.

4. **Synchronize every model/config surface**
   - Update schema/example, presets, tools, configuration interview/skill, standard model docs, state hygiene, and lite exclusion language.
   - Run the role-list sibling sweep and close all same-class authoritative occurrences.
   - Keep skill prose en-us and host-neutral; use only declared path tokens.
   - Run all skill/scripts from `$PWD/.agents/skills`; do not read or modify a global install.

5. **Add focused regression and eval coverage**
   - Resolver tests: role override, preset role, reviewer/execution phase fallback, `"current"`, empty/session fallback, unknown/rejected model contract, and no numeric Step 9 inheritance.
   - State tests: ordered `fixPrPlan` then `fixPrExec` dispatch JSONL, actual model and `substep`, no Step 9 completion after either dispatch, one outer finish, and nested `telemetry.loc` round-trip.
   - Fix contract tests: one batch for multiple threads, preflight placement, gate-before-edit, gate-only plan, batch identity, stale gate, amendment-before-deviation, proactive fields, goal Done-when, and lite order.
   - Auto-Fix proof: snapshot/hash or path-scoped diff confirms `AUTO_FIX.md` content is unchanged and contains no dual-model role contract.
   - Evals remain in existing two files; `test-evals-schema.js` still expects 43 eval files.

6. **Update required docs and release artifacts**
   - Update README, FEATURES, root AGENTS, shared-hub AGENTS, and the existing Fix-PR website step/card.
   - Prefer replacing/shortening shared-hub prose; assert LF-normalized UTF-8 size is at most 14000 B.
   - After manual skill/docs content is stable, run `npm run build-site:bump` exactly once for the release PR. This patch-bumps `package.json`, syncs SKILL frontmatter and dependency package versions, and regenerates the site.
   - Run `node bin/build-site.js --check` after generation.
   - Regenerate `bin/skill-integrity.json` only after all hashed content and version stamps are final.

7. **Verify the whole defect class**
   - Run focused model, Fix-PR, state/YAML, telemetry, eval, portability, context-budget, doc-sync, workflow, integrity, and package tests.
   - Run the repo-wide role-list/pre-gate mutation sibling sweep again against the final tree.
   - Use `run_sabotage.py` with a content-aware temporary inversion that removes the plan barrier. Prove the focused Fix-PR test turns red and the runner restores the target bytes exactly.
   - Inspect the final path-scoped diff to prove Auto-Fix, provider contracts, consumer config, FSM numbering, and unrelated workflow artifacts are unchanged.

## 5. Test Coverage & Verification

| AC | Named proof |
|----|-------------|
| AC1 | Multi-thread goal/standalone fixture produces one plan dispatch and one execute dispatch for the batch. |
| AC2 | Gate completeness assertion precedes any product-edit language/action. |
| AC3 | Plan contract and eval forbid product writes, commit, push, resolve, and finish; only gate write allowed. |
| AC4 | Execute fixture rejects deviation without a prior structured amendment. |
| AC5 | Temp consumer JSONL records ordered role dispatches with actual models and no early completion. |
| AC6 | Resolver tests prove exact role→preset→phase→captured-session chains, `"current"`, and fallback. |
| AC7 | Static role-surface sweep checks schema/example/tools/standard dispatch/configuration surfaces. |
| AC8 | Lite tests prove role keys are ignored, numeric Step 5 stays outer telemetry, and phase order remains plan then execute inline. |
| AC9 | Goal Done-when requires gate plan evidence and execute proactive evidence before resolve/push. |
| AC10 | Existing and extended class-sweep tests retain CI triage, cooperative sweep, and post-round learning. |
| AC11 | Existing eval files gain cases; schema output remains `Validated 43 eval files`. |
| AC12 | Path-scoped diff/hash proves `AUTO_FIX.md` unchanged. |
| AC13 | Runtime portability and static token/language checks remain green. |

Verification commands:

```text
node test/test-models-preset-and-per-step.js
node test/test-fix-pr-proactive-class-sweep.js
node test/test-update-state-yaml.js
node test/test-telemetry-observability.js
node test/test-evals-schema.js
node test/test-runtime-portability.js
node test/test-context-budget.js
node test/test-doc-sync.js
python .agents/skills/ws-check-workflows/scripts/check_workflows.py
node bin/build-site.js --check
npm run generate-integrity
npm run verify-integrity
npm run test
```

Sabotage proof:

- Target only `.agents/skills/ws-fix-pr/SKILL.md`.
- Invert/remove the gate-before-product-edit assertion using a valid temporary patch.
- Require `node test/test-fix-pr-proactive-class-sweep.js` to fail under sabotage.
- Require byte-for-byte restoration and a passing rerun.

## 6. Permissions, Scenario Probes & Invariants

Permissions and security:

- Provider authentication and remote I/O remain delegated to configured SCM intents.
- `fixPrPlan` has no product-write, commit, push, resolve, or FSM-finish permission.
- `fixPrExec` retains dry-run suppression and path-scoped staging.
- No private project names, host paths, or provider secrets enter docs/evals/gates.

Scenario probes:

- Soft deletion, tenancy, database migrations, frontend, and i18n: not applicable.
- Concurrency: gate `batchId`/`headSha` detects common stale overwrite cases; no new lock is introduced.
- Large thread lists: one product-defined batch remains mandatory; durable gate limits cross-agent handoff loss. Provider pagination/rate-limit behavior remains unchanged.
- Provider/thread drift: execute revalidates gate identity and records amendments/skips before mutation.
- Unsupported model: continue inline under captured session and record the actual model.
- Dirty baseline: preflight and existing CI baseline triage remain fail-closed before planning/editing.

Invariants:

1. Standard remains steps 0–9 and lite remains steps 0–5.
2. Outer numeric Step 9 dispatch remains one goal/one-shot call; internal roles are not FSM steps.
3. Numeric Step 9 model configuration is outer-only.
4. Internal role dispatches never finish Step 9.
5. No product or remote mutation precedes a complete, matching gate.
6. The execute role sweeps the entire defect class and records every skip with path and reason.
7. `AUTO_FIX.md` and provider contracts remain unchanged.
8. Author/edit/test only `$PWD/.agents/skills/ws-*`; no global install access.
9. Consumer-owned hub files and pre-Step-8 plan artifacts are not committed.
10. Nested `telemetry.loc` remains a mapping.
11. Shared hub AGENTS stays at or below 14000 B.
12. Skill prose remains en-us, host-neutral, and path-token neutral.

## 7. Pre-Implementation / Pre-PR Checklist

- [ ] Both role chains are exact and exclude numeric Step 9 internally.
- [ ] Preflight sync is outside the gate-only plan role.
- [ ] Gate identity, stale validation, and amendment fields are machine-checked.
- [ ] Two ordered dispatch events exist without an internal Step 9 finish.
- [ ] Goal and standalone use one pair per batch; lite remains inline.
- [ ] Proactive class sweep and post-round learning remain execute requirements.
- [ ] Full role-list sibling sweep is clean or skips are recorded.
- [ ] Nested `telemetry.loc` round-trip passes.
- [ ] `AUTO_FIX.md`, provider APIs, and FSM numbering are unchanged.
- [ ] Shared-hub AGENTS is at most 14000 B.
- [ ] Release patch bump ran once; site/dependency versions align.
- [ ] Integrity was regenerated after final hashed content.
- [ ] Focused, sabotage, workflow, integrity, and full package tests pass.

## 8. Closed Decisions

No implementation-blocking question remains.

| Decision | Resolution | Source |
|----------|------------|--------|
| Batch boundary | One goal Act round or one standalone invocation; all active threads in that pass share one pair. | Context Q1-A |
| Dispatch owner | `ws-fix-pr` owns internal roles; goal calls one batch and outer Step 9 stays one dispatch/FSM step. | Context Q2-A + current skill boundaries |
| Model keys | `fixPrPlan`→reviewer and `fixPrExec`→execution after exact role/preset overrides. | Context Q3-A |
| Numeric Step 9 | Outer skill only; never an internal role fallback. | Context Q3-A + AC6 |
| Auto-Fix | Unchanged and single-pass. | Context Q4-A |
| Gate path | Keep existing per-PR `plan-gate.md`. | Spec A1 |
| No dispatch capability | Sequential same-session plan then execute. | Spec Q2 |
| Mutation-free planning | Sync/dirty preflight runs before `fixPrPlan`; gate is the plan role's only local write. | AC3 + current Step 1 |
| Telemetry completion | Two role dispatch events; no internal finish; one outer Step 9 finish. | FSM invariant + runtime evidence |
| Gate staleness | Validate `batchId`, PR, thread set, and `headSha`; stale gate re-plans. | model-inferred safety default |
| Release handling | One `build-site:bump`, then final integrity regeneration. | CATALOG upstream workflow |

## Interview Registry

| id | class | section | gap | status | resolution | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|--------|------------|------------------|----------|-----------|
| G1 | blocking | §0 / AC1 | Goal vs Fix-PR could each own the two dispatches and duplicate work. | closed | `ws-fix-pr` owns one internal pair; goal invokes one batch per Act round. | project | Context Q2-A; current goal Step 3 delegates one `ws-fix-pr`; current outer Step 9 dispatches goal/one-shot once. | |
| G2 | blocking | §2 / AC3 | Draft put `git pull` inside a gate-only plan role, contradicting “gate writes only.” | closed | Move sync/dirty validation to outer batch preflight before `fixPrPlan`. | project | Current `ws-fix-pr` Step 1 sync; spec AC3 gate-only plan mutation. | G1 |
| G3 | blocking | §2.3 / AC6 | Current resolver lets a role with no role override inherit numeric Step 9, but context reserves numeric 9 for the outer skill. | closed | Internal Fix-PR roles skip numeric Step 9 and use exact role→preset role→phase→session chains. | project | Context Q3-A; spec AC6; `resolveStepOverride()` currently falls through to numeric step keys. | G1 |
| G4 | blocking | §2.4 / FSM | Calling `finish --step 9` after planning would complete the outer FSM step before execute/convergence. | closed | Internal roles emit ordered dispatch events only; outer orchestrator alone finishes Step 9 once. | project | `performUpdate()` finish mutates completed steps; outer Step 9 owns convergence. | G1 |
| G5 | blocking | §2.4 / AC5 | JSONL common events currently lose `substep`, and state keeps only the latest dispatch row. | closed | Add optional event `substep`; use JSONL as ordered history and retain latest-only compact state semantics. | project | `commonEvent()` fields; `stepDispatches` filters by numeric step; per-step JSONL is append-only. | G4 |
| G6 | blocking | §2.3 / AC6 | First role dispatch can change recorded `currentModel` and contaminate the execute session fallback. | closed | Capture session fallback and resolve both role models before role telemetry mutation; pass actual model explicitly. | model-inferred | Current `dispatch` assigns `state.currentModel`; AC6 requires session fallback. | G3 |
| G7 | non-blocking | §3 / defect sweep | Draft omitted authoritative role lists in configure-project SKILL and state-hygiene. | closed | Sweep every `reviewFix`/role-list occurrence and update all authoritative surfaces; record intentional skips. | project | Repo search found `.agents/skills/ws-configure-project/SKILL.md` and `ws-spec-to-pr/protocols/state-hygiene.md`. | G3 |
| G8 | non-blocking | §2.2 / concurrency | A per-PR gate can be stale or overwritten between separate plan/execute agents. | closed | Add batch/HEAD/thread identity and fail closed to re-plan on mismatch; do not add a lock. | model-inferred | Existing gate path is shared per PR; spec requires durable handoff. | G2 |
| G9 | blocking | §2.4 / MEMORY | Telemetry edits risk flattening nested `telemetry.loc`. | closed | Keep nested parser/serializer untouched and add a two-role round-trip regression in `test-update-state-yaml.js`. | project | MEMORY “Node frontmatter must keep nested telemetry.loc”; current nested state tests. | G5 |
| G10 | non-blocking | §6 / scenario probes | Large batches, provider limits, and thread drift were unspecified. | closed | Keep provider pagination/rate behavior, use one durable batch, and revalidate gate/thread identity before execute. | assumed-default | Context Q1-A fixes one batch; provider APIs are out of scope. | G8 |
| G11 | blocking | §3 / local SoT | Duplicate/global skill paths could redirect implementation away from source-of-truth. | closed | Read/edit/run only `$PWD/.agents/skills/ws-*`; never use the global install. | project | MEMORY “Local skills only — no global install”; root AGENTS authoring SoT. | |
| G12 | non-blocking | §6 / hub docs | Required hub documentation can exceed the consumer context budget. | closed | Replace/shorten prose and assert shared AGENTS ≤14000 B. | project | MEMORY and `test/test-context-budget.js` exact 14000 B assertion. | G7 |
| G13 | non-blocking | §4 / release | Draft used catalog-only site generation and omitted the mandatory release patch bump. | closed | Run `npm run build-site:bump` once after manual content stabilizes, then regenerate integrity. | project | CATALOG upstream workflow rows 2–3 and version-bump detail. | G7 |

## Notes

- `shared_understanding: confirmed` under autoMode; no user-gate is required.
- Residual risk: truly simultaneous standalone runs against the same PR are not atomically locked. Batch/HEAD validation catches common stale cases, but a narrow post-validation race remains.
- Residual risk: model rejection semantics are host capability behavior; repository tests can prove resolver/fallback contracts and static retry language, not every host implementation.
- Residual risk: very large active-thread sets may pressure one agent context. The product decision still requires one batch; the gate is the durable handoff and no automatic clustering is introduced.
- Release risk: `build-site:bump` updates all skill frontmatter versions. Run it once, review the generated-only diff, and regenerate integrity afterward.
