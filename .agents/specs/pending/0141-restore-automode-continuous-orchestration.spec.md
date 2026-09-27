---
id: null
slug: restore-automode-continuous-orchestration
title: "Restore autoMode continuous orchestration (host-turn chaining through ship and fix-pr)"
source: local
specDate: 2026-09-27
---

# Specification — Restore autoMode continuous orchestration (host-turn chaining through ship and fix-pr)

## Description

Unattended `defaults.autoMode` runs of `ws-spec-to-pr` / `ws-spec-to-pr-lite` must behave like early full-auto sessions: the orchestrator keeps one host session through Steps 0→9, auto-applies gate index 0 at each boundary, dispatches step subagents, runs Step 8 close, workflow-mode `ws-ship-pr`, and Step 9 `ws-goal-fix-pr` until terminal ship and fix-pr convergence or a documented hard stop — without voluntarily ending the host turn between steps.

A Sep 2026 doc regression (US-412/413 AC8 wording) told agents that `autoMode` removes gate halts but **does not chain host turns**, which conflicted with the older `autoMode` design (continuous index-0 progression across step boundaries; see US-0059 / commit `781a2ef5`). That regression reintroduced manual re-prompts and looked like a stall when operators expected run-to-completion behavior.

This spec restores the continuous orchestration contract in canonical harness docs and tests, while **keeping** US-412/413 machinery (`checkpoint`, `pause-turn`, `state.turnPause`, `worker-session-paused`) as a **host-forced fallback** when the IDE ends a turn mid-step — not as the default unattended path.

System boundaries: portable skill prose and tests only (`gates.md`, `ws-spec-to-pr` orch family, `ws-spec-to-pr-lite`, README/FEATURES/wiki, `test/test-liveness-checkpoints.js`). No change to step baton / `step_coordinator.cjs` worker-turn semantics.

## Background & lineage (why “host turn” appeared)

