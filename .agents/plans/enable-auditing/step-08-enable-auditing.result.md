---
slug: enable-auditing
workflowId: enable-auditing-20260812T020840Z
deliveredAt: "2026-08-12T03:15:00Z"
---

# Delivery result — enable-auditing

## Summary

Shipped opt-in `defaults.enableAuditing` (default `false`) with new `ws-audit` harness skill: runtime log under `{us-dir}`, orch wrapper hooks in `ws-spec-to-pr` / lite / `ws-multi-spec`, and end-of-run upstream GitHub issue draft gate.

## AC coverage

| AC | Status |
|----|--------|
| AC1 | config example + schema |
| AC2 | documented no-op when false |
| AC3–AC8 | ws-audit protocol + audit_log.js |
| AC9 | log file format |
| AC10 | draft-issue + user-gate documented |
| AC11 | hubs + config-resolution |
| AC12 | integrity + tests |

## Verification

- `node test/test-ws-audit.js` — pass
- `npm run test` — pass
- `npm run generate-integrity` && `npm run verify-integrity` — pass

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | ~45 min (workflow) |
