# Fixed-Model Comparison — fixed-models-001

**Generated:** 2026-09-30T12:18:39.975Z  
**PRD sha256:** `c777322b54c00df5961aa9608ea53d3a59bc9e93f194981f76ee91511740313c`  
**Judge sha256:** `8bec03c694dd3f3cc8b70c1fcd5a9ff97b7839971108fd80a5aa7eab3f1e0745`  
**Run dir:** `benchmarks/comparisons/fixed-models-001`

## Harnesses

| Harness | Version | Models | Samples | Mean |
|---|---|---|---:|---:|
| workflow-skills | 0.5.21 | executor=none (deterministic static execution; no inference) | 3 | 7.00 |

## Per-sample binary results

| Harness | Sample | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Total | Timestamp |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| workflow-skills | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 7 | 2026-09-30T12:18:34.824Z |
| workflow-skills | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 7 | 2026-09-30T12:18:35.040Z |
| workflow-skills | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 7 | 2026-09-30T12:18:35.243Z |

## Aggregate scores

| Harness | Check | Passed | Total | Rate |
|---|---|---:|---:|---:|
| workflow-skills | C1 | 3 | 3 | 1.00 |
| workflow-skills | C2 | 3 | 3 | 1.00 |
| workflow-skills | C3 | 3 | 3 | 1.00 |
| workflow-skills | C4 | 3 | 3 | 1.00 |
| workflow-skills | C5 | 3 | 3 | 1.00 |
| workflow-skills | C6 | 3 | 3 | 1.00 |
| workflow-skills | C7 | 3 | 3 | 1.00 |

## Judge definition

- **C1**: Duration helper module exists and formats (AC1) (evidence: `sample artifact: lib/duration.cjs exports formatDuration`)
- **C2**: Negative input throws RangeError (AC2) (evidence: `sample artifact: formatDuration(-1) throws RangeError`)
- **C3**: 125 formats as 2m 5s (AC3) (evidence: `sample artifact: behavior test for formatDuration(125) passes`)
- **C4**: Negative-throw behavior test passes (AC4) (evidence: `sample artifact: behavior test for formatDuration(-1) passes`)
- **C5**: Behavior tests exit 0 (AC5) (evidence: `sample artifact: behavior test command exit code is 0`)
- **C6**: Wrong-format implementation fails AC3 test (NS1) (evidence: `sample artifact: inverted AC3 implementation fails the AC3 test`)
- **C7**: Non-throwing implementation fails AC4 test (NS2) (evidence: `sample artifact: non-throwing AC4 implementation fails the AC4 test`)

## Protocol exceptions

- none

## Pending comparators (not scored)

- **external-comparator**: no evidence-backed samples available in this sandbox; column excluded from scoring rather than fabricated (rerun: execute prd.md unchanged at documented defaults, record 3 binary samples, append a scored column, re-publish)

## Reproduce

`node .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs --run benchmarks/comparisons/fixed-models-001`
