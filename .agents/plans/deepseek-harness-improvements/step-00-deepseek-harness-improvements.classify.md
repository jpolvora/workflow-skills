---
slug: deepseek-harness-improvements
recommendedPipeline: standard
thresholdPipeline: standard
classifiedAt: 2026-08-17T02:49:44.734Z
scoreAndRefine: false
---

# Pipeline Classification — Implement DeepSeek Harness suggestions to improve workflow-skills

## Recommendation

**Recommended pipeline:** `standard`

| Orchestrator | When |
|--------------|------|
| `lite` | `ws-spec-to-pr-lite` — fast sequential Steps 0–5 |
| `standard` | `ws-spec-to-pr` — full Steps 0–9 |

## Metrics

| Metric | Count | Threshold | Within |
|--------|-------|-----------|--------|
| Implementation steps (ACs) | 16 | 3 | no |
| Estimated files (path refs) | 0 | 6 | yes |
| Layers | 3 | 2 | no |
| Sections | 3 | — | — |

## Threshold comparison

Source: `.agents/skills/ws-shared/config.json` → `dagThresholds`

- maxImplementationSteps: 3
- maxExpectedFiles: 6
- maxLayers: 2

**Rule:** recommend `lite` when **all** metrics are within limits; otherwise `standard`.

## Reasoning

Exceeded threshold(s): implementation steps (ACs), layers — default recommendation is `standard`. Pass 1 scores reviewed; threshold recommendation unchanged.

## scoreAndRefine analysis

Pass 1 score distribution (from score-analysis artifact):

| Stat | Value |
|------|-------|
| Task scores parsed | 5 |
| Mean | 9.4 |
| Variance | 0.24 |
| Min / Max | 9 / 10 |
| Low scores (<7) | 0 |

Pass 1 scores reviewed; threshold recommendation unchanged.

## Orthogonality note

This artifact recommends `lite` | `standard` orchestrator choice only. The full-orch Complexity gate (`simple` | `standard` | `complex` in `gates.md`) is separate and still runs before Step 1 when using `ws-spec-to-pr`.

## User gate (orchestrator)

1. **Accept recommendation** (Recommended)
2. **Override to standard**
3. **Override to lite**

`autoMode`: accept index 0. Mid-flight: if `lite` recommended while on standard orch, stay on current orch unless user explicitly overrides to lite.
