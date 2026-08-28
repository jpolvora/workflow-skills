---
id: null
slug: standard-mock
title: Standard Mock Fixture
source: local
specDate: 2026-08-28
---
# Specification — Standard Mock Fixture

## Description

Large standard-orch fixture exercising plan.index, ac-ledger, and negative scenario linking for verify score paths.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Production deploy | dryRun sandbox only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
|------------|----------------|-----------|------------|
| Orch | standard sequential | enableDag false | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Ledger traceability | plan.index + ac-ledger | collect gate |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `lib/mock.cjs` and linked negative test coverage in ac-ledger.

### Negative & Failing Test Scenarios

- NS1: mock-export-missing must fail when lib/mock.cjs export is removed.

## Acceptance Criteria

- AC1: Add `lib/mock.cjs` exporting `mockValue` returning 42.
- AC2: Add `test/mock-value-behavior.test.cjs` with test `mock-value-behavior` asserting mockValue is 42.
- AC3: Link negative scenario NS1 to an observed failing test in ac-ledger for verify score 9/10 path.
