---
slug: improve-agentic-reviewers-prompt
recommendedPipeline: standard
thresholdPipeline: standard
complexityClass: complex
runInterview: true
classifiedAt: 2026-09-27T00:24:01.048Z
scoreAndRefine: false
---

# Pipeline Classification — Improve agentic code reviewers prompt — simplify and align upstream vs local needs

## Recommendation

**Recommended pipeline:** `standard`

**Complexity class:** `complex`

| Orchestrator | When |
|--------------|------|
| `lite` | `ws-spec-to-pr-lite` — fast sequential Steps 0–5 |
| `standard` | `ws-spec-to-pr` — full Steps 0–9 |

## Execution profile

| Decision | Value | Reason |
|---|---|---|
| pipeline | `standard` | Exceeded threshold(s): implementation steps (ACs), estimated files, layers — default recommendation is `standard`. Complexity class `complex`: uncertain or non-simple scope defaults to standard or higher. |
| execMode | `dag` | DAG is enabled and the spec exceeds at least one configured threshold. |
| runInterview | `true` | Complexity class `complex` (schema, migration, or tenancy keywords). Standard pipeline detected more than two spec-touched layers. |
| runTesting | `true` | Testing is enabled; the machine test-surface probe makes the final skip decision. |
| estimatedElapsedSec | `900` | No stored median exists; using the published pipeline fallback. |
| complexityClass | `complex` | Scripted simple/standard/complex for the full-orch Complexity gate |

## Metrics

| Metric | Count | Threshold | Within |
|--------|-------|-----------|--------|
| Implementation steps (ACs) | 7 | 3 | no |
| Estimated files (path refs) | 39 | 6 | no |
| Layers (spec-touched) | 3 | 2 | no |
| Spec Layer headings | 0 | — | — |
| Sections | 7 | — | — |

## Threshold comparison

Source: `.ws/config.json` → `dagThresholds`

- maxImplementationSteps: 3
- maxExpectedFiles: 6
- maxLayers: 2

**Rule:** recommend `lite` when **all** metrics are within limits; otherwise `standard`.

## Reasoning

Exceeded threshold(s): implementation steps (ACs), estimated files, layers — default recommendation is `standard`. Complexity class `complex`: uncertain or non-simple scope defaults to standard or higher.

## scoreAndRefine analysis

not applicable (`scoreAndRefine` disabled in config).

## Orthogonality note

This artifact recommends `lite` | `standard` orchestrator choice only. The full-orch Complexity gate (`simple` | `standard` | `complex` in `gates.md`) is separate and still runs before Step 1 when using `ws-spec-to-pr`.

## User gate (orchestrator)

1. **Accept recommendation** (Recommended)
2. **Override to standard**
3. **Override to lite**

`autoMode`: accept index 0. Mid-flight: if `lite` recommended while on standard orch, stay on current orch unless user explicitly overrides to lite.
