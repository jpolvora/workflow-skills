---
id: 347
slug: us-347
title: ws-goal-fix-pr as orchestrator with per-round subagent dispatch
source: github
specDate: 2026-09-18
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/347"
step: 0
workflowId: us-347-20260918T194831Z
status: completed
startedAt: "2026-09-18T19:34:12.038Z"
endedAt: "2026-09-18T19:34:12.038Z"
acRefs: []
---
# Specification — ws-goal-fix-pr as orchestrator with per-round subagent dispatch

## Description

Adapt the `ws-goal-fix-pr` skill to act like an orchestrator: the skill session owns the wait/fetch convergence loop (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report), while every Act round's plan/fix work runs in a **fresh subagent** dispatched per the configured LLM model routing.

Current behavior (v0.4.35/0.4.36): the loop invokes `ws-fix-pr` and the `fixPrPlan` → `fixPrExec` pair executes in the calling session; per-role model routing (`fixPrPlan` → `reviewerModel`, `fixPrExec` → `executionModel`) only exists in the `ws-spec-to-pr` Step 9 dispatch layer, and the skill body assumes inline execution. Target behavior: the skill dispatches each round batch through the portable `dispatch-agent` alias to a fresh worker (one dispatch for the plan substep, one for the fix substep, or one worker running the ordered pair — caller-visible contract is fresh-worker-per-round with the ordered gate evidence), resolving worker models from `defaults.modelsPreset` / `modelPresets` / `stepModels` / legacy phase keys exactly like Step 9 does today. Hosts without subagent dispatch fall back to Tier 3 inline-isolated execution per `host-dispatch.md` (documented healthy behavior, not an error).

Scope is the skill contract + references + harness tests: `.agents/skills/ws-goal-fix-pr/SKILL.md` (Steps, Subagent contract, new dispatch section), dependent references (`ws-fix-pr` batch wording if it assumes inline execution), new/updated tests under `test/`, regenerated integrity (`bin/skill-integrity.json`), and version bump. No behavior change to convergence semantics, gate proofs, learning rules, or merge ownership (caller still merges).

## Acceptance Criteria

- AC1: Orchestrator session owns the loop — the skill session runs initialize, convergence check, heartbeat wait, re-check, pre-merge gate, and final report inline, and never executes plan-gate authoring or product fixes itself when dispatch is available.
- AC2: Fresh worker per round — every Act round batch runs in a newly dispatched worker (never reused across rounds or across plan/fix substeps); `fixPrPlan` stays gate-only (complete `plan-gate.md` before any product or remote mutation) and `fixPrExec` validates and follows it with amendments before deviations.
- AC3: Model routing per substep — `fixPrPlan` resolves `stepModels.fixPrPlan` → preset role → top-level `reviewerModel` → preset `reviewerModel` → captured session model; `fixPrExec` resolves the same chain through `executionModel`; neither consults numeric `"9"`; on host rejection the role retries under the captured session model and records `configuredModel` vs actual.
- AC4: Dispatch telemetry — every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events with actual models; internal roles never call `finish --step 9` (outer caller owns the single outer finish).
- AC5: Tier fallback — on hosts with no bound subagent tool the skill runs Tier 3 inline-isolated execution per `host-dispatch.md` (step persona, context pointers only, `inline-isolated-step` log) and still converges; fallback is documented, never a silent behavior change.
- AC6: Guards preserved — revision-guarded updates (AC7), blocked verdict only after ≥3 identical consecutive rounds (AC8), resume re-arms objective and resets counters, `$RUNTIME_DIR` under `{us-dir}/.runtime` (never OS temp, never skill-folder `runs/`), and `dry-run` performs zero commits/pushes/resolves.
- AC7: Existing semantics preserved — convergence criterion (`activeThreads == 0` plus all required checks completed), automation overrides (auto-yes gates, auto commit+resolve+push), verify step, post-round learning rule (no `Learning: N/A` on accepted defects), and pre-merge hard gate keep their current meaning.
- AC8: Tests green — new/updated harness tests cover dispatch-per-round, both model-resolution chains, no-finish-from-internal, and Tier 3 fallback; `npm run test` for the touched area and `ws-check-harness` clean (0 findings); integrity regenerated and verified.

## Out of Scope

