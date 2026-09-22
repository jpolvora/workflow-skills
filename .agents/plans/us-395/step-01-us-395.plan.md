---
superseded: true
supersededBy: step-02-us-395.plan.refined.md
slug: us-395
title: "[ws-monitor] Terminal-state workflows stay active; batch queue keeps stale/superseded rows"
status: completed
step: 1
workflowId: us-395-20260922T080709Z
startedAt: "2026-09-22T13:07:15.222Z"
endedAt: "2026-09-22T13:07:15.222Z"
acRefs: []
---
# Implementation Plan — us-395

## 0. Summary & Business Rules

Close the observer-contract violation where finished work still reports as live. Three complementary hardening points, each independently verifiable:

1. **Close propagation** — the state writer must write a terminal `status` + `endedAt` whenever the pipeline's terminal step coverage is complete, never gated on telemetry presence; the batch parent-child handoff must propagate.
2. **Queue lineage hygiene** — a superseding `ws-spec-multi` run retires the run it names; rows transition in place (extends the merged #393 keyed-row contract).
3. **Observation** — `ws-monitor` gains `terminal-run-active` and `stale-parent-row` findings so the class cannot stay green.

Business rule: a consumer polling `status == active` must never wait on finished work; at most one batch runner is `active` per lineage and at most one item is `in_progress` per slug.

## 1. Definition of Ready & Scope

- Spec of record: `.agents/specs/0121-us-395.spec.md` (authoring validate PASS, 9 ACs). Workflow copy: `.agents/plans/us-395/step-00-us-395.spec.md`.
- Builds on merged #393 (`939ef310`, in-place queue row keying). Do **not** re-implement row keying.
- Out of scope: state-schema redesign, historical backfill, child artifact persistence (#388), the `missing-artifact`/`context-mismatch` background clusters, changing the sequential model.

## 2. Technical Design & Architecture

Layers (`.ws/config.json` → `stack.backend.layers`):

| Layer | Path | Edit |
|-------|------|------|
| skills-sot | `.agents/skills` | `ws-monitor` script + SKILL, `ws-spec-multi` STATE/SKILL/PROTOCOL + evals, `ws-shared` runtime state writer |
| tests | `test` | new monitor fixture test + terminal-close test + suite registration |

No `.py`. Node-only runtime. No config-schema/GUI change (no `config.json` key touched), so `Edit-WorkflowSkillsConfig.ps1` stays in sync untouched.

**Design decisions:**

- **Writer close (AC1/AC8):** extend `applyCloseAndShipStatus` in `ws-shared/runtime/scripts/workflow_state.cjs` with a terminal-shape guard: when steps `0..CLOSE_STEP[pipeline]` are all terminal (`completed`/`skipped`), write `status: completed` + `endedAt` unconditionally. Idempotent: never rewrite an already-terminal run, never regress `endedAt`. Independent of telemetry.
- **Monitor terminal shape (AC2/AC7):** a `terminalShape(state)` helper treats a run as terminal-shaped when every step up to the pipeline close step has a terminal `stepStatus` (or is in `completedSteps`/`skippedSteps`). When the raw status is active-ish and `endedAt` is null, emit `terminal-run-active` and derive the reported status to a terminal value so `activeCount` drops.
- **Monitor stale parent row (AC6):** in `classifyMultiSpecWorkflow`, a terminal run (`completed`/`cancelled`/`superseded`) that still holds non-terminal rows emits `stale-parent-row` (Case 3 phantom rows). A snapshot post-pass emits the same code for an `in_progress` row whose child workflow (same slug) is terminal (Case 4), and for a run whose `in_progress` slug is also claimed by a newer active run (Case 2 supersede-never-retires).
- **Queue lineage (AC3/AC4/AC5/AC8):** `ws-spec-multi` contract docs — the superseding run writes the superseded run's terminal `status` (`cancelled`/`superseded`); the parent row transition + parent `updatedAt` advance on child terminal. Extends #393, no new script (writer is agent-owned per STATE.md).

## 3. Step-by-Step Plan

1. **State writer close** — `workflow_state.cjs`: add `isTerminalShape` + `TERMINAL_RUN_STATUSES`, call from `applyCloseAndShipStatus`; pass `maxStep`/close coverage. Defect-class sibling sweep: check the lite `CLOSE_STEP` and the internal-substep path (`scoreAndRefine`/`reviewFix`) still keep the step `active` so a substep never closes early.
2. **Monitor findings** — `monitor_snapshot.cjs`: `terminalShape`, `terminalRunActive` finding, extend `classifyMultiSpecWorkflow`, add `detectStaleParentRows` post-pass in `snapshot()`, export helpers.
3. **Monitor docs** — `ws-monitor/SKILL.md` queue signals + signal map rows; `ws-monitor/evals/evals.json` cases.
4. **Multi-spec docs** — `ws-spec-multi/STATE.md`, `SKILL.md`, `PROTOCOL.md`: supersede retirement, handoff propagation, idempotency; `evals.json` case.
5. **Tests** — `test/test-ws-monitor-us395.js` (finding codes + live-specimen shapes + no-terminal-run-active assertion); `test/test-terminal-close-us395.js` (writer close, telemetry-absent, idempotent); register both in `test/test-suites.json` `harnessEfficiency`.
6. **Release mechanics** — `npm run generate-integrity` + `npm run verify-integrity`; `npm run build-site:bump`; docs sync (`README.md`, root `AGENTS.md`, `.ws/AGENTS.md`, `FEATURES.md`) only where user-facing.

## 4. Permissions, Tenancy & i18n

N/A (package harness, no RBAC/tenancy/i18n surface). Skill bodies stay en-us.

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1 | `test-terminal-close-us395.js`: finishing the close step as `skipped` with all other steps terminal closes the run; no telemetry file present |
| AC2/AC7 | `test-ws-monitor-us395.js`: terminal-shaped state → `terminal-run-active`, reported status not active; live `us-243` specimen check |
| AC3 | `test-ws-monitor-us395.js`: two active runs share an `in_progress` slug → `stale-parent-row`; `ws-spec-multi` eval case |
| AC4 | `ws-spec-multi` eval case (one row per item; no stale `pending` duplicates) |
| AC5 | `test-ws-monitor-us395.js`: completed child + parent row `in_progress` → `stale-parent-row` |
| AC6 | `test-ws-monitor-us395.js`: completed multi run with phantom `pending` rows → `stale-parent-row` |
| AC8 | `test-terminal-close-us395.js`: re-applying close does not add rows or regress `endedAt`/status |
| AC9 | `npm run test`, `ws-check-harness`, `test-harness-clean.js`, monitor snapshot JSON |

## 6. Stack & Security Invariants Verification Plan

| Boundary | Check |
|----------|-------|
| Node-only runtime | No `.py` added; `node --check` on both touched `.cjs` scripts |
| Path tokens / portability | New docs use `{plansDir}`/`{slug}`; no host product names |
| Read-only monitor | Findings only add observations; snapshot stays read-only, bounded, no writes |
| Writer idempotency | Terminal-shape close guarded by terminal-status set; no double `endedAt` |
| Integrity | Hashed skill content changed → regenerate + verify in the same commit |
| Config GUI sync | No `config.schema.json`/`config.json.example` change → `Edit-WorkflowSkillsConfig.ps1` untouched |

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills + tests only).
- [x] No schema migration needed.
- [x] No auth surface.
- [x] Stack & security invariants verified (Node-only, read-only monitor, idempotent writer).
- [x] Test cases cover all ACs.
- [ ] Integrity regenerated + verified; version bumped once; harness clean.

## 8. Open Questions

- Whether the monitor should also surface Case 2 (two active runs, same item) under a distinct finding code. Resolved: reuse `stale-parent-row` with a lineage message rather than adding a third code, keeping the spec's two-code contract (AC6/AC7).
