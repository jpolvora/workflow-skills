---
slug: us-347
title: ws-goal-fix-pr as orchestrator with per-round subagent dispatch
status: completed
step: 1
workflowId: us-347-20260918T194831Z
startedAt: "2026-09-18T19:48:31Z"
endedAt: "2026-09-18T19:54:36.732Z"
acRefs: []
---
## 0. Summary & Business Rules

Adapt `ws-goal-fix-pr` from inline Act-loop execution to an orchestrator posture: the skill session owns the wait/fetch convergence loop (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report) while every Act round's plan/fix batch runs in a freshly dispatched worker via the portable `dispatch-agent` alias. Worker models resolve from `defaults.modelsPreset` / `modelPresets` / `stepModels` / legacy phase keys exactly like Step 9 dispatch does today (`fixPrPlan` → `reviewerModel` chain, `fixPrExec` → `executionModel` chain). Hosts without subagent dispatch use Tier 3 inline-isolated execution per `host-dispatch.md` as documented healthy behavior.

Business rules:
- Gate-before-mutation: `fixPrPlan` completes `plan-gate.md` before any product or remote mutation; `fixPrExec` validates and follows it, amending before deviating.
- Fresh-worker-per-round: one new worker per Act round batch running the ordered `fixPrPlan` → `fixPrExec` pair; never reused across rounds or substeps.
- Convergence semantics, gate proofs, learning rules, and merge ownership (caller merges) are unchanged.
- Harness neutrality: portable `dispatch-agent` / `user-gate` aliases only; no host/subagent product names in skill bodies.
- Design intent (per spec): inline execution is the historical shape (v0.4.35/0.4.36 incremental fixes, no dispatch) — this is a deliberate architecture change, not a bug restore.

## 1. Definition of Ready & Scope

Resolved assumptions (all confirmed in spec):
- Worker granularity: one fresh worker per round batch running the ordered pair (minimizes dispatches, keeps gate evidence ordered).
- Fallback: Tier 3 inline-isolated per `host-dispatch.md` on hosts without dispatch (lite posture unchanged).
- `dry-run`: simulate without mutation — zero commits/pushes/resolves under either execution path.
- No new config keys, presets, or host products; reuse existing Step 9 resolution chain.

Acceptance Criteria (measurable):
- AC1: Orchestrator session owns loop inline (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report); never authors plan gates or product fixes itself when dispatch is available.
- AC2: Fresh worker per round batch; `fixPrPlan` gate-only; `fixPrExec` validates/follows with amendments-before-deviations.
- AC3: `fixPrPlan` resolves `stepModels.fixPrPlan` → preset role → top-level `reviewerModel` → preset `reviewerModel` → captured session; `fixPrExec` same chain through `executionModel`; neither consults numeric `"9"`; host rejection retries under captured session model with `configuredModel` vs actual recorded.
- AC4: Ordered `fixPrPlan` → `fixPrExec` dispatch events per batch with actual models; internal roles never call `finish --step 9`.
- AC5: No-dispatch hosts run Tier 3 inline-isolated (step persona, context pointers only, `inline-isolated-step` log) and still converge; documented, never silent.
- AC6: Guards preserved — revision-guarded updates, blocked verdict only after ≥3 identical consecutive rounds, resume re-arms + resets counters, `$RUNTIME_DIR` under `{us-dir}/.runtime`, `dry-run` zero mutations.
- AC7: Semantics preserved — convergence criterion, automation overrides, verify step, post-round learning rule, pre-merge hard gate.
- AC8: Harness tests cover dispatch-per-round, both model chains, no-finish-from-internal, Tier 3 fallback; touched `npm run test` suites + `ws-check-harness` (0 findings) green; integrity regenerated and verified.

Out of scope: `ws-fix-pr` gate semantics (scoring, sweep, commit shape); outer Step 9 / lite Step 5 orchestration; merge behavior; new presets/hosts; new config keys.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 skill package). No backend/frontend/database surface. Layers touched (per `config.json`):
- `skills-sot` (`.agents/skills`): `ws-goal-fix-pr/SKILL.md` (Steps, Subagent contract, new dispatch section); `ws-fix-pr` batch wording only if it assumes inline execution (audit, minimal touch).
- `tests` (`test/`): new/updated harness tests for dispatch-per-round, model chains, no-finish, Tier 3.
- `installer-cli` (`bin`): `bin/skill-integrity.json` regenerated; `package.json` version bump.

