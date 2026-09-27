---
id: 438
slug: ws-spec-to-pr-distributed
title: "Separate Multi-CLI Step Baton into a Dedicated ws-spec-to-pr-distributed Workflow"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/438"
specDate: 2026-09-27
---

# Specification — Separate Multi-CLI Step Baton into a Dedicated ws-spec-to-pr-distributed Workflow

## Description

The step-level baton / multi-CLI capability currently ships inside `ws-spec-to-pr`, making the standard orchestrator heavier than a single-host FSM needs to be. The capability surface is: `ws-spec-to-pr/scripts/step_coordinator.cjs` (deterministic Node run loop, ~956 lines / 40 KB), the shared baton primitive `ws-shared/runtime/scripts/step_baton.cjs` (~444 lines), the baton run config `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton`, the `ws-spec-to-pr/SKILL.md` § "Step-level baton runs (multi-CLI)" section, `ws-shared/runtime/host-dispatch.md` §7, `ws-shared/runtime/gates.md` § "Coordinator gate surfacing (step baton)", six dedicated test suites plus `test/fixtures/step-baton/*`, and doc references across `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `FEATURES.md`, `docs/llms.txt`, the site, and the wiki.

This spec extracts that capability into a new specialized workflow skill, `ws-spec-to-pr-distributed`, which becomes the single owner of the distributed (multi-CLI) execution layer. `ws-spec-to-pr` reverts to a lighter single-host orchestrator: it keeps the standard 0–9 FSM and step bodies, but no coordinator script, no baton run config ownership, and no coordinator gate contract.

The separation is a **behavior-preserving extraction**, not a redesign. `ws-spec-to-pr-distributed` reuses the same step skills (`ws-spec-write` … `ws-fix-pr`) and the same 0–9 step semantics; it adds only the distributed execution layer (runner mapping, coordinator loop, baton claim/release/expiry, one-shot worker spawn, coordinator gate surfacing). The distributed workflow is invoked explicitly (`/spec-to-pr-distributed` or the skill id); `ws-spec-to-pr` never selects it automatically. The baton protocol semantics, worker contract, telemetry, and monitor fields are unchanged from the shipped behavior.

Architecture touchpoints: new skill folder under `{skillsRoot}`; both skill-dependency manifests (`bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json`) under the `workflows` package; package integrity; the workflow FSM registry used by `ws-check-workflows`; the router surfaces in `AGENTS.md`, `.ws/AGENTS.md`, and `autoload.md`; and the shared-runtime docs that currently carry baton prose.

## Acceptance Criteria

### Skill separation and ownership

- AC1: A new packaged skill `ws-spec-to-pr-distributed` exists at `{skillsRoot}/ws-spec-to-pr-distributed/SKILL.md` with valid `name`, `description`, and an `invocation_names` entry; it is registered in both `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json` under the `workflows` package with an explicit `dependencies` entry.
- AC2: The coordinator and its spawn logic live at `ws-spec-to-pr-distributed/scripts/step_coordinator.cjs`; no coordinator script remains under `ws-spec-to-pr/scripts/`, and no other `ws-spec-to-pr` script owns the distributed run loop.
- AC3: `ws-spec-to-pr/SKILL.md` no longer documents `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` or the coordinator invocation; the former "Step-level baton runs" section is reduced to at most a two-line neutral pointer to `ws-spec-to-pr-distributed`, and the resulting file is strictly smaller in byte size than the pre-change file.
- AC4: Baton-specific prose is owned by the distributed workflow: the "Step-level baton runs (multi-CLI coordinator)" section of `host-dispatch.md` and the "Coordinator gate surfacing (step baton)" section of `gates.md` are re-homed into the distributed skill (or its references) so the shared runtime files loaded by `ws-spec-to-pr` carry no coordinator-language surface beyond at most a cross-reference.
- AC5: The shared baton primitive `step_baton.cjs` remains a neutral shared helper under `ws-shared/runtime/scripts/`; only `ws-spec-to-pr-distributed` requires it, and the dependency is recorded in the graph.

### Distributed workflow behavior (parity)

- AC6: `ws-spec-to-pr-distributed` drives the standard 0–9 step set by delegating each step to the existing shared pipeline skills; unmapped steps execute through the existing single-host dispatch tiers (Tier 1/2/3) and mapped steps execute through the coordinator, with no change to step numbering or step semantics.
- AC7: The distributed workflow preserves the shipped baton contract unchanged: revision-checked claim with atomic dual-write, exactly-once release on `finish` in the same update that advances `currentStep`, re-claimable lease expiry with logged attempts, `blocked` after `maxAttempts` (default 2), one-shot non-interactive workers, and gate-shaped worker output recorded as a protocol violation without advancing.
- AC8: `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` remain valid config keys validated fail-closed by `ws-spec-to-pr-distributed` before Step 0; an unknown step key, unknown runner id, or empty command fails fast with a named error and starts no partial run.
- AC9: `ws-spec-to-pr` ignores `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` entirely when they are present and continues single-host dispatch; configuring runners alone never starts a distributed run.

### Invocation and routing

- AC10: `ws-spec-to-pr-distributed` is opt-in: it runs only on explicit invocation (`/spec-to-pr-distributed` or its skill id). The `ws-spec-to-pr` classifier, `ws-spec-multi`, and any auto-router do not select it without an explicit consumer choice.

### Tests, package integrity, and harness

- AC11: The baton test suites (`test-step-coordinator.js`, `test-step-baton-config.js`, `test-step-baton-claim.js`, `test-step-baton-telemetry.js`, `test-step-baton-monitor.js`, `test-step-baton-specmemo.js`) and `test/fixtures/step-baton/*` reference the new skill path and pass; `test/test-suites.json` entries are updated to the new paths.
- AC12: `ws-check-harness` and `test/test-harness-clean.js` report 0 findings at the package root after the move (no dangling link to the old coordinator path, Node-only runtime intact, dependency graph complete); `npm run verify-integrity` passes after `npm run generate-integrity`.
- AC13: `ws-check-workflows` recognizes `ws-spec-to-pr-distributed` as a supported workflow and its simulated FSM does not regress; a missing/unknown workflow id still fails closed.
- AC14: `package.json` `version` and `packageVersion` in `bin/skill-dependencies.json` are bumped once for the release, and the baton capability is indexed/routed to `ws-spec-to-pr-distributed` in `AGENTS.md`, `.ws/AGENTS.md`, `README.md`, `FEATURES.md`, `CATALOG.md`, `autoload.md`, `docs/llms.txt`, and `docs/index.html`.

### Documentation and dependency sync

- AC15: Every live reference to `ws-spec-to-pr/scripts/step_coordinator.cjs` and the baton run config that survives in code, tests, or docs points at the new owner; no consumer-facing doc attributes the baton feature to `ws-spec-to-pr` without naming `ws-spec-to-pr-distributed`.
- AC16: The skill dependency-graph check is applied to both the new skill and `ws-spec-to-pr`: callers (router, `ws-check-workflows`, installer packages, docs) and callees (shared pipeline skills, `ws-shared/runtime/scripts/step_baton.cjs`) still match their contracts, and any stale edge from the old ownership is removed.
- AC17: The delivery PR body carries `Closes #438` (GitHub default-branch auto-close on merge to `main`): the spec frontmatter keeps `source: github` + `id: 438` through `ws-spec-provider-local` register, and `ws-ship-pr` runs `ensure_pr_closer.cjs --id 438` so the source issue closes without a manual step. The workflow is started from this spec file so the spec of record stays `0143-ws-spec-to-pr-distributed.spec.md`.

## Original Issue Context

### Prior Work Sweep

- `git log` on `step_coordinator.cjs` / `step_baton.cjs` shows the baton layer was introduced and merged as PR #350 ("step-level baton handoffs for multi-CLI workflow runs"), then hardened by PR #354 (worker-turn dispatch contract) and PR #377 (harness hardening) — all merged. No baton work is open.
- `gh pr list --state all --search "baton OR distributed"` returns only merged PRs (#350, #377, #306, #373, #433, #277); no open PR targets a distributed/split workflow.
- Repository keyword sweep for `distributed` matches only `bin/skill-integrity.json` (path/name noise); no existing `ws-spec-to-pr-distributed` skill, spec, or plan tree exists.
- Related-but-not-overlapping: PR #350 shipped the feature as a mode of `ws-spec-to-pr` (spec `completed/0094-step-baton-multi-agent-runs.spec.md`); this spec extracts the same feature under a dedicated workflow id. No duplicate work found.

### Design Intent

- Design intent of the shipped feature (spec `0094`, PR #350) was to add multi-CLI step spread **as an optional run mode of the single standard orchestrator**, reusing the shared pipeline skills and the workflow state file as the sole turn signal. That intent is preserved: the extraction keeps the same FSM, the same state-file baton, and the same worker contract.
- The behavior archaeology for this spec is a **modification/extraction**, not a bugfix. `git log` confirms the feature was intentionally embedded in `ws-spec-to-pr` rather than isolated; this spec re-homes it to keep the standard orchestrator lighter. No `git log -p -S "<symbol>"` behavior restoration is required because no behavior is being restored.
- Constraint to keep: the state file remains the only turn signal; no side-channel or IPC bus is introduced by the split.

## Notes

- **Recovery mirror:** GitHub issue [#438](https://github.com/jpolvora/workflow-skills/issues/438) is the tracker of record and mirrors this spec and its context companion for recovery. `source: github` + `id: 438` make `ws-ship-pr` emit `Closes #438` in the PR body, so merging the implementation PR into the default branch (`main`) auto-closes the issue. Start the workflow from this local spec file (not by re-fetching issue #438) so the spec of record stays `0143-ws-spec-to-pr-distributed.spec.md`.
- **Behavior-preserving extraction:** the distributed workflow is a runtime/execution layer over the existing 0–9 FSM. It must not fork the step index, the artifact names, or the gate vocabulary; those stay in `ws-spec-to-pr` / `ws-shared/runtime`.
- **Ownership transfer, not rename:** the new id is `ws-spec-to-pr-distributed`; no legacy alias for the standard orchestrator is added (latest layout only). The baton config keys are unchanged so consumer configs keep working.
- **Harness neutrality:** skill prose, schema, and docs must not name host products as required runner values; runner ids stay opaque neutral strings and commands are local example values only.
- **Relation to `stepModels`:** model routing (`stepModels`, `modelPresets`) stays in `ws-spec-to-pr`; the distributed workflow adds runner routing. Both compose: a mapped step may still carry a model hint the worker CLI consumes.
- **Relation to `ws-check-workflows`:** the workflow FSM registry must list the new id so `ws-check-workflows` does not treat it as an unknown workflow.
- **Lite:** the distributed capability is standard-only in this spec; `ws-spec-to-pr-lite` keeps its inline 0–5 path.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Redesigning the baton protocol, telemetry, or worker contract | This is a behavior-preserving extraction; semantics stay identical to the shipped feature |
| A distributed variant of `ws-spec-to-pr-lite` | Only the standard 0–9 distributed run is in scope; lite keeps its inline path |
| Renaming or removing `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` | Keeping the keys avoids consumer migration churn; only their ownership moves |
| Auto-selecting the distributed workflow from `ws-spec-to-pr` or `ws-spec-multi` | The new workflow stays explicit opt-in to preserve standard-run behavior |
| Multi-machine queues, brokers, live IPC, or runner CLI provisioning | Same boundary as spec `0094`: same-machine, same-repo, operator-provisioned runners only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Distributed shape | Thin specialized layer over the standard 0–9 FSM that reuses shared step skills | Keeps one FSM source of truth and avoids step-index drift; a full copy would double maintenance | y |
| Baton config keys | Stay under `defaults` (`stepRunners` / `runners` / `stepBaton`), ownership moves to the distributed workflow | No consumer config migration; the shared schema stays valid and only read by the new owner | y |
| Shared primitive location | `step_baton.cjs` stays in `ws-shared/runtime/scripts` | It is a neutral reusable primitive; moving it into the skill would duplicate shared runtime conventions | y |
| `ws-spec-to-pr` pointer | At most a two-line neutral pointer to the new skill; no legacy coordinator command | Latest layout only; keeps the standard body smaller while remaining discoverable | y |
| Backward-compat shims | None (no old-path alias, no dual invocation) | Matches the harness "no compatibility maintenance" rule; `update` rewrites managed skills | y |
| Input validation and bounds | Runner ids/step keys/commands validated fail-closed before Step 0 (AC8) | Inherited from the shipped behavior; no new bounds | y |
| Auth boundaries and rate limits | N/A because the coordinator spawns local configured commands in one repo with no network service or multi-tenant surface | There is no auth plane to gate | y |
| Data lifecycle / expiry | N/A because no new persisted data is introduced; the baton lease/TTL behavior is unchanged from spec `0094` | Existing state/telemetry lifecycle is reused as-is | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only the extraction of the baton/distributed layer plus its package, test, and doc sync; no protocol redesign | Scope matches the Out of Scope table |
| Atomic criteria | Each AC names one actor, one trigger, and one observable outcome (new owner, removed reference, parity, or gate) | AC-by-AC review against `FORMAT.md` testability rules |
| Failure modes | Unknown runner/step/empty command, worker crash/timeout/missing `finish`, gate-shaped worker output, and stale old-path references each map to a named error or harness finding | Trace each mode to AC8, AC11, AC12, AC13, AC15 |
| Observation telemetry | Baton events (`baton_*` / `runner_*`) in `telemetry.jsonl` with step/holder/attempt/exit fields, plus read-only `ws-monitor` holder/lease fields | Event names and monitor fields unchanged from spec `0094`; verified by `test-step-baton-telemetry.js` and `test-step-baton-monitor.js` |
| Zero open blockers | No unresolved product choice remains; implementation decisions live in the context companion | Context companion Implementation Decisions section holds everything not decided here |
| Harness neutrality | No host product name appears as a schema key, runner id contract value, or skill term | Text search over the implementing change for product-coupled contract terms |
| Node-only runtime | New/moved scripts are CommonJS `.cjs` requiring shared helpers; no `.py` files under `.agents/skills/` or `bin/` | `ws-check-harness` critical Python check reports none; script headers use `require(...)` for `step_baton.cjs` |
| Dependency-graph integrity | Both dependency manifests and the caller/callee contract check are updated for the new skill and `ws-spec-to-pr` | `bin/skill-dependencies.json` diff plus `ws-check-harness` Phase 5a clean; see hub `AGENTS.md` § Harness change protocol step 4 |
| Integrity and version | `npm run generate-integrity` + `npm run verify-integrity` pass; one package version bump for the release PR | Integrity command exit 0; `packageVersion` strictly above the merge-base |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node {skillsRoot}/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs --help` exits 0; `Test-Path {skillsRoot}/ws-spec-to-pr/scripts/step_coordinator.cjs` is false.
- `rg -n "step_coordinator|stepRunners|stepBaton" {skillsRoot}/ws-spec-to-pr` returns no coordinator invocation; a positive match remains only in the new skill and shared `step_baton.cjs`.
- `node test/test-step-coordinator.js`, `test-step-baton-config.js`, `test-step-baton-claim.js`, `test-step-baton-telemetry.js`, `test-step-baton-monitor.js`, `test-step-baton-specmemo.js` each exit 0.
- `npm run test` (`verification.backendTest`) and `test/test-harness-clean.js` (0 findings) exit 0; `npm run verify-integrity` exits 0.
- Baton run emits `baton_claimed` / `baton_released` / `runner_spawned` / `runner_exited` in `telemetry.jsonl` and `ws-monitor` shows `baton.holder`, `baton.step`, `leaseUntil` for an active distributed run.
- `node {skillsRoot}/ws-ship-pr/scripts/ensure_pr_closer.cjs --body-file {plansDir}/pr-body.md --id 438 --provider github --dry-run` exits 0 with `status: dry-run` and `Closes #438` in the body; re-running reports `status: unchanged`.

### Negative & Failing Test Scenarios

- Old coordinator path still referenced anywhere (docs, tests, installer package, router): `ws-check-harness` link check fails with the stale path named; the change must remove it before ship.
- `ws-spec-to-pr` run with `defaults.stepRunners` configured: it must run single-host and must not spawn the coordinator (proves the ownership separation).
- Distributed run maps a step to an undeclared runner id, an out-of-range step key, or an empty command: the run refuses to start with a named error before Step 0 and produces no step artifacts.
- Worker exits 0 without calling `finish`, or emits gate-shaped output: the coordinator records a protocol violation / failed attempt and does not advance `currentStep`.
- A worker or caller requires `step_baton.cjs` from a path that resolves outside the resolved `ws-shared` runtime: the resolver fails closed rather than loading a stale or foreign runtime.
- `ws-check-workflows` invoked with `ws-spec-to-pr-distributed` while the id is absent from the FSM registry: it must fail closed with an unknown-workflow error rather than reporting a passed simulation.
