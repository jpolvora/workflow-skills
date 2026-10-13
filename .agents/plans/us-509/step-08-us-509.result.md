---
step: 8
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:09Z"
endedAt: "2026-10-13T02:27:02Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15]
---
# Delivery result — us-509

## Summary

Fixed `ac_ledger.cjs link` so a single `--ac` accepts a space-separated target
list (and `--negative` too), applies the whole payload to every named target in
one all-or-nothing write, and fails loudly (never silently) on a token no flag
consumed or a missing flag value. Resolves GitHub issue #509.

- Spec: `.agents/specs/pending/0179-us-509.spec.md` (slug `us-509`).
- Product commit: `f08e3ce3` — `feat(us-509): link --ac target list applies to every named AC and rejects unconsumed tokens`.
- Pipeline: standard (steps 0–9), `workflowType: standard`, complexity `complex`.
- Version: `0.5.43` → `0.5.44` (one bump).

## Files

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` | `parseArgs` multi-value `--ac`/`--negative`, leftover-token + missing-value errors; `link` dedup union + validate-before-mutate; `ledgerHelpText('link')` both forms |
| `test/test-ac-ledger.js` | AC1-AC15 + NS1-NS12 assertions |
| `test/test-script-ux-golden-path.js` | both-form `link --help` lock |
| `FEATURES.md` | ledger target-list contract sentence |
| `package.json`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `test/package.json`, `docs/index.html` | version bump + regenerated integrity + rebuilt site |

## AC / score

Verify score **10/10** (`step5`), no deficiencies, no linkage errors; all 15 ACs
`Implemented`; NS1-NS12 covered by observed passing tests. Fresh-verify fault
injection: 13 injections, all caught (`step-05b-us-509.fresh-verify.md`).

## Verification (delivery gate)

| Check | Result |
|-------|--------|
| `node test/test-ac-ledger.js` / `test-script-ux-golden-path.js` / `test-per-task-adequacy.js` | exit 0 |
| `npm run test` (`backendTest`) | exit 0 — 164/164 |
| `node test/test-harness-clean.js` | 0 findings |
| `npm run generate-integrity` / `verify-integrity` | OK (v0.5.44) |
| `node --check ac_ledger.cjs` | exit 0 |

## Risks / notes

- `test/test-subagent-dispatch.js` documented timing flake under load (unrelated);
  re-ran green, full suite green.
- No new dependency, no Python, no `config.json` schema change, no migration.

## Timing

- Start: `2026-10-13T01:52:09Z` (batch worker bootstrap, state init).
- End: `2026-10-13T02:27:02Z` (close).
- **Timing Total: 34m 53s wall clock.**

## Second-pass report

`scoreAndRefine` / second pass did not run (score was 10 on the first verify and
`invariant build` is advisory). No `step-08-us-509.second-pass-report.md`.
