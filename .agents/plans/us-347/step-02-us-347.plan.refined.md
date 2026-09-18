---
slug: us-347
title: ws-goal-fix-pr as orchestrator with per-round subagent dispatch (refined)
status: completed
step: 2
workflowId: us-347-20260918T194831Z
sourcePlan: .agents/plans/us-347/step-01-us-347.plan.md
sourceInterview: .agents/plans/us-347/step-02-us-347.plan-interview.md
verdict: approve-with-findings
blocking_open: 0
shared_understanding: confirmed
acRefs: []
startedAt: "2026-09-18T19:48:31Z"
endedAt: "2026-09-18T20:04:14.220Z"
---
# Refined plan — us-347

Resolved plan = `step-01-us-347.plan.md` content with all 7 Step 2 interview findings (F1–F7, non-blocking) folded in. `step-01` stays untouched. See `## Interview findings resolved` for the concise registry reference.

## 0. Summary & Business Rules

Adapt `ws-goal-fix-pr` from inline Act-loop execution to an orchestrator posture: the skill session owns the wait/fetch convergence loop (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report) while every Act round's plan/fix batch runs in a freshly dispatched worker via the portable `dispatch-agent` alias. Worker models resolve from `defaults.modelsPreset` / `modelPresets` / `stepModels` / legacy phase keys exactly like Step 9 dispatch does today (`fixPrPlan` → `reviewerModel` chain, `fixPrExec` → `executionModel` chain). Hosts without subagent dispatch use Tier 3 inline-isolated execution per `host-dispatch.md` as documented healthy behavior.

Business rules:
- Gate-before-mutation: `fixPrPlan` completes `plan-gate.md` before any product or remote mutation; `fixPrExec` validates and follows it, amending before deviating.
- Fresh-worker-per-round-batch (F1): one fresh worker per round batch runs the ordered `fixPrPlan` → `fixPrExec` pair inside that worker; that worker is never reused for another round or substep instance. Batch worker, not two dispatches per round. Tests assert batch-worker.
- Ownership split (F2): the worker owns everything inside the ws-fix-pr batch scope (gate, fixes, proactive evidence, verify, round report, resolve, push); the session owns goal-loop steps (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report) and never duplicates per-round `Learning:` writes.
- Convergence semantics, gate proofs, learning rules, and merge ownership (caller merges) are unchanged.
- Harness neutrality: portable `dispatch-agent` / `user-gate` aliases only; no host/subagent product names in skill bodies.
- Chain normative source (F3): the ws-fix-pr "Internal model roles" 5-link table per role is normative (matches spec AC3 exactly); STEP-DISPATCH prose is an abbreviated pointer only.
- Design intent (per spec): inline execution is the historical shape (v0.4.35/0.4.36 incremental fixes, no dispatch) — this is a deliberate architecture change, not a bug restore.

## 1. Definition of Ready & Scope

Resolved assumptions (all confirmed in spec):
- Worker granularity: one fresh worker per round batch running the ordered pair (minimizes dispatches, keeps gate evidence ordered). F1 clarifies spec AC2 "never reused across rounds or across plan/fix substeps" reads as batch-worker: the batch worker is never reused for another round or substep instance.
- Fallback: Tier 3 inline-isolated per `host-dispatch.md` on hosts without dispatch (lite posture unchanged).
- `dry-run`: simulate without mutation — zero commits/pushes/resolves under either execution path (F5: named assertion covers both dispatch and Tier 3 paths).
- No new config keys, presets, or host products; reuse existing Step 9 resolution chain (F3: 5-link chain per role, numeric `"9"` excluded).

