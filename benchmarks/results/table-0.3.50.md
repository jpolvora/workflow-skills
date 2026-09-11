# Harness Benchmark Evolution Report

**Generated:** 2026-09-11T10:14:39.285Z  
**Scope:** 1 snapshots across versions: 0.3.50  
**Status:** 1 PASS / 0 FAIL

## 1. Version-over-Version Evolution Table

| Version | Commit | Fixture | Mode | Orch | Score | Verify | Exec Time | Tokens | Model | Verdict |
|---|---|---|---|---|---:|---:|---:|---:|---|:---:|
| 0.3.50 | `7961204` | fx-lite-readme | static | lite | **100** | n/a | n/a | n/a | n/a | ✅ PASS |

## 2. Multi-Dimensional Quality Breakdown

| Version | Fixture | Complete | Verify | Judge | Disc | Eff | Time | Honest | Index |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.3.50 | fx-lite-readme | 10 | n/a | n/a | n/a | 10 | n/a | n/a | **100** |

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
