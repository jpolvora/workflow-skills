---
id: null
slug: node-helper
title: Node Helper Fixture
source: local
specDate: 2026-08-28
---
# Specification — Node Helper Fixture

## Description

Add a small Node helper module and a test named in this spec. Exercises lite orch with a code deliverable and discrimination sensor via invert.patch.

## Out of Scope

| Feature | Reason |
|---------|--------|
| External npm deps | Zero runtime deps |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
|------------|----------------|-----------|------------|
| Runtime | Node .cjs | Package convention | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Helper module | greet.cjs exports greet | Run helper-greet-behavior test |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `lib/greet.cjs` exists and `test/helper-greet-behavior.test.cjs` passes.

### Negative & Failing Test Scenarios

- Inverted greet output must fail helper-greet-behavior test.

## Acceptance Criteria

- AC1: Add `lib/greet.cjs` exporting a `greet(name)` function returning `Hello, {name}!`.
- AC2: Add `test/helper-greet-behavior.test.cjs` with a test named `helper-greet-behavior` asserting greet output.