Acceptance Criteria (measurable):
- AC1: Orchestrator session owns loop inline (initialize, convergence check, heartbeat wait, re-check, pre-merge gate, final report); never authors plan gates or product fixes itself when dispatch is available.
- AC2: Fresh worker per round batch; `fixPrPlan` gate-only; `fixPrExec` validates/follows with amendments-before-deviations. Batch-worker reading (F1) stated verbatim in the new dispatch section.
- AC3: `fixPrPlan` resolves `stepModels.fixPrPlan` → preset role → top-level `reviewerModel` → preset `reviewerModel` → captured session; `fixPrExec` same chain through `executionModel`; neither consults numeric `"9"`; host rejection retries under captured session model with `configuredModel` vs actual recorded. Normative source is the ws-fix-pr table (F3).
- AC4: Ordered `fixPrPlan` → `fixPrExec` dispatch events per batch in `telemetry.jsonl` carrying actual vs configured models (F4); internal roles never call `finish --step 9`.
- AC5: No-dispatch hosts run Tier 3 inline-isolated (step persona, context pointers only, `inline-isolated-step` log) and still converge; documented, never silent.
- AC6: Guards preserved — revision-guarded updates, blocked verdict only after ≥3 identical consecutive rounds, resume re-arms + resets counters, `$RUNTIME_DIR` under `{us-dir}/.runtime`, `dry-run` zero mutations. F5/F6 split wording survival into named assertions (`dryRunZeroMutation`, stale-revision, gate-before-resolve/push).
- AC7: Semantics preserved — convergence criterion, automation overrides, verify step, post-round learning rule, pre-merge hard gate. Ownership (F2): per-round verify/learn inside batch scope owned by worker; goal-loop + final report owned by session.
- AC8: Harness tests cover dispatch-per-round, both model chains, no-finish-from-internal, Tier 3 fallback; touched `npm run test` suites + `ws-check-harness` (0 findings) green; integrity regenerated and verified; evals/wiki companions confirmed by hand (F7, no bulk regenerator).

Out of scope: `ws-fix-pr` gate semantics (scoring, sweep, commit shape); outer Step 9 / lite Step 5 orchestration; merge behavior; new presets/hosts; new config keys.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 skill package). No backend/frontend/database surface. Layers touched (per `config.json`):
- `skills-sot` (`.agents/skills`): `ws-goal-fix-pr/SKILL.md` (Steps, Subagent contract, new dispatch section); `ws-fix-pr` batch wording only if it assumes inline execution (audit, minimal touch).
- `tests` (`test/`): new/updated harness tests for dispatch-per-round, model chains, no-finish, Tier 3.
- `installer-cli` (`bin`): `bin/skill-integrity.json` regenerated; `package.json` version bump.

Design:
- `ws-goal-fix-pr/SKILL.md` Act round (Step 3) rewritten: skill session dispatches each round batch through `dispatch-agent` to a fresh worker; worker runs ordered `fixPrPlan` → `fixPrExec` with gate evidence; session records ordered dispatch telemetry. Add a dispatch section specifying: batch-worker reading verbatim (F1); ownership split worker-vs-session (F2); both 5-link resolution chains with the ws-fix-pr table as normative and STEP-DISPATCH as pointer only (F3); session-model capture, rejection retry + `configuredModel` vs actual record; ordered `telemetry.jsonl` events per batch with actual vs configured model fields (F4); and Tier 3 fallback pointer.
- `ws-fix-pr/SKILL.md` "Internal model roles" section already defines the resolution order and ordered JSONL events — audit its batch wording for inline-assumption; align goal-loop wording to reference (not duplicate) it where possible. Normative chain = ws-fix-pr table (F3).
- Subagent contract of `ws-goal-fix-pr` updated: session owns loop inline; Act work dispatched; worker owns fix-pr-internal verify/learn/report/resolve/push (F2); internal roles emit telemetry only, never finish outer Step 9.
- Tests: skill-text assertions on the rewritten sections + resolution-chain fixtures; Tier 3 fallback test; neutrality grep test (NS5); named dry-run (F5) and NS3/NS4 (F6) assertions.
- Companions (F7): at implementation/ship time confirm whether `ws-goal-fix-pr`/`ws-fix-pr` evals.json or wiki doc pages need hand updates; hand-edit specific files only, never run the bulk eval regenerator.
- Invariants (config `invariants`): `commitPlanFilesOnlyAtStep8: true` respected (no product commit staging of plan files); no EF/tenancy/migration invariants apply to this stack.

## 3. Step-by-Step Plan

1. Audit `ws-fix-pr` batch wording for inline-execution assumptions (AC2, AC3, AC4).
   - Action: read `ws-fix-pr/SKILL.md` Internal model roles + batch definition; list sentences assuming caller-session execution; decide minimal reword vs no-touch. Confirm F2 ownership split against ws-fix-pr Steps 4–5 (verify/learn/resolve/push inside batch scope); keep default split unless audit proves otherwise.
   - Affected files: `.agents/skills/ws-fix-pr/SKILL.md` (read; edit only if inline-assuming).
   - Checks: portable vocabulary only; keep `state.handoffs` pointer and phrase-locked substrings (memory: 2026-09-15 pipeline-dedup).

