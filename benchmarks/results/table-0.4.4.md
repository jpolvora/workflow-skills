# Harness Benchmark Evolution Report

**Generated:** 2026-09-11T22:49:34.437Z  
**Scope:** 6 snapshots across versions: 0.4.4  
**Status:** 6 PASS / 0 FAIL

## 1. Version-over-Version Evolution Table

| Version | Commit | Fixture | Mode | Orch | Score | Verify | Exec Time | Tokens | Model | Verdict |
|---|---|---|---|---|---:|---:|---:|---:|---|:---:|
| 0.4.4 | `561f86e` | fx-config-merge | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.4.4 | `561f86e` | fx-incomplete | static | lite | **71** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.4.4 | `561f86e` | fx-lite-readme | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.4.4 | `561f86e` | fx-node-helper | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.4.4 | `561f86e` | fx-standard-mock | static | standard | **100** | n/a | n/a | n/a | n/a | ✅ PASS |
| 0.4.4 | `561f86e` | fx-node-helper | live | lite | **81** | 10 | 152s (2m 32s) | n/a | preset:cursor | ✅ PASS |

## 2. Multi-Dimensional Quality Breakdown

| Version | Fixture | Complete | Verify | Judge | Disc | Eff | Time | Honest | Index |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.4.4 | fx-config-merge | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.4.4 | fx-incomplete | 5 | n/a | n/a | n/a | 10 | n/a | n/a | **71** |
| 0.4.4 | fx-lite-readme | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.4.4 | fx-node-helper | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.4.4 | fx-standard-mock | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |
| 0.4.4 | fx-node-helper | 10 | 10 | 0 | 10 | n/a | 10 | 7 | **81** |

## 3. Metrics Legend & Notes

- **Score (Index)**: Overall weighted score (0–100) calculated from completeness, verifyScore, judge checks, sensor discrimination, efficiency, time, and honesty.
- **Exec Time**: Wall clock duration (`wallSec`). Live runs record total workflow elapsed seconds; static runs are zero-cost static verifications.
- **Tokens**: Prompt + completion tokens logged via workflow state telemetry.
- **Model**: Presets or underlying model identifiers configured during run execution.
- **Fixtures**:
  - `fx-node-helper`: Fast lite fixture with sensor test.
  - `fx-config-merge`: Mid-high standard orchestrator fixture with 10 ACs.
  - `fx-lite-readme`: Fast lite single-file documentation fixture.
  - `fx-incomplete`: Negative test case ensuring incomplete runs cannot achieve full score.