Design:
- `ws-goal-fix-pr/SKILL.md` Act round (Step 3) rewritten: skill session dispatches each round batch through `dispatch-agent` to a fresh worker; worker runs ordered `fixPrPlan` → `fixPrExec` with gate evidence; session records ordered dispatch telemetry. Add a dispatch section specifying model-resolution chains (mirroring Step 9 wording in STEP-DISPATCH.md + `ws-fix-pr` Internal model roles), session-model capture, rejection fallback, and Tier 3 fallback pointer.
- `ws-fix-pr/SKILL.md` "Internal model roles" section already defines the resolution order and ordered JSONL events — audit its batch wording for inline-assumption; align goal-loop wording to reference (not duplicate) it where possible.
- Subagent contract of `ws-goal-fix-pr` updated: session owns loop inline; Act work dispatched; internal roles emit telemetry only, never finish outer Step 9.
- Tests: skill-text assertions on the rewritten sections + resolution-chain fixtures; Tier 3 fallback test; neutrality grep test (NS5).
- Invariants (config `invariants`): `commitPlanFilesOnlyAtStep8: true` respected (no product commit staging of plan files); no EF/tenancy/migration invariants apply to this stack.

## 3. Step-by-Step Plan

1. Audit `ws-fix-pr` batch wording for inline-execution assumptions (AC2, AC3, AC4).
   - Action: read `ws-fix-pr/SKILL.md` Internal model roles + batch definition; list sentences assuming caller-session execution; decide minimal reword vs no-touch.
   - Affected files: `.agents/skills/ws-fix-pr/SKILL.md` (read; edit only if inline-assuming).
   - Checks: portable vocabulary only; keep `state.handoffs` pointer and phrase-locked substrings (memory: 2026-09-15 pipeline-dedup).

2. Rewrite `ws-goal-fix-pr/SKILL.md` Act round + dispatch section (AC1, AC2, AC3, AC4, AC5).
   - Action: Step 3 becomes dispatch-per-round-batch (fresh worker, ordered pair, gate evidence); add dispatch section with both resolution chains, session capture, rejection retry + `configuredModel` record, ordered JSONL events; document Tier 3 fallback per `host-dispatch.md`; update Subagent contract (session owns loop inline; never plan/fix when dispatch available; never `finish --step 9` from internal roles).
   - Affected files: `.agents/skills/ws-goal-fix-pr/SKILL.md`.
   - Checks: Steps 1–2, 4–8 loop semantics byte-stable except dispatch pointers; no host product names; quoter sweep for restructured phrasing (memory: 2026-09-18 sweep-quoters).

3. Preserve guards/loops/reports wording (AC6, AC7).
   - Action: verify revision guards, blocked-verdict, resume, `$RUNTIME_DIR`, dry-run, convergence criterion, automation overrides, verify step, learning rule, pre-merge gate survive the rewrite verbatim or with dispatch-neutral pointers; no semantic drift.
   - Affected files: `.agents/skills/ws-goal-fix-pr/SKILL.md` (same edit as step 2, reviewed separately).
   - Checks: diff review scoped to Step 3 + dispatch section + Subagent contract.