2. Rewrite `ws-goal-fix-pr/SKILL.md` Act round + dispatch section (AC1, AC2, AC3, AC4, AC5).
   - Action: Step 3 becomes dispatch-per-round-batch (fresh worker per batch, ordered pair inside, gate evidence); add dispatch section with: batch-worker reading verbatim (F1); ownership split (F2); both 5-link chains with ws-fix-pr table normative, STEP-DISPATCH pointer only (F3); session capture, rejection retry + `configuredModel` vs actual record; ordered `telemetry.jsonl` events per batch with actual vs configured fields (F4); Tier 3 fallback per `host-dispatch.md`; update Subagent contract (session owns loop inline; never plan/fix when dispatch available; never `finish --step 9` from internal roles).
   - Affected files: `.agents/skills/ws-goal-fix-pr/SKILL.md`.
   - Checks: Steps 1–2, 4–8 loop semantics byte-stable except dispatch pointers; no host product names; quoter sweep for restructured phrasing (memory: 2026-09-18 sweep-quoters).

3. Preserve guards/loops/reports wording (AC6, AC7).
   - Action: verify revision guards, blocked-verdict, resume, `$RUNTIME_DIR`, dry-run, convergence criterion, automation overrides, verify step, learning rule, pre-merge gate survive the rewrite verbatim or with dispatch-neutral pointers; no semantic drift. Keep session-vs-worker `Learning:` ownership (F2): no duplicated per-round writes by the session.
   - Affected files: `.agents/skills/ws-goal-fix-pr/SKILL.md` (same edit as step 2, reviewed separately).
   - Checks: diff review scoped to Step 3 + dispatch section + Subagent contract.

