---
id: null
slug: fixed-models-001
title: Fixed-Model Comparison PRD (frozen)
source: local
specDate: 2026-09-30
freeze: "2026-09-30T12:00:00Z"
---

# Specification — Fixed-Model Comparison PRD (frozen)

## Description

Add a small duration-format helper module plus a behavior test, in corpus style. Every harness in the comparison run executes this PRD unchanged at its documented defaults; the binary-check judge scores observed run artifacts only.

## Acceptance Criteria

- AC1: The worker shall add `lib/duration.cjs` exporting `formatDuration(sec)` returning `{m}m {s}s` for non-negative input.
- AC2: The worker shall reject negative input with a thrown `RangeError`.
- AC3: The worker shall add a behavior test asserting `formatDuration(125)` returns `2m 5s`.
- AC4: The worker shall add a behavior test asserting `formatDuration(-1)` throws `RangeError`.
- AC5: The behavior tests shall exit 0 on the delivered code.

## Negative & Failing Test Scenarios

- NS1: An implementation returning `125s` for input 125 must fail the AC3 behavior test.
- NS2: An implementation returning a string for input -1 instead of throwing must fail the AC4 behavior test.

## Out of Scope

| Feature | Reason |
|---------|--------|
| External npm deps | Zero runtime deps |
| Additional helpers | One module keeps the judge binary-sized |

## Judge Source Map

Each binary check derives 1:1 from one AC or negative scenario above; see `judge.json` in this run dir.
