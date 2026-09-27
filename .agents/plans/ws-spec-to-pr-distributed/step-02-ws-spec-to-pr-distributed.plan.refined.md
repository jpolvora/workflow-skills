---
slug: ws-spec-to-pr-distributed
title: Separate the multi-CLI step baton into a dedicated ws-spec-to-pr-distributed workflow
status: completed
step: 2
workflowId: ws-spec-to-pr-distributed
startedAt: "2026-09-27T13:04:18.392Z"
endedAt: "2026-09-27T13:04:18.392Z"
acRefs: []
---
## 0. Summary & Business Rules

Extract the shipped step-level baton / multi-CLI capability out of `ws-spec-to-pr` into a new packaged workflow skill `ws-spec-to-pr-distributed`. Behavior-preserving extraction: the standard 0–9 FSM, step skills, artifact names, gate vocabulary, and model routing stay owned by `ws-spec-to-pr` / `ws-shared/runtime`. The distributed workflow owns the execution layer — runner mapping/validation, the deterministic coordinator loop, baton claim/release/expiry, one-shot worker spawn, and coordinator gate surfacing.

Business rules: one owner per capability surface; baton config keys keep their names/location (`defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton`); `step_baton.cjs` stays a shared primitive; invocation is explicit opt-in; harness neutrality (opaque runner ids, no host product as contract term).

Refinements from the Step 2 interview are folded in below: T01 cross-links `WORKER-TURN-RULES.md` instead of copying it; T05 documents the `step_baton.cjs` `require` in the reference (manifests track skill ids); T07 adds an isolated `simulateDistributedWorkflow()`; AC3 byte-size assert records both sizes.

### Design Intent

The feature shipped in PR #350 as a mode of `ws-spec-to-pr`, hardened by #354/#377. This is a modification/extraction, not a bugfix. The constraint to keep: the workflow state file remains the only turn signal (no side-channel/IPC bus).

## 1. Definition of Ready & Scope

Acceptance criteria AC1–AC17 and negative scenarios NS1–NS6 (see `ac-ledger.json` and `step-00`).

Out of scope: baton protocol/telemetry/worker contract redesign; lite distributed variant; renaming config keys; auto-selection; multi-machine queues/IPC.

## 2. Technical Design & Architecture

Stack id `node-skills-package` (Node 22, JavaScript). Layers: skills-sot `.agents/skills`, installer-cli `bin`, tests `test/`.

New skill layout:

- `.agents/skills/ws-spec-to-pr-distributed/SKILL.md` — frontmatter `name`, `description`, `disable-model-invocation: true`, `invocation_names`.
- `.agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs` — moved.
- `.agents/skills/ws-spec-to-pr-distributed/references/coordinator.md` — re-homed baton prose + `step_baton.cjs` require edge.
- The skill links `../ws-spec-to-pr/WORKER-TURN-RULES.md` (no copy).

Dependency graph (both manifests): add `ws-spec-to-pr-distributed` to `packages.workflows.skills` and a `dependencies` entry equal to the `ws-spec-to-pr` dependency set.

Prose ownership: `host-dispatch.md` §7 and `gates.md` coordinator note become cross-references; `ws-shared/runtime/AGENTS.md` baton paragraph becomes a pointer; `ws-spec-to-pr/SKILL.md` section becomes a ≤2-line pointer.

`ws-check-workflows`: additive `simulateDistributedWorkflow()`; existing three simulations unchanged; unknown ids still fail closed.

## 3. Step-by-Step Plan

### T01 — Create the distributed skill body (AC1, AC6, AC10)

Write `.agents/skills/ws-spec-to-pr-distributed/SKILL.md` with valid frontmatter and `invocation_names`. Body describes the distributed layer over the shared 0–9 FSM, delegation to shared step skills, explicit opt-in, config validation before Step 0, and cross-links to the coordinator reference and `../ws-spec-to-pr/WORKER-TURN-RULES.md`. Do not fork step numbering/artifact names.

### T02 — Move the coordinator (AC2)