4. Add/update harness tests (AC8; covers AC1–AC5, NS1–NS5).
   - Action: new `test/test-goal-fix-pr-orchestrator-dispatch.js` (skill-text assertions: dispatch-per-round, both chains, numeric-"9" exclusion, no-finish-from-internal, Tier 3 wording, neutrality grep); extend or add model-resolution fixture tests if existing preset tests don't cover `fixPrPlan`/`fixPrExec` chains.
   - Affected files: `test/test-goal-fix-pr-orchestrator-dispatch.js` (new); possibly `test/test-models-preset-and-per-step.js` (extend, don't fork).
   - Checks: named assertions per AC; NS1–NS5 each mapped.

5. Regenerate integrity + version bump + site rebuild (AC8).
   - Action: finish all hashed skill edits first, then `npm run generate-integrity && npm run verify-integrity`; `npm run build-site:bump` (one patch bump); rebuild dependent pills if dep edges changed.
   - Affected files: `bin/skill-integrity.json`, `package.json`, `docs/` rebuild output.
   - Checks: `verify-integrity` exit 0; full test suite green after (memory: 2026-09-09 integrity-after-final-edit).

6. Run verification gates (AC8).
   - Action: `npm run test` (touched suites, then full); `ws-check-harness` (0 findings); `check_pipeline_handoff.cjs` if pipeline prose touched.
   - Affected files: none.
   - Checks: exit codes recorded; failures → fix, never weaken tests.

## 4. Permissions, Tenancy & i18n

Not applicable: skill-contract docs + harness tests; no RBAC surface, no tenant data, no user-facing strings. No auth flows or permission checks introduced.

## 5. Test Coverage

| AC / NS | Test case | Test file / method |
|---------|-----------|-------------------|
| AC1 | Session owns loop inline; no plan-gate/fix authoring in session when dispatch available | `test-goal-fix-pr-orchestrator-dispatch.js` — `sessionOwnsLoopInline` |
| AC2 | Fresh worker per round batch; gate-only plan; exec validates + amends-before-deviates | `test-goal-fix-pr-orchestrator-dispatch.js` — `freshWorkerPerRound` + `gateBeforeMutation` |
| AC3 | `fixPrPlan` chain (role → preset role → top-level reviewer → preset reviewer → session); `fixPrExec` chain via execution; numeric `"9"` never consulted | `test-goal-fix-pr-orchestrator-dispatch.js` — `fixPrPlanChain`, `fixPrExecChain`, `noNumericNine`; fixtures extend `test-models-preset-and-per-step.js` |
| AC3 | Host rejection retries under session model; `configuredModel` vs actual recorded | `test-goal-fix-pr-orchestrator-dispatch.js` — `modelRejectionFallback` (NS2) |
| AC4 | Ordered `fixPrPlan` → `fixPrExec` dispatch events with actual models | `test-goal-fix-pr-orchestrator-dispatch.js` — `orderedDispatchEvents` |
| AC4 | Internal roles never call `finish --step 9` | `test-goal-fix-pr-orchestrator-dispatch.js` — `noFinishFromInternal` |
| AC5 | Tier 3 inline-isolated fallback documented (persona, context pointers, log) | `test-goal-fix-pr-orchestrator-dispatch.js` — `tier3Fallback` (NS1) |
| AC6 | Guards preserved (revision, blocked ≥3, resume, `$RUNTIME_DIR`, dry-run) incl. stale-revision conflict (NS3) and gate-before-resolve/push (NS4) | `test-goal-fix-pr-orchestrator-dispatch.js` — `guardsPreserved` (assert surviving wording) |
| AC7 | Semantics preserved (convergence, overrides, verify, learning, pre-merge gate) | `test-goal-fix-pr-orchestrator-dispatch.js` — `semanticsPreserved` (assert surviving wording) |
| AC8 | Touched suites + `ws-check-harness` green; integrity verified | `npm run test`, `ws-check-harness`, `npm run verify-integrity` exit 0 |
| NS5 | No host/subagent product names or tool ids in skill bodies | `test-goal-fix-pr-orchestrator-dispatch.js` — `harnessNeutrality` |

## 6. Stack & Security Invariants Verification Plan

Stack: `node-skills-package` — skill-contract docs + harness tests; no backend/frontend/database surface, no auth, no concurrency primitives, no DTO boundary, no subscriptions. Invariants from `config.json.invariants`: only `commitPlanFilesOnlyAtStep8` applies (plan artifacts committed only at Step 8 delivery; this plan writes `.agents/plans/` artifacts which are never in G2-code staging).

Touched framework boundaries:
- Authorization & endpoint protection: N/A — no endpoints, policies, or route guards introduced; SCM provider calls unchanged (`list-threads` / `check-pr-status` / `resolve-thread` via configured provider, never raw `gh`/`az`).
- Concurrency & async safety: N/A — no async code, timers, or promises introduced; the heartbeat wait is existing loop prose, unchanged semantics.
- Input validation & DTO boundary: N/A — no new inputs, schemas, or injection surface; no config schema change (resolution reuses existing keys).
- Subscription & lifecycle cleanup: N/A — no streams, hooks, or subscriptions.

Harness-neutrality boundary (the operative invariant for this change class):
- Verify: skill bodies use portable `dispatch-agent` / `user-gate` aliases only; grep for host/subagent product names and host-only tool ids must return zero hits in touched skill files.
- Verify: `ws-check-harness` portability checks pass with 0 findings.
- Verify: Tier 3 fallback wording matches `host-dispatch.md` Tier 3 contract (step persona, context pointers only, `inline-isolated-step` log) — documented fallback, never silent.
- Verify: `ws-fix-pr` preflight/staging protections (`preExistingDirty` overlap detection, path-scoped staging, no bare `git add -u`, inseparable-anchor rule) are not weakened by any batch-wording touch (memory: 2026-09-14 fix-pr traps).
- Verify: no internal spec/issue/PR numbers leak into shipped skill prose (memory: 2026-09-12 portable-prose).
- Verify: direct `ws-*` dependency edges declared if new invocations are added (memory: 2026-09-12 dep edges); integrity regenerated after final skill edit (memory: 2026-09-09).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / tests / installer-cli only).
- [ ] Domain entities and mappings encapsulated (N/A — no domain model change).
- [ ] Schema migrations created (N/A — no database).
- [ ] Authorization checks applied (N/A — no new auth surface; SCM via provider contract).
- [ ] Stack & security invariants verified (harness neutrality + Tier 3 contract + fix-pr staging protections).
- [ ] i18n keys declared (N/A — no user-facing strings).
- [ ] Test cases cover all ACs (AC1–AC8 + NS1–NS5 mapped in §5).

## 8. Open Questions

None blocking. Worker granularity (one fresh worker per round batch running the ordered pair), model chain (existing Step 9 chain, no numeric `"9"`), and fallback tier (Tier 3 per `host-dispatch.md`) are decided in the spec Assumptions table. `ws-fix-pr` batch-wording touch is audit-gated: edit only if inline-assuming sentences are found, otherwise keep the skill untouched.
