---
slug: remove-consumer-agents-md-requirement
recommendedPipeline: standard
thresholdPipeline: standard
classifiedAt: 2026-08-08T01:41:56.423Z
scoreAndRefine: false
---

# Pipeline Classification — Remove Consumer Requirement for .agents/AGENTS.md and Consolidate Consumer Context into ws-shared/

## Recommendation

**Recommended pipeline:** `standard`

| Orchestrator | When |
|--------------|------|
| `lite` | `ws-spec-to-pr-lite` — fast sequential Steps 0–5 |
| `standard` | `ws-spec-to-pr` — full Steps 0–9 |

## Metrics

| Metric | Count | Threshold | Within |
|--------|-------|-----------|--------|
| Implementation steps (ACs) | 5 | 3 | no |
| Estimated files (path refs) | 14 | 6 | no |
| Layers | 0 | 2 | yes |
| Sections | 3 | — | — |

## Threshold comparison

Source: `src/skills/ws-shared/config.json.example` → `dagThresholds`

- maxImplementationSteps: 3
- maxExpectedFiles: 6
- maxLayers: 2

**Rule:** recommend `lite` when **all** metrics are within limits; otherwise `standard`.

## Reasoning

Exceeded threshold(s): implementation steps (ACs), estimated files — default recommendation is `standard`.

## scoreAndRefine analysis

not applicable (`scoreAndRefine` disabled in config).

## Orthogonality note

This artifact recommends `lite` | `standard` orchestrator choice only. The full-orch Complexity gate (`simple` | `standard` | `complex` in `gates.md`) is separate and still runs before Step 1 when using `ws-spec-to-pr`.

## User gate (orchestrator)

1. **Accept recommendation** (Recommended)
2. **Override to standard**
3. **Override to lite**

`autoMode`: accept index 0. Mid-flight: if `lite` recommended while on standard orch, stay on current orch unless user explicitly overrides to lite.
