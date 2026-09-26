---
id: null
slug: step-baton-multi-agent-runs
title: "Step-Level Baton Handoffs for Multi-CLI Workflow Runs"
source: local
specDate: 2026-09-18
---

# Specification — Step-Level Baton Handoffs for Multi-CLI Workflow Runs

## Description

Add a run configuration that maps each `ws-spec-to-pr` workflow step to a neutral runner (a CLI command template), plus a deterministic coordinator process that passes a step-level baton from runner to runner until the run completes. Today one orchestrator session owns steps 0–9 and dispatches subagents inside a single host (Tier 1 native tool, Tier 2 CLI runner, Tier 3 inline), with per-step model routing via `defaults.stepModels`. That covers model choice within one host, not step execution spread across several CLIs or hosts on the same machine and repository.

The feature introduces three pieces. First, a `stepRunners` run-config map (step number to runner id) and a `runners` table (runner id to command template, timeout, and environment) stored in the project hub config. Runner ids are opaque neutral strings; no host product name is ever a contract key. Second, a first-class `baton` record on the workflow state (`holder`, `step`, `claimedAt`, `leaseUntil`, `revision`) with an atomic claim/release protocol layered on the existing dual-write state file and `state.handoffs` entries. The state file stays the sole turn signal: the baton holder for `currentStep` is the only runner allowed to act. Third, a deterministic coordinator script (plain Node, no LLM) that owns the run loop: claim the baton for the current step, spawn the mapped worker CLI one-shot with sparse context pointers, await exit, verify the state advanced, and repeat. Workers never poll and never idle; only the coordinator watches state, at a configured interval.

This design borrows baton semantics from the external `spec-memo` session-handoff pattern (structured forward-looking payload, exactly-once claim, isolation scoping) but keeps the workflow state file as the source of truth, since step advancement, gates, and telemetry already live there. Isolation is scoped by `workflowId` (plus branch) instead of owner, because one run has one logical baton regardless of which human started it. All Transition Gates and `user-gate` prompts surface at the coordinator (pause-and-prompt, or index 0 in `autoMode`); worker invocations run non-interactive and must not emit gates.

## Acceptance Criteria

### Run config schema

- AC1: The project hub config accepts `defaults.stepRunners` (step number to runner id) and `defaults.runners` (runner id to `{command, timeoutSeconds, env}`); the command template supports `{prompt}`, `{cwd}`, `{slug}`, and `{step}` substitutions with the same vocabulary as the Tier 2 CLI template.
- AC2: Runner ids are opaque neutral strings validated against `defaults.runners`; an unknown step key, an unknown runner id, or an empty command fails fast with a named error before Step 0 dispatch and never starts a partial run.
- AC3: Steps without a runner mapping fall back to the current single-host dispatch (Tier 1/2/3 plus `stepModels`); a run config may map any subset of steps, including a single step.
- AC4: Runner map keys are validated against the owning `workflowType` step set (0–9 standard, 0–5 lite); a key outside the set fails fast with a named error.

### Baton claim protocol

- AC5: The workflow state carries a `baton` record `{holder, step, claimedAt, leaseUntil, revision}`; a claim succeeds only when the presented revision equals the stored revision and no live lease exists, and the write goes through the existing atomic dual-write path.
- AC6: Step completion releases the baton exactly once: `finish` writes the step handoff, clears the holder, and advances `currentStep` in the same atomic update; the next runner may claim only the baton for the new `currentStep`.
- AC7: A lease past `leaseUntil` with no `finish` becomes re-claimable by the coordinator, which logs the expiry with old holder, step, and attempt count; after `maxAttempts` (default 2) consecutive expiries on one step the workflow moves to `blocked` and the coordinator stops.
- AC8: Concurrent claim attempts serialize on the revision check; the loser receives a named conflict error and retries with backoff, and no step body ever executes twice for the same attempt.

### Coordinator runner

- AC9: A deterministic coordinator script (plain Node, no LLM session) owns the run loop for one `workflowId`: read config and state, claim the baton, spawn the mapped worker, await exit, verify advancement, repeat until terminal status.
- AC10: The coordinator is the only polling party: it re-reads state on a configured interval (default 30s, allowed range 5–300s) to detect external advancement; worker CLIs are spawned one-shot per turn and never left idling or polling.
- AC11: All Transition Gates and `user-gate` prompts surface at the coordinator as pause-and-prompt, or auto-apply index 0 in `autoMode`; a worker process must not emit a gate, and a gate-shaped worker output is recorded as a worker protocol violation without advancing the step.
- AC12: The coordinator verifies post-exit that `currentStep` advanced and the expected step artifacts exist on disk; a clean exit without advancement is treated as a failed attempt under the AC7 retry policy, never as success.

### Worker invocation contract

- AC13: Each worker spawn receives the Tier 2 sparse-pointer payload (spec path, plan index, AC ledger, prior handoff) plus its baton envelope `{step, holder, leaseUntil, attempt}`; the worker must call `finish` for its step before exit.
- AC14: A non-zero worker exit, a timeout past `timeoutSeconds`, or a missing `finish` leaves the step unadvanced; the coordinator records failure telemetry and applies the AC7 retry policy instead of advancing.

### Observability

- AC15: Every claim, release, expiry, spawn, and exit appends to the run `telemetry.jsonl` as `baton_claimed`, `baton_released`, `baton_lease_expired`, `runner_spawned`, or `runner_exited` with step, holder, attempt, and exit code fields.
- AC16: State readers derive the current holder, lease, and mapped runner per step from the state file alone with no side-channel files; `ws-monitor` snapshots include the baton holder and lease without changing their read-only contract.

