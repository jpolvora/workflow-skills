# Check-Implementation Report — us-348 (score 10/10)

Verifier: worker inline (Step 5) · Spec of record: `step-02-us-348.plan.refined.md` ‖ `step-00-us-348.spec.md`
Mode: quick-score (all ACs evidenced, no full matrix needed).

## AC verdicts

| AC | Evidence | Score |
|----|----------|-------|
| AC1 decision note | `runtime/host-capability-tokens.md` § Decision note (refine-and-implement, abandon rejected with reason) + plan §0; asserted by `test-host-capabilities.js` AC1 block | 10 |
| AC2 detect + cache ×2 shapes | `runtime/scripts/probe_host_capabilities.cjs` + cache upsert per key; `test-host-capabilities.js` AC2 block green (two shapes, per-key entries, all tokens listed) | 10 |
| AC3 token mapping + scenario | `tools.md` § Capability tokens + tokens doc vocabulary/ordering; scenario test picks native over shell; green | 10 |
| AC4 reuse + invalidation | `host-dispatch.md` reuse rule + tokens doc invalidation rule + `--refresh`; probe-count test (3 steps → 1 probe) green | 10 |
| AC5 pre-mapped hosts | `runtime/host-tool-map.json` (4 named shapes, dispatch-agent variants); map-coverage test green | 10 |

Negatives NS1–NS4: asserted in the same test file (shell-bypass diverges, re-probe count pinned,
unknown-host exit 0 minimal, declared-overrides-map). Sabotage: not required (docs + additive
detection script; no defect class to mutate).

## Static checks

- `scan_stack_invariants.cjs` on touched files: 0 issues.
- `test-harness-clean.js`: 0 findings. `test-ws-shared-layout.js`, `test-doc-sync.js`,
  `test-runtime-portability.js`: ok. Integrity regenerated + verified (v0.4.39).
- `test-host-capabilities.js`: all assertions green (run 2026-09-19, exit 0).

**Overall score: 10/10** — at/above `minVerifyScore` 9. Ready for Step 6 review; G2-code after Step 5.