4. Add/update harness tests (AC8; covers AC1–AC5, NS1–NS5).
   - Action: new `test/test-goal-fix-pr-orchestrator-dispatch.js` (skill-text assertions: dispatch-per-round-batch, both 5-link chains, numeric-`"9"` exclusion, no-finish-from-internal, Tier 3 wording, `telemetry.jsonl` actual-vs-configured fields, neutrality grep); named `dryRunZeroMutation` for both paths (F5); named stale-revision conflict and gate-before-resolve/push assertions (F6); extend or add model-resolution fixture tests if existing preset tests don't cover `fixPrPlan`/`fixPrExec` chains.
   - Affected files: `test/test-goal-fix-pr-orchestrator-dispatch.js` (new); possibly `test/test-models-preset-and-per-step.js` (extend, don't fork).
   - Checks: named assertions per AC; NS1–NS5 each mapped; `modelRejectionFallback` asserts both `configuredModel` and actual fields on retry (F4).

5. Regenerate integrity + version bump + site rebuild (AC8) + companions check (F7).
   - Action: finish all hashed skill edits first, then `npm run generate-integrity && npm run verify-integrity`; `npm run build-site:bump` (one patch bump); rebuild dependent pills if dep edges changed. Confirm evals.json / wiki doc-page hand updates for touched skills; hand-edit specific files only, never the bulk eval regenerator.
   - Affected files: `bin/skill-integrity.json`, `package.json`, `docs/` rebuild output; hand-edited evals/wiki files only if needed.
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
| AC2 | Fresh worker per round batch (one worker per round, ordered pair inside — F1); gate-only plan; exec validates + amends-before-deviates | `test-goal-fix-pr-orchestrator-dispatch.js` — `freshWorkerPerRound` + `gateBeforeMutation` |
| AC3 | `fixPrPlan` 5-link chain (role → preset role → top-level reviewer → preset reviewer → session, ws-fix-pr table normative — F3); `fixPrExec` chain via execution; numeric `"9"` never consulted | `test-goal-fix-pr-orchestrator-dispatch.js` — `fixPrPlanChain`, `fixPrExecChain`, `noNumericNine`; fixtures extend `test-models-preset-and-per-step.js` |
| AC3 | Host rejection retries under session model; `configuredModel` vs actual both recorded (F4) | `test-goal-fix-pr-orchestrator-dispatch.js` — `modelRejectionFallback` (NS2) |
| AC4 | Ordered `fixPrPlan` → `fixPrExec` dispatch events in `telemetry.jsonl` with actual vs configured models (F4) | `test-goal-fix-pr-orchestrator-dispatch.js` — `orderedDispatchEvents` |
| AC4 | Internal roles never call `finish --step 9` | `test-goal-fix-pr-orchestrator-dispatch.js` — `noFinishFromInternal` |
| AC5 | Tier 3 inline-isolated fallback documented (persona, context pointers, log) | `test-goal-fix-pr-orchestrator-dispatch.js` — `tier3Fallback` (NS1) |
| AC6 | Guards preserved (revision, blocked ≥3, resume, `$RUNTIME_DIR`) | `test-goal-fix-pr-orchestrator-dispatch.js` — `guardsPreserved` (assert surviving wording) |
| AC6 | `dry-run` zero commits/pushes/`resolve-thread` under both dispatch and Tier 3 paths (F5) | `test-goal-fix-pr-orchestrator-dispatch.js` — `dryRunZeroMutation` |
| AC6 | Stale-revision loud conflict wording survival (F6, NS3) | `test-goal-fix-pr-orchestrator-dispatch.js` — `staleRevisionConflict` |
| AC6 | Gate-before-resolve/push: no resolve/push until both substeps evidenced and same-class hits fixed or recorded skipped (F6, NS4) | `test-goal-fix-pr-orchestrator-dispatch.js` — `gateBeforeResolvePush` |
| AC7 | Semantics preserved (convergence, overrides, verify, learning, pre-merge gate) with worker/session ownership split (F2) | `test-goal-fix-pr-orchestrator-dispatch.js` — `semanticsPreserved` (assert surviving wording) |
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
- [ ] Test cases cover all ACs (AC1–AC8 + NS1–NS5 mapped in §5, incl. F5/F6 named assertions).
- [ ] Companions confirmed by hand: evals.json / wiki doc pages hand-edited only if needed, bulk regenerator never run (F7).

## 8. Open Questions

None blocking. Worker granularity (one fresh worker per round batch running the ordered pair), model chain (existing Step 9 chain, no numeric `"9"`), and fallback tier (Tier 3 per `host-dispatch.md`) are decided in the spec Assumptions table. `ws-fix-pr` batch-wording touch is audit-gated: edit only if inline-assuming sentences are found, otherwise keep the skill untouched.

## Interview findings resolved

Concise registry reference (full registry in `step-02-us-347.plan-interview.md`; all closed, non-blocking):

| id | Finding | Resolution folded into refined plan |
|----|---------|-------------------------------------|
| F1 | Batch-worker reading of AC2 | §0 business rules + §1 + §2 dispatch section + §3 step 2 + §5 `freshWorkerPerRound`: one fresh worker per round batch runs ordered pair; never reused for another round/substep instance; tests assert batch-worker |
| F2 | Verify/learn ownership worker vs session | §0 + §1 AC7 + §2 design + §3 steps 1–3 + §5 `semanticsPreserved`: worker owns batch-scope verify/learn/report/resolve/push; session owns loop + final report; no duplicated `Learning:` writes |
| F3 | Chain normative source | §0 + §1 AC3 + §2 design + §3 step 2 + §5 chain assertions: ws-fix-pr 5-link table normative; STEP-DISPATCH pointer only; 5-link + `noNumericNine` asserted |
| F4 | Telemetry field contract | §1 AC4 + §2 + §3 steps 2/4 + §5 `orderedDispatchEvents`/`modelRejectionFallback`: ordered `telemetry.jsonl` events per batch with actual vs configured models; retry asserts both fields |
| F5 | Named dry-run assertion | §1 AC6 + §2 + §3 step 4 + §5 `dryRunZeroMutation`: zero commits/pushes/`resolve-thread` under both dispatch and Tier 3 paths |
| F6 | Named NS3/NS4 assertions | §1 AC6 + §3 step 4 + §5 `staleRevisionConflict` + `gateBeforeResolvePush`: stale-revision loud conflict; gate-before-resolve/push with both-substeps evidence |
| F7 | Evals/wiki companions | §1 AC8 + §2 + §3 step 5 + §7 checklist: confirm at implementation/ship time; hand-edit specific files only; never bulk eval regenerator |