| Layer | Spec / artifact | What it means |
|-------|-----------------|---------------|
| **Host turn** | Informal harness term | One orchestrator **chat/agent response cycle** in the consumer IDE (not a baton worker process). |
| **One Step Per Turn** | US-0056 host-agent-environment-adapter | **Normal interactive mode only:** markdown `user-gate` fallback must yield the turn so eager models do not run Step N+1 tool calls in the same response without user confirmation. |
| **autoMode continuous** | US-0059 / `gates.md` (`781a2ef5`) | `autoMode` bypasses One Step Per Turn at step boundaries: zero prompts, auto index 0, proceed across steps. |
| **Mid-step pause markers** | US-412/413 (#413) | When a step cannot finish before the **host** ends the turn, persist `state.stepCheckpoints` + `state.turnPause` so `ws-monitor` can report `worker-session-paused` instead of `worker-session-stall`. Issue #413 explicitly allowed **either** (a) chain across host turns **or** (b) explicit pause state; implementation emphasized (b) and AC8 incorrectly codified “does not chain host turns” for all of `autoMode`. |
| **Step baton / multi-CLI** | US-0094 step-baton | `step_coordinator.cjs` + `worker_turn_guard.cjs` serialize **worker CLI processes** and coordinator gates — **orthogonal** to interactive host-turn chaining (stated in US-412/413 prior-work sweep). |

**Not from baton:** `turnPause` / `pause-turn` are observer/resume signals for interactive orchestrator sessions, not baton lease fields.

**This fix:** Reassert option (a) for `autoMode` (chain through Step 9); demote (b) to host-forced interruption only.

## Acceptance Criteria

- AC1: `ws-shared/runtime/gates.md` § Interactive execution cadence states that `autoMode` keeps the same host session through Steps 0→9 (close → `ws-ship-pr` → `ws-goal-fix-pr`) without voluntary turn stops between steps; hard stops unchanged; host-forced mid-step end uses PROTOCOLS turn-boundary pause.
- AC2: `ws-spec-to-pr/SKILL.md` `autoMode ≠ skip planning` table places host-turn chaining through Step 9 in the Does column and voluntary turn end between step boundaries in the Never column; prose matches AC1.
- AC3: `ws-spec-to-pr/STEP-DISPATCH.md` and `PROTOCOLS.md` § Automatic Mode align with AC1–AC2; `PROTOCOLS.md` § Turn-boundary pause clarifies fallback-only role in `autoMode`.
- AC4: `ws-spec-to-pr-lite/SKILL.md` states continuous close/ship/fix-pr in `autoMode` without voluntary host-turn stops between steps.
- AC5: `README.md`, `FEATURES.md`, and `.agents/specs/wiki/delivery/spec-to-pr-pipeline.md` describe continuous `autoMode` plus host-forced checkpoint/pause fallback; site wiki rebuilt when wiki source changes.
- AC6: `test/test-liveness-checkpoints.js` D1 asserts SKILL.md documents chaining (not “does not chain host turns”) and host-forced pause fallback; D2 README/FEATURES checks unchanged.
- AC7: `checkpoint` / `pause-turn` CLI behavior, schemas, and `ws-monitor` pause-vs-stall semantics from US-412/413 remain valid — no removal of operations or telemetry types.
- AC8: Completed spec US-412/413 is not rewritten; this spec records the corrected interpretation of its orchestration gap (option (a) restored for `autoMode`).
- AC9: `WORKER-TURN-RULES.md` scopes its turn rule to dispatched workers (standard dispatch, step-baton workers, inline-isolated). It states the `autoMode` orchestrator host session stays unattended through Steps 0→9 and is not a worker turn. Worker obligations stay: preview plus at least two tool calls, zero-tool-call failure, no mid-batch parent ping. `worker_turn_guard.cjs` and `step_coordinator.cjs` behavior stay unchanged.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing step baton / `step_coordinator.cjs` worker contracts | Separate multi-CLI feature (US-0094) |
| Host runtime changes to force longer turns | Harness cannot control IDE turn limits |
| Waiving planning Steps 1–3 in `autoMode` for standard/complex | US-0062 invariant unchanged |
| New config flag for “super auto” | `autoMode` already denotes continuous orchestration |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Primary unattended path | Orchestrator chains until terminal or hard stop | Matches pre-412/413 operator expectation and US-0059 AC3 | y |
| Pause markers | Only on host-forced mid-step turn end | Preserves US-412/413 monitor accuracy without blocking auto runs | y |
| Lite parity | Same continuous rule for steps 0–5 + ship/fix | Dual-mode gates contract | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Root cause documented | Lineage table distinguishes host turn, One Step Per Turn, 412/413, baton | Review Background section |
| Touch list | Gates + both orch skills + README/FEATURES/wiki + one test file | Implementation diff |
| No baton drift | STEP-DISPATCH baton sections untouched unless cross-link only | Grep / harness |
| Regression guard | D1 test encodes new prose | `node test/test-liveness-checkpoints.js` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/pending/0141-restore-automode-continuous-orchestration.spec.md` exits 0.
- `node test/test-liveness-checkpoints.js` exits 0.
- Spot-check: `gates.md`, `SKILL.md`, and `PROTOCOLS.md` contain continuous `autoMode` wording for Steps 0→9 including `ws-goal-fix-pr`; no primary “does not chain host turns” contract in active orch docs.

### Negative & Failing Test Scenarios

- Reintroducing “autoMode does not chain host turns” as the primary contract in SKILL.md or PROTOCOLS.md fails `test-liveness-checkpoints.js` D1.
- Requiring `pause-turn` between every step boundary in `autoMode` fails review against AC1.
- Removing `checkpoint`/`pause-turn` operations or `turnPause` schema fields fails US-412/413 regression tests (AC7).

## Notes

- Hard stops unchanged: HS-1, HS-5, verify below `defaults.minVerifyScore` after max scoreAndRefine rounds, merge blocked, user cancel.
- Observe long runs: `ws-monitor --watch --until-terminal` (US-412 AC16).
- Related completed specs: `0056-host-agent-environment-adapter`, `0059-host-capability-binding-v2`, `0062-us-275`, `0094-step-baton-multi-agent-runs`, `0125-us-412-413-liveness-checkpoints`.

## Original Issue Context

`source: local` — prompt-driven harness correction (restore full-auto Spec-to-PR orchestration after US-412/413 AC8 wording regression). No tracker id.
