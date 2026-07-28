---
id: null
slug: continuous-ai-verification-quality-gates
title: "Continuous AI Verification & Quality Gates Engine"
source: local
specDate: 2026-07-28
---

# Specification — Continuous AI Verification & Quality Gates Engine

## Description

Enhances the existing `ws-spec-to-pr` / `ws-spec-to-pr-lite` orchestrators with a unified quality-gate layer. Three subsystems are **already implemented** (pre-PR fable-judge gate, post-step state validation, complexity classification in `ws-multi-spec`) but lack formal gate/board integration and standalone accessibility. Four subsystems are **new work**: pre-advance CI validation, JSONL telemetry streaming, gate bypass mechanism, and cross-workflow aggregate telemetry.

## Gap Analysis

| AC | Feature | Existing | Missing |
|----|---------|----------|---------|
| AC1 | Pre-PR fable-judge gate | Gate runs in `ws-ship-pr` Step 1 (Preflight); verdict from Steps 5/6; blocks on `REFUTED` when all 3 flags true | Fable-judge verdict not shown on PREPARE board; gate is invisible to user |
| AC2 | Workflow CI state validation | `validate_state.py` runs post-step via `update_state.py`; HS-5 halts on corrupted state; checkpoint tags created | Pre-advance validation before dispatching next step; checkpoint tag existence verification; pre-dispatch artifact presence check |
| AC3 | Complexity classifier | `ws-multi-spec` Smart Flow Auto-Detection (frontmatter + `dagThresholds`); standard orch Complexity gate (`simple`/`standard`/`complex`) | No classifier at Step 0; no `--classify` flag; no standalone classifier skill; no formal recommendation artifact |
| AC4 | JSONL telemetry | `state.md` telemetry (step durations, tokens, LOC); Step 8 benchmark; telemetry log table | JSONL files; `{plansDir}/{slug}/telemetry/` directory; score/gate-verdict/error capture in telemetry; streaming append |
| AC5 | Gate bypass | None | `--skip-gates` flag; `skipQualityGates` config; bypass telemetry recording |
| AC6 | `scoreAndRefine` classifier integration | `scoreAndRefine` drives 2-pass loop; `dagThresholds` respected by both classifiers | `scoreAndRefine` not wired into classifier logic; classifier ignores 2-pass analysis |
| AC7 | Aggregate telemetry | None | `aggregate.json`; cross-workflow analysis; regeneration on workflow completion |

## Acceptance Criteria

### Existing (requires formalization, not new implementation)

- **AC1**: Pre-PR fable-judge gate verdict appears as a mandatory row in `PREPARE-CHECKLIST.md` (between existing rows 4 and 5), showing audit verdict (`VERIFIED` / `VERIFIED WITH CAVEATS` / `REFUTED`) and blocking status. The existing Step 1 preflight check remains the enforcement mechanism; the board row makes it visible and auditable. `REFUTED` → ❌ and STOP.

### New Work

- **AC2**: Pre-advance CI gate runs before each step dispatch (Steps 1–8), verifying:
  - Checkpoint tag `uswf/{workflow-id}/before-step-{N}` exists and points to a valid commit
  - Required input artifacts for step N exist on disk (per `ARTIFACTS.md` step input table)
  - `completedSteps` in `state.md` is strictly monotonic (no gaps, no duplicates)
  - On failure: HS-5 and prevent dispatch. On success: proceed to Step Entry Gate.
  - Lite orchestrator gets equivalent pre-advance validation for Steps 1–5.

- **AC3**: Standalone complexity classifier skill (`ws-classify-complexity`) that:
  - Runs at Step 0 (before spec finalization) or via `--classify` flag
  - Analyzes spec file content (section count, requirement count, estimated file count from references, layer count from stack config)
  - Compares against `config.json.dagThresholds` and `scoreAndRefine` flag
  - Outputs formal recommendation artifact `step-00-{slug}.classify.md` with: recommended pipeline (`standard`/`lite`), reasoning, threshold comparison, `scoreAndRefine` consideration
  - User gate offers override: **Accept recommendation** / **Override to standard** / **Override to lite**

- **AC4**: JSONL telemetry subsystem that:
  - Writes append-only JSONL records to `{plansDir}/{slug}/telemetry/step-{NN}.jsonl` on each step completion
  - Each record contains: `timestamp`, `step`, `label`, `elapsedSec`, `promptTokens`, `completionTokens`, `filesTouched`, `model`, `verificationScore` (Steps 5/6), `fableVerdict` (Steps 5/6/8), `gateDecision` (advance/pause/stop), `errors` (array of error strings), `bypassed` (boolean)
  - No PII, no secrets, no source code content — verdict hashes and scores only
  - Existing `state.md` telemetry remains unchanged (dual-write: state.md for state recovery, JSONL for analytics)
  - `{plansDir}/{slug}/telemetry/` is created lazily on first write

- **AC5**: Gate bypass mechanism:
  - `--skip-gates` CLI flag on `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-ship-pr` skips all quality gates (fable-judge, CI validation, complexity classification, telemetry scoring) while still running mandatory build/test/security checks
  - `config.json.invariants.skipQualityGates: true` has the same effect without CLI flag
  - Every bypassed gate records a telemetry event: `{type: "gate-bypass", gate: "{name}", reason: "skip-gates|config", timestamp: ISO}`
  - Progress Board and final delivery result display a prominent `[GATES BYPASSED]` banner
  - `auditVerdictsBlockShip` still blocks ship even when `--skip-gates` is passed (safety: bypass speeds up workflow but doesn't allow shipping REFUTED code)

- **AC6**: Complexity classifier integrates `scoreAndRefine`:
  - When `scoreAndRefine: true`, classifier considers task scoring distribution from Pass 1 (score spread, low-scoring clusters) as an additional signal for pipeline recommendation
  - A spec with high task-count but uniform high scores may still recommend `lite`; a spec with moderate task-count but highly variable scores recommends `standard`
  - Recommendation artifact includes `scoreAndRefine` analysis section showing scoring distribution and its impact on the recommendation

- **AC7**: Aggregate telemetry summary:
  - `{plansDir}/telemetry/aggregate.json` regenerated on each workflow completion (Step 8 or Step 9)
  - Contains: `totalWorkflows`, `completedWorkflows`, `averageElapsedSec`, `averageVerificationScore`, `fableVerdictDistribution` (counts per verdict type), `gateBypassCount`, `errorTypeDistribution`
  - JSON format is flat and dashboard-consumable (no nested objects beyond one level)
  - Existing workflows are retroactively included via a one-time scan of existing `state.md` files

## Notes

- AC1 requires editing `PREPARE-CHECKLIST.md` only — the fable gate logic in `ws-ship-pr` Step 1 already works and needs no changes.
- AC2 extends `validate_state.py` with a `--pre-advance` mode that runs before dispatch instead of after completion. The script already has the validation logic; it needs a pre-dispatch entry point.
- AC3 is a new skill but reuses `dagThresholds` evaluation logic from `ws-plan-to-tasks` and `ws-multi-spec` — no duplication.
- AC4 dual-writes to JSONL alongside existing `state.md` telemetry — no migration needed, no breaking change.
- AC5 bypass applies to quality gates only (fable, CI, classifier, scoring). Build, test, security, and SCM gates remain mandatory regardless of bypass.
- All new artifacts follow existing `ARTIFACTS.md` naming conventions and are committed only at Step 8 delivery per `invariants.commitPlanFilesOnlyAtStep8`.
