---
superseded: true
supersededBy: step-02-ws-spec-to-pr-distributed.plan.refined.md
slug: ws-spec-to-pr-distributed
title: Separate the multi-CLI step baton into a dedicated ws-spec-to-pr-distributed workflow
status: completed
step: 1
workflowId: ws-spec-to-pr-distributed
startedAt: "2026-09-27T13:04:18.392Z"
endedAt: "2026-09-27T13:04:18.392Z"
acRefs: []
---
## 0. Summary & Business Rules

Extract the shipped step-level baton / multi-CLI capability out of `ws-spec-to-pr` into a new packaged workflow skill `ws-spec-to-pr-distributed`. The extraction is behavior-preserving: the standard 0–9 FSM, step skills, artifact names, gate vocabulary, and model routing stay owned by `ws-spec-to-pr` / `ws-shared/runtime`. The distributed workflow owns only the execution layer — runner mapping/validation, the deterministic coordinator loop, baton claim/release/expiry, one-shot worker spawn, and coordinator gate surfacing.

Business rules:

- Exactly one owner per capability surface. After this change the coordinator script and its prose live only in `ws-spec-to-pr-distributed`; `ws-spec-to-pr` references the new skill at most through a two-line neutral pointer.
- The baton config keys `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` keep their names and location; only their reader changes. No consumer migration.
- `step_baton.cjs` stays a neutral shared primitive under `ws-shared/runtime/scripts/`; the dependency edge is recorded in both manifests.
- Invocation is explicit opt-in (`/spec-to-pr-distributed` or the skill id). No classifier/router auto-selects it.
- Harness neutrality: runner ids stay opaque strings; no host product name becomes a contract term.

### Design Intent