### External-dependency interop

- AC17: When spec-memo integration is enabled, the coordinator mirrors each released step handoff summary into the vault handoff payload shape (`nextSteps` from the next-step pointers); when integration is disabled the run behaves identically with zero vault calls.

## Notes

- Relation to `stepModels`: model routing picks which model executes a dispatch inside one host; step runners pick which CLI process executes a step across hosts. The two compose: a mapped step may still carry a model hint that the worker CLI consumes when it supports one.
- Relation to Tier 2: worker spawning reuses the `cliTemplate` substitution vocabulary and context-pointer payload from `host-dispatch.md`; the coordinator is a durable driver around that one-shot mechanism, not a new dispatch tier.
- Relation to `spec-memo` session handoff (`0036`): borrowed semantics are structured forward payload, exactly-once claim, and isolation scoping. Not borrowed: owner-scoped async next-session delivery, which fits human session switching but not a single run with one logical baton; here isolation is `workflowId` plus branch.
- Prior-work sweep (local keyword plus `git log`): `state.handoffs` keyed by step, dual-write state sync, host detection adapter with subagent strategies, and a benchmark runner exist; no step-to-CLI run config or baton claim protocol exists. No exact-duplicate open work found; related handoff-runtime commits are complementary, not overlapping.
- Design intent: greenfield (new config keys plus a new coordinator script); no `git log -S` behavior archaeology applies, so this section records the skip.
- Harness neutrality: skill prose, schema, and docs for this feature must not name host products as required values; product CLIs appear only as local example values in templates and docs.
- Lease sizing guidance: default `leaseUntil` equals spawn time plus three times the runner `timeoutSeconds`, so a hung worker always expires without manual cleanup.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live bidirectional messaging between concurrent runners | Batons are sequential turn transfers, not an IPC bus; same boundary as the `spec-memo` handoff |
| Multi-machine or queued distributed orchestration | Same-machine same-repo only; no broker, queue, or remote agent provisioning |
| Automatic runner CLI installation or authentication | The operator provisions CLIs and credentials; the coordinator only spawns configured commands |
| LLM sessions idling in poll loops | Waiting is done by the deterministic coordinator; worker CLIs spawn one-shot per turn |
| Changes to lite step numbering or the Step 8/9 gate menus | Existing step sets and gate options are reused unchanged |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Coordinator process model | One long-lived Node process per `workflowId` | Single claim authority removes peer races and keeps gates in one place | y |
| Turn signal channel | Workflow state file only | Step advancement, handoffs, and telemetry already live there; no new channel to secure | y |
| Poll interval default | 30s, configurable 5–300s | Balances reaction time against disk churn on shared checkouts | y |
| Lease default | 3x runner `timeoutSeconds` | A hung worker always expires; the multiplier covers slow spawns without manual cleanup | y |
| Max attempts per step | 2 consecutive expiries or failures, then `blocked` | Bounds infinite retry while tolerating one transient failure | y |
| spec-memo mirror | Optional write-through when integration is enabled | Human-readable continuity without a hard dependency on the vault | y |
| Auth boundaries and rate limits | N/A because the coordinator spawns local commands in one repo with no network service or multi-tenant surface | No auth plane to gate | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Standard and lite step sets with per-step runner map, baton protocol, coordinator loop, and telemetry only | Scope matches Out of Scope table with no extra runners or brokers |
| Atomic criteria | Each AC names one actor, one trigger, and one observable outcome | AC-by-AC review against `FORMAT.md` testability rules |
| Failure modes | Claim conflict, lease expiry, worker crash, timeout, missing finish, and gate violation each map to a named error plus retry or stop behavior | Trace each mode to AC5–AC8 or AC11–AC14 |
| Observation telemetry | Claim, release, expiry, spawn, and exit events are named with required fields | Event list matches AC15 field set |
| Zero open blockers | No unresolved product choice remains; deferred ideas live in the context companion | Context companion Deferred Ideas section holds everything not decided here |
| Harness neutrality | No host product name appears as a schema key, required value, or skill contract term | Text search over the implementing PR for product-coupled contract terms |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `runner_spawned` with `{step, holder, attempt}` followed by `baton_released` with the same attempt after a healthy worker turn.
- `baton_claimed` conflict path emits a named revision-conflict error to the loser and a retry with backoff, with no duplicate step execution.
- `baton_lease_expired` after a hung worker, then a fresh `baton_claimed` with `attempt + 1` for the same step.
- Coordinator log line on external advancement detected during a poll tick, including old and new `currentStep`.
- `ws-monitor` snapshot shows `baton.holder`, `baton.step`, and `leaseUntil` for the active run.

### Negative & Failing Test Scenarios

- Two coordinators claim the same step at the same revision: exactly one claim wins and the loser receives the named conflict error.
- Worker exits 0 without calling `finish`: the coordinator treats the turn as a failed attempt and does not advance `currentStep`.
- Worker exceeds `timeoutSeconds`: the coordinator kills the spawn, records `runner_exited` with timeout cause, and applies the retry policy.
- Run config maps a step to an undeclared runner id: the run refuses to start with a named error before any dispatch.
- Worker emits gate-shaped output: the coordinator records a protocol violation and the step stays unadvanced.
- State file edited out-of-band mid-run (revision jump): the coordinator stops with a named changed-underfoot error instead of overwriting the edit.
- Claiming a baton for a non-current step is rejected even when the lease is free.
