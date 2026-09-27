---
id: null
slug: plan-artifacts-consolidation
title: "Plan Directory Artifacts Consolidation & Minimal Runtime Footprint"
source: local
specDate: 2026-09-07
status: completed
---

# Specification — Plan Directory Artifacts Consolidation & Minimal Runtime Footprint

## Description

In the current `ws-spec-to-pr` and `ws-spec-to-pr-lite` pipelines, running a workflow creates an explosion of 25 to 30 individual files in the plan directory (`{plansDir}/{slug}/`). This high artifact count creates cognitive clutter for engineers, complicates git reviews, causes IDE tree pollution, and increases risk of accidental commits or merge drift.

Analysis reveals that this explosion is not caused by core deliverables, but rather by redundant state formats, micro-fragmentation of step handoffs, per-step telemetry logs, and dummy boilerplate files:
1. **Quadruple State Redundancy:** A single workflow run concurrently maintains four separate state representations (`{workflow-id}.state.json`, `{workflow-id}.state.md`, `run.json`, and `RUN.md`), updated on every state transition.
2. **Step Handoff Fragmentation:** Every step completion writes a new JSON file (`handoff/step-00.json`, `handoff/step-01.json`, etc.), producing up to 10 separate files solely for LLM prompt hygiene.
3. **Telemetry Log Fragmentation:** Telemetry writes a new file for every step (`telemetry/step-00.jsonl` through `step-09.jsonl`), spawning 10 separate append-only streams.
4. **Boilerplate Sequential Stubs:** In standard sequential mode (`defaults.enableDag: false`, the default setting), Step 3 still writes dummy stub files (`step-03-*.exec.dag.json` and `step-03-*.plan.exec.md`) solely to satisfy pre-advance validators.
5. **Decoupled Verification Ledger:** `ac-ledger.json` tracks AC verification proof as a standalone file rather than as an integral property of the workflow state.
6. **Leakage & Accidental Files:** Temporary provider files (e.g. `.tmp-wi-*.json`) and stray catalog indexes (`index.json`) occasionally leak into the plan directory.

This specification unifies runtime state into a clean architecture:
> **The Real Step Deliverables (`*.md`) + 1 Unified State File (`.state.json`) + 1 Single Telemetry Stream (`telemetry.jsonl`)**, eliminating all redundant state duplicates, file-per-step sprawl, and dummy sequential stubs.

This version executes an intentional **Clean Break (SemVer 0.4.0)**: backward-compatibility maintenance for pre-0.4.0 artifact structures is dropped. Legacy fallback code, migration shims, dual defaults, and obsolete file checks are pruned entirely, resulting in the leanest, fastest, most portable, and most optimized engine.

This architecture is fully compatible with both the Standard (`ws-spec-to-pr`, steps 0–9) and Lite (`ws-spec-to-pr-lite`, steps 0–5) orchestrators, and operates smoothly under Full Auto Mode (`autoMode: true`), auto-selecting index 0 / recommended options across all step transitions.

## Acceptance Criteria

- AC1: The canonical plan folder structure is consolidated so that only core engineering deliverables (`step-00-*.spec.md`, `step-01-*.plan.md`, `step-02-*.plan.refined.md`, `step-05-*.plan.report.md`, `step-06-*.review.md`, `step-08-*.result.md`, `attachments/`) exist as standalone Markdown/asset files.
- AC2: `{workflow-id}.state.json` (`STATE_VERSION: 3`) serves as the sole, unified machine source of truth, folding run status/estimates, step handoffs (`handoffs: { "0": {...}, ... }`), and AC ledger records (`acLedger: [...]`) into a single structured file.
- AC3: Generation of redundant `run.json` is eliminated; consumers and tools reading run metadata read `{workflow-id}.state.json` directly.
- AC4: Human-facing run dashboarding is unified into `{workflow-id}.state.md` (or `RUN.md`), eliminating the generation of multiple competing Markdown status dashboards.
- AC5: Telemetry events across all steps (dispatch, finish, gate-bypass) are written into a single append-only `{us-dir}/telemetry.jsonl` log file, eliminating the `telemetry/step-NN.jsonl` directory tree.
- AC6: In sequential execution mode (`defaults.enableDag: false`), Step 3 no longer writes dummy `step-03-*.exec.dag.json` or `step-03-*.plan.exec.md` stubs to disk; `validate_state.cjs` `--pre-advance 4` recognizes `dag-disabled` without requiring dummy stub files.
- AC7: `plan.index.json` is treated as a transient cache: it is either computed dynamically in-memory during dispatch or placed in `.runtime/plan.index.json`, keeping the plan root clean of LLM slicing caches.
- AC8: Work item fetchers (`ws-spec-provider-azure-devops`, `ws-spec-provider-github`) clean up all temporary `.tmp-*.json` files upon completion, and the root catalog `index.json` is strictly prevented from being written inside `{us-dir}`.
- AC9: Clean Break & Zero Legacy Baggage: Legacy compatibility shims, dual-read paths, and historical fallbacks for pre-0.4.0 artifact layouts are completely removed; package version bumps to `0.4.0`. Old multi-file layouts are not enforced or supported.
- AC10: Parity with `ws-spec-to-pr-lite`: the simplified artifact layout is 100% compatible with the lite orchestrator (Steps 0–5 inline), ensuring identical state unification, single telemetry logging, and handoff extraction.
- AC11: Full Auto Mode (`autoMode: true`): the consolidated artifact system supports continuous execution across all step boundaries without halts, deterministically executing index 0 (Recommended) gate decisions, and closing/staging delivery artifacts cleanly.

