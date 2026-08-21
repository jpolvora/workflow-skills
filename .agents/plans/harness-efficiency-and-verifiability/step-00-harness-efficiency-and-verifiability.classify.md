---
slug: harness-efficiency-and-verifiability
recommendedPipeline: standard
thresholdPipeline: standard
finalPipeline: standard
deliveryMode: full
selectedWorkstreams: [W1, W2, W3, W4, W5, W6, W7, W8, W9, W10]
executionProfileSupported: false
classifiedAt: 2026-08-21T19:56:19.846Z
scoreAndRefine: false
---

# Pipeline Classification — Harness efficiency, verifiability, and observability upgrade

## Recommendation

**Recommended pipeline:** `standard`

| Orchestrator | When |
|--------------|------|
| `lite` | `ws-spec-to-pr-lite` — fast sequential Steps 0–5 |
| `standard` | `ws-spec-to-pr` — full Steps 0–9 |

## Final selection

- **Final pipeline:** `standard`
- **Delivery mode:** `full`
- **Selected workstreams:** W1–W10
- **Execution profile:** unavailable in the current classifier. Version 0.3.28 emits pipeline metrics only, so `execMode`, `runInterview`, `runTesting`, and `estimatedElapsedSec` were not fabricated.

## Metrics

| Metric | Count | Threshold | Within |
|--------|-------|-----------|--------|
| Implementation steps (ACs) | 76 | 3 | no |
| Estimated files (path refs) | 64 | 6 | no |
| Layers | 3 | 2 | no |
| Sections | 5 | — | — |

## Threshold comparison

Source: `.agents/skills/ws-shared/config.json` → `dagThresholds`

- maxImplementationSteps: 3
- maxExpectedFiles: 6
- maxLayers: 2

**Rule:** recommend `lite` when **all** metrics are within limits; otherwise `standard`.

## Reasoning

Exceeded threshold(s): implementation steps (ACs), estimated files, layers — default recommendation is `standard`.

## scoreAndRefine analysis

not applicable (`scoreAndRefine` disabled in config).

## Orthogonality note

This artifact recommends `lite` | `standard` orchestrator choice only. The full-orch Complexity gate (`simple` | `standard` | `complex` in `gates.md`) is separate and still runs before Step 1 when using `ws-spec-to-pr`.

## User gate (orchestrator)

1. **Accept recommendation** (Recommended)
2. **Override to standard**
3. **Override to lite**

`autoMode`: accept index 0. Mid-flight: if `lite` recommended while on standard orch, stay on current orch unless user explicitly overrides to lite.