`git log` archaeology is recorded in the spec `## Original Issue Context` (the feature shipped in PR #350 as a mode of `ws-spec-to-pr`; hardened by #354/#377). This is a modification/extraction, not a bugfix; no behavior restoration is required. The constraint to keep: the workflow state file remains the only turn signal (no side-channel/IPC bus).

## 1. Definition of Ready & Scope

Acceptance criteria (from `step-00`): AC1–AC17 (see `ac-ledger.json`). Negative scenarios NS1–NS6.

Critical AC being delivered this run:

- AC1: new packaged skill with valid frontmatter + `invocation_names`, registered in both dependency manifests under `workflows` with an explicit `dependencies` entry.
- AC2: coordinator at `ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`; none under `ws-spec-to-pr/scripts/`.
- AC3: `ws-spec-to-pr/SKILL.md` drops the baton config/coordinator prose to a ≤2-line pointer and is strictly smaller.
- AC4: baton prose re-homed out of `host-dispatch.md` §7 and `gates.md` coordinator note (cross-reference only).
- AC5: `step_baton.cjs` stays shared; only the distributed skill requires it.
- AC6–AC9: parity/behavior/tests — distributed runs the shared 0–9 set; standard ignores runner keys.
- AC10: explicit opt-in routing.
- AC11–AC13: tests, harness, workflows registry.
- AC14–AC16: version bump + docs/router sync + dependency graph.
- AC17: PR carries `Closes #438`.

Out of scope: baton protocol/telemetry/worker contract redesign; lite distributed variant; renaming config keys; auto-selection; multi-machine queues/IPC.

Negative scenarios: NS1 stale old-path reference; NS2 standard ignores runner config; NS3 fail-fast config refusal; NS4 protocol-violation without advance; NS5 resolver fails closed; NS6 unknown workflow id fails closed.

## 2. Technical Design & Architecture

Stack id `node-skills-package` (Node 22, JavaScript). Layers: skills-sot `.agents/skills`, installer-cli `bin`, tests `test/`.

New skill layout:

- `.agents/skills/ws-spec-to-pr-distributed/SKILL.md` — frontmatter `name`, `description`, `disable-model-invocation: true`, `invocation_names: [spec-to-pr-distributed, ws-spec-to-pr-distributed]`.
- `.agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs` — moved verbatim from `ws-spec-to-pr/scripts/`.
- `.agents/skills/ws-spec-to-pr-distributed/references/coordinator.md` — re-homed baton prose (worker spawn vocabulary, gates surfacing, liveness/turn signal).
- `.agents/skills/ws-spec-to-pr-distributed/references/WORKER-TURN-RULES.md` — copy or cross-link of the shared worker-turn rules (worker obligations unchanged); to avoid duplicating canonical text, the skill links to `../ws-spec-to-pr/WORKER-TURN-RULES.md` instead of copying.

Dependency graph: `dependencies["ws-spec-to-pr-distributed"]` = `["ws-spec-to-pr","ws-spec-write","ws-plan-write","ws-plan-interview","ws-plan-to-tasks","ws-implement-tasks","ws-plan-verify","ws-code-review","ws-testing","ws-ship-pr","ws-fix-pr","ws-goal-fix-pr","ws-spec-provider-github","ws-spec-provider-azure-devops","ws-spec-provider-local","ws-check-harness","ws-check-workflows","ws-tdah","ws-spec-format","ws-goal-loop","ws-self-learning","ws-changelog","ws-configure-project","ws-spec-index","ws-wiki","ws-senior-developer"]`. Add `ws-spec-to-pr-distributed` to `packages.workflows.skills`.

Prose ownership:

- `ws-shared/runtime/host-dispatch.md` §7 → kept as a short cross-reference pointer to the distributed skill reference; the baton vocabulary line moves there.
- `ws-shared/runtime/gates.md` "Coordinator gate surfacing (step baton)" → replaced by a one-line cross-reference.
- `ws-shared/runtime/AGENTS.md` baton paragraph → pointer to the new skill.
- `ws-spec-to-pr/SKILL.md` § "Step-level baton runs (multi-CLI)" → ≤2 lines pointing to `ws-spec-to-pr-distributed`.

`ws-check-workflows`: add a `simulateDistributedWorkflow()` that reuses the standard step set from the distributed skill body, and register the id so unknown ids still fail closed.

Memory traps applied: stage only `files_touched` (never `git add -A`, never `{plansDir}` before Step 8); regenerate integrity only after the last hashed-file edit; `ws-shared/version.json` is the canonical version (bump once); CRLF-safe single-line edit anchors.

## 3. Step-by-Step Plan

### T01 — Create the distributed skill body (AC1, AC6, AC10)

Write `.agents/skills/ws-spec-to-pr-distributed/SKILL.md`: frontmatter with `name: ws-spec-to-pr-distributed`, a description naming "distributed / multi-CLI step baton", `disable-model-invocation: true`, `invocation_names`. Body: the distributed layer over the shared 0–9 FSM; delegates to the shared step skills; explicit opt-in; config validation before Step 0; cross-links to the coordinator reference. Do not fork step numbering or artifact names.

### T02 — Move the coordinator (AC2)

`git mv .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs .agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`. Fix its internal relative `require` paths to `ws-shared/runtime/scripts/step_baton.cjs` (already hub-resolved; verify). No other `ws-spec-to-pr` script may own the run loop.

### T03 — Re-home baton prose (AC4, AC15)

Create `.agents/skills/ws-spec-to-pr-distributed/references/coordinator.md` carrying the §7 host-dispatch content (turn signal, liveness/no-mid-batch-ping, worker spawn vocabulary, worker contract, gates) and the gates coordinator-surfacing note. Replace the shared-runtime sections with cross-references.

### T04 — Slim `ws-spec-to-pr/SKILL.md` (AC3, AC9)

Remove the § "Step-level baton runs (multi-CLI)" body; leave at most a two-line neutral pointer to `ws-spec-to-pr-distributed`. Assert the file byte size is strictly smaller than before. `ws-spec-to-pr` must not mention coordinator invocation or the runner keys.

### T05 — Register the skill in both manifests (AC1, AC5, AC16)

Add `ws-spec-to-pr-distributed` to `packages.workflows.skills` and to `dependencies` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json` (identical edits). Record the shared `step_baton.cjs` edge via the distributed skill's dependency on the shared runtime (documented in the reference; manifests track skill ids).

### T06 — Update moved tests and fixtures (AC11)

Point `test-step-coordinator.js`, `test-step-baton-config.js`, `test-step-baton-telemetry.js`, `test-step-baton-monitor.js`, `test-step-baton-specmemo.js`, `test-code-review-round-2.js`, `test-worker-turn-guard.js` at `ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`; update the docs-mirror assertions in `test-step-baton-config.js` to the new ownership. Update `test/test-suites.json` if paths change (they do not — test filenames are unchanged).

### T07 — Extend the workflows registry (AC13)

Add `simulateDistributedWorkflow()` to `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`; report it in the simulation summary; keep unknown-id fail-closed behavior.

### T08 — Docs + router + site sync (AC14, AC15)

Update root `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `FEATURES.md`, `CATALOG.md`, `.agents/skills/ws-shared/runtime/autoload.md`, `docs/llms.txt`, `bin/build-site.js` role card, and the wiki source `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md`. Rebuild the site.

### T09 — Version bump + integrity (AC12, AC14)

One `npm run build-site:bump` (0.5.3 → 0.5.4) as the only bump; then `npm run generate-integrity` and `npm run verify-integrity` after the last hashed edit. Run `npm run test`, `node test/test-harness-clean.js`, and `ws-check-harness`.

## 4. Permissions, Tenancy & i18n

No RBAC, tenant isolation, or i18n surface. `domain.tenancyField` empty; `frontend.i18n.framework` `none`. All product-stack invariants false except `commitPlanFilesOnlyAtStep8`. This diff touches skill prose, Node scripts, tests, and docs only.

## 5. Test Coverage

| AC / NS | Step | Test |
|---------|------|------|
| AC1 | T01, T05 | frontmatter + manifest membership check (`node test/test-step-baton-config.js`, harness membership) |
| AC2 | T02 | `Test-Path ws-spec-to-pr/scripts/step_coordinator.cjs` false; `Test-Path ws-spec-to-pr-distributed/scripts/step_coordinator.cjs` true |
| AC3 | T04 | byte-size comparison + `rg` no `stepRunners`/`stepBaton`/coordinator invocation in `ws-spec-to-pr` |
| AC4 | T03 | `rg` shared runtime files carry only cross-reference |
| AC5 | T05 | `step_baton.cjs` remains under `ws-shared/runtime/scripts` |
| AC6 | T01 | skill body references the shared 0–9 step skills |
| AC7 | T01, T02 | `test-step-baton-claim.js`, `test-step-coordinator.js` unchanged semantics |
| AC8 | T02 | `test-step-baton-config.js` fail-fast codes |
| AC9 | T04 | `test-step-baton-config.js` docs-mirror asserts standard has no runner config |
| AC10 | T01, T08 | skill marked opt-in; router does not auto-select |
| AC11 | T06 | six baton suites + fixtures pass |
| AC12 | T09 | `npm run verify-integrity`, `test/test-harness-clean.js` 0 findings |
| AC13 | T07 | `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` |
| AC14 | T08, T09 | version bump + docs sync |
| AC15 | T03, T08 | `rg "ws-spec-to-pr/scripts/step_coordinator"` no live hits |
| AC16 | T05 | dependency graph complete |
| AC17 | ship | `ensure_pr_closer.cjs --id 438` |
| NS1 | T03, T08 | no stale old-path reference |
| NS2 | T04 | standard ignores runner keys |
| NS3 | T02 | named config errors before Step 0 |
| NS4 | T02 | protocol violation without advance |
| NS5 | T02 | resolver fail-closed |
| NS6 | T07 | unknown workflow id fails closed |

## 6. Stack & Security Invariants Verification Plan

`config.json` invariants: `entitiesAreClassNotRecord` false, `migrationsCliOnly` false, `tenancyViaGlobalQueryFilters` false, `efOnlyInInfrastructure` false, `noInlineHandWrittenMigrations` false, `commitPlanFilesOnlyAtStep8` true, `skipQualityGates` false.

Touched framework boundaries:

- Authorization/endpoint protection: not touched. No route guards or attributes.
- Concurrency/async safety: the coordinator spawns child processes and drives claim/release; behavior must be unchanged. Check: `node test/test-step-coordinator.js` (claim/release/expiry) and `node test/test-step-baton-claim.js`.
- Input validation boundary: runner config validation (`step_baton.cjs` `validateRunConfig`) fails closed on unknown step key, unknown runner id, empty command, invalid timeout. Check: `node test/test-step-baton-config.js`.
- Node-only runtime: moved/copied scripts are CommonJS `.cjs`; no `.py` under `.agents/skills/` or `bin/`. Check: `ws-check-harness` Python critical + `test/test-harness-clean.js`.
- Path/link integrity: no dangling link to the old coordinator path. Check: `ws-check-harness` link check + `node test/test-harness-clean.js`.
- Integrity/version: `npm run verify-integrity` exit 0.

## 7. Pre-PR Checklist

- [ ] New skill folder present with coordinator script and references.
- [ ] Old coordinator path removed.
- [ ] `ws-spec-to-pr/SKILL.md` strictly smaller, pointer only.
- [ ] Both manifests register the new skill under `workflows` with dependencies.
- [ ] Baton suites point at the new path and pass.
- [ ] `ws-check-workflows` recognizes the new id.
- [ ] Docs/router/site/wiki synced.
- [ ] One version bump; integrity regenerated and verified.
- [ ] `npm run test`, `test/test-harness-clean.js`, `ws-check-harness` clean.
- [ ] Stage only files this work touched (never `git add -A`, never `{plansDir}` before Step 8).

## 8. Open Questions

None blocking. The distributed skill links to the existing `WORKER-TURN-RULES.md` rather than duplicating it, to keep one canonical copy. The `ws-spec-to-pr-distributed` dependency list reuses the `ws-spec-to-pr` dependency set so the shared step skills remain the single source of step behavior.