## Notes

- This is a clean-break major architectural release (v0.4.0); no shims or backward-compatibility baggage are retained for pre-0.4.0 states.
- Core deliverable files maintain clear, consistent naming so that PR delivery staging (`includeRefinedPlan`, `includeDeliveryResult`, etc.) and code review diffs remain unaffected.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merging core step deliverable Markdown files | Each step deliverable (`spec`, `plan`, `refined`, `report`, `review`, `result`) represents a distinct engineering phase and audit checkpoint that must remain individually diffable and committable. |
| Eliminating the human Markdown state view | Humans still need a readable Markdown state file in the directory without parsing raw JSON. |
| Backwards compatibility with 0.3.x workflow folders | Explicit clean break to achieve the leanest, most optimized architecture. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| SemVer version bump | `0.4.0` | Signals clean break with dropped compatibility for older 0.3.x layouts. | y |
| State schema version | `STATE_VERSION = 3` | Distinguishes unified state from legacy v2 state. | y |
| Storage of handoff summaries | Inside `state.json` under `handoffs` object | Avoids creating 10+ sub-files; handoff payloads are bounded (≤8KB). | y |
| Storage of AC ledger | Inside `state.json` under `acLedger` array | The ledger directly drives state verification score; co-locating avoids dual-write sync issues. | y |
| Single telemetry location | `{us-dir}/telemetry.jsonl` | Append-only stream where each line contains step, timestamp, and duration. | y |
| Lite parity | Same runtime helper (`workflow_state.cjs`) | Both pipelines share `workflow_state.cjs` for dispatch, finish, and validate. | y |
| Auto mode gate handling | Index 0 auto-selection persisted in `state.gateDecision` | Aligns with existing `gates.md` rule 6/48 contract without behavioral divergence. | y |
| Other implicit requirement dimensions | N/A because all changes are internal runtime and state serialization refactorings. | Bounded by architectural scope. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Spec Validation | `validate_spec.cjs --mode=authoring` passes | CLI exit code 0 |
| Clean Break Verified | Legacy shims pruned, STATE_VERSION = 3, version = 0.4.0 | Package and contract tests passing |
| Lite & Auto Parity | Both standard and lite execute under autoMode without missing artifact errors | Automated tests passing for standard & lite |
| Zero Open Blockers | Tooling dependencies (`build_dispatch_context`, `update_state`, `validate_state`) aligned | Verification commands exit 0 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Number of files in `{us-dir}` for a completed run drops from 25–30 files down to 8–10 files.
- Both `ws-spec-to-pr` and `ws-spec-to-pr-lite` pass `--pre-advance` validation without generating `run.json`, `handoff/*.json`, or `step-03` sequential stubs.
- In `autoMode: true`, workflows advance end-to-end with zero user prompt halts, logging index 0 decisions cleanly.

### Negative & Failing Test Scenarios

- A workflow running in sequential mode (`enableDag: false`) without `step-03-*.exec.dag.json` must NOT fail `--pre-advance 4`.
- A lite workflow advancing to Step 2 or Step 4 without separate `handoff/` files must find handoffs in `state.json` without errors.
- In auto mode, a failure score below `minVerifyScore` must not auto-advance into Step 6.
- A state with legacy `stateVersion: 2` fails closed cleanly under `STATE_VERSION: 3`.