| Feature | Reason |
|---------|--------|
| `ws-fix-pr` gate semantics (scoring, proactive sweep, commit shape) | Unchanged; only the execution host moves to a worker |
| Outer Step 9 / lite Step 5 orchestration | Caller dispatch and single outer finish stay as-is |
| Merge behavior | Caller still merges; the skill still never merges |
| New model presets or host products | Reuse existing `modelPresets` / `stepModels` keys and portable `dispatch-agent` vocabulary (harness neutrality) |
| New config keys | Resolution reuses the existing Step 9 chain; no schema change |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Worker granularity is one fresh worker per round batch running the ordered `fixPrPlan` → `fixPrExec` pair | Batch worker (plan then fix inside one fresh worker) | Matches "one pair per batch, never per thread" and minimizes dispatches while keeping gate evidence ordered | y |
| Hosts without dispatch (incl. lite inline runs) use Tier 3 with identical gate/learning contracts | Tier 3 inline-isolated per `host-dispatch.md` | Portable contract already defines this tier; lite posture unchanged | y |
| `dry-run` dispatches plan-only workers or simulates inline without mutation | Simulate without mutation (no commits/pushes/resolves) | Preserves current dry-run guarantee under either execution path | y |
| Dimensions N/A to a skill-contract change | N/A because no inputs, auth flows, concurrency primitives, TTL, retries, external deps, or state transitions are introduced (docs + tests + dispatch wording only) | Skill body change with harness tests | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Touch list fixed: `ws-goal-fix-pr/SKILL.md`, `ws-fix-pr` batch wording if inline-assuming, `test/test-*.js` (new/updated), `bin/skill-integrity.json`, `package.json` version | `git status --short` shows only those paths + `docs/` rebuild |
| Atomic criteria | Each AC maps to a skill-text assertion or a named test | AC1–AC8 each cite a SKILL.md section or test file |
| Failure modes | Stale revision, model rejection, no-dispatch host, gate-before-push violation named | Negative scenarios NS1–NS5 |
| Observation telemetry | Dispatch events, round logs, gate files, trap titles named | See Telemetry below |
| Zero open blockers | Model chain, worker granularity, fallback tier decided | Assumptions table all confirmed |
| Harness neutrality | Skill names no host/subagent product; uses `dispatch-agent` + `user-gate` aliases only | `ws-check-harness` portability checks + grep for product names |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `fixPrPlan` → `fixPrExec` ordered dispatch events per batch in `telemetry.jsonl` with actual vs configured models.
- Round gate files (`runs/pr-<N>/plan-gate.md`) prove gate-before-mutation; round reports under `{reviewsDir}/PR-<N>-round-*.md` carry `Learning:` titles.
- `npm run test` (touched suites) exit 0; `ws-check-harness` 0 findings; `npm run verify-integrity` exit 0.
- Dry-run: loop converges with zero `git` remote mutations and zero `resolve-thread` calls.

### Negative & Failing Test Scenarios

- NS1: No bound subagent tool — loop must converge via Tier 3 inline-isolated execution with `inline-isolated-step` evidence, never stall waiting for a dispatcher.
- NS2: Host rejects the configured model id — role must retry under the captured session model, record `configuredModel` vs actual, and continue the round (no abort, no silent model swap without record).
- NS3: Stale-revision update arrives mid-loop — must conflict loudly and stop for surfacing, never last-wins overwrite of thread/round state.
- NS4: Fix worker attempts resolve or push before complete gate evidence exists — forbidden; round must not resolve/push until both substeps have evidence and same-class hits are fixed or recorded skipped.
- NS5 (harness neutrality): A edit introducing a concrete host/subagent product name or tool id into the skill body must fail portability checks — only portable `dispatch-agent` / `user-gate` aliases allowed.

## Original Issue Context

improvement: make update ws-goal-fix-pr

adapt ws-goal-fix-pr skill to act like an orchestrator, coodinating wait/fetch loop run in a fresh sub agent running the /plan/fix dispatched according to corresponding configured llm model

### Prior Work Sweep

- Ran provider `sweep-prior-work` for issue 347 (keywords: goal-fix-pr, orchestrator, subagent). 5 PR hits, all MERGED, no open duplicate: #175 (goal-fix-pr pre-merge gate + resolve atomicity), #300 (workflow runtime issues + monitor), #246 (configurable memory backends), #219 (pattern consults in subagents), #249 (research-driven pipeline quality).
- No exact open PR for issue 347 — proceed.

### Design Intent

- Current `ws-goal-fix-pr` (v0.4.35/0.4.36) runs the Act loop inline: `git log` on the skill shows incremental gate/learning/model-preset fixes but no subagent dispatch — inline execution is the historical shape, not an accidental gap. Per-role model routing (`fixPrPlan`/`fixPrExec`) currently lives only in `ws-spec-to-pr` Step 9 dispatch. This spec decides a deliberate architecture change (orchestrator skill + worker dispatch), not a bug restore.

## Notes

- Stack: Node 22 skill package (`node-skills-package`), no backend/frontend/database surface; change class is skill-contract docs + harness tests.
- No visual references on the issue (no attachments; asset ingest inherited no-op).
- No gray area: worker granularity, model chain, and fallback tier are decided in Assumptions; no user-facing product choice remains, so no companion `context.md`.