`git mv` `step_coordinator.cjs` to the distributed scripts dir; verify its `step_baton.cjs` `require` resolves to `{skillsRoot}/ws-shared/runtime/scripts/`. No `ws-spec-to-pr` script owns the run loop.

### T03 — Re-home baton prose (AC4, AC15)

Create the coordinator reference with the §7 content and gates note. Replace shared-runtime sections with cross-references.

### T04 — Slim `ws-spec-to-pr/SKILL.md` (AC3, AC9)

Remove the baton section body; leave a ≤2-line pointer. Assert strictly smaller byte size. No coordinator invocation or runner keys remain.

### T05 — Register the skill in both manifests (AC1, AC5, AC16)

Add the skill to `packages.workflows.skills` and `dependencies` in both manifests. Document the shared `step_baton.cjs` edge in the coordinator reference (manifests track skill ids, not scripts).

### T06 — Update moved tests and fixtures (AC11)

Point `test-step-coordinator.js`, `test-step-baton-config.js`, `test-step-baton-telemetry.js`, `test-step-baton-monitor.js`, `test-step-baton-specmemo.js`, `test-code-review-round-2.js`, `test-worker-turn-guard.js` at the new coordinator path; update the docs-mirror assertions in `test-step-baton-config.js`. `test/test-suites.json` filenames are unchanged.

### T07 — Extend the workflows registry (AC13)

Add an isolated `simulateDistributedWorkflow()` to `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs`; report it additively; keep unknown-id fail-closed.

### T08 — Docs + router + site sync (AC14, AC15)

Update root `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `FEATURES.md`, `CATALOG.md`, `.agents/skills/ws-shared/runtime/autoload.md`, `docs/llms.txt`, `bin/build-site.js`, and the wiki source `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md`. Rebuild the site.

### T09 — Version bump + integrity (AC12, AC14)

One `npm run build-site:bump` (0.5.3 → 0.5.4); then `npm run generate-integrity` + `npm run verify-integrity` after the last hashed edit. Run `npm run test`, `node test/test-harness-clean.js`, `ws-check-harness`.

## 4. Permissions, Tenancy & i18n

No RBAC, tenancy, or i18n surface. All product-stack invariants false except `commitPlanFilesOnlyAtStep8`.

## 5. Test Coverage

| AC / NS | Step | Test |
|---------|------|------|
| AC1 | T01, T05 | frontmatter + manifest membership (`node test/test-step-baton-config.js`, harness membership) |
| AC2 | T02 | `Test-Path` old path false / new path true |
| AC3 | T04 | byte-size comparison + `rg` clean |
| AC4 | T03 | `rg` shared runtime cross-reference only |
| AC5 | T05 | `step_baton.cjs` stays under shared runtime |
| AC6 | T01 | skill body references shared 0–9 step skills |
| AC7 | T01, T02 | `test-step-baton-claim.js`, `test-step-coordinator.js` semantics unchanged |
| AC8 | T02 | `test-step-baton-config.js` fail-fast codes |
| AC9 | T04 | docs-mirror asserts standard has no runner config |
| AC10 | T01, T08 | opt-in marking; no auto-select |
| AC11 | T06 | six baton suites + fixtures pass |
| AC12 | T09 | `npm run verify-integrity`, `test/test-harness-clean.js` 0 findings |
| AC13 | T07 | `ws-check-workflows` run |
| AC14 | T08, T09 | version + docs sync |
| AC15 | T03, T08 | no live old-path reference |
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

Touched boundaries:

- Authorization/endpoint: not touched.
- Concurrency/async: coordinator child-process spawn + claim/release unchanged → `node test/test-step-coordinator.js`, `node test/test-step-baton-claim.js`.
- Input validation: `step_baton.cjs` fail-closed validation → `node test/test-step-baton-config.js`.
- Node-only runtime + link integrity → `ws-check-harness`, `node test/test-harness-clean.js`.
- Integrity/version → `npm run verify-integrity`.

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
- [ ] Stage only files this work touched.

## 8. Open Questions

None blocking (interview resolved the three gaps: manifest edge for a shared script, worker-turn-rules duplication, workflows report contract).
