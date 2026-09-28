---
slug: us-436
step: 7
workflowId: us-436-20260927T190308Z
status: completed
acRefs: []
score: 10
startedAt: "2026-09-27T19:03:08Z"
endedAt: "2026-09-27T19:26:13.636Z"
---
# Testing Report — us-436

**Verdict: PASS.**

## Results

| # | Check | Command | Exit | Result |
|---|-------|---------|------|--------|
| 1 | Test surface probe | `node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json` | 0 | surface present, `skipReason: null` |
| 2 | Build/base | (n/a — no build alias for a Node package; site build covered by `--check`) | — | n/a |
| 3 | Unit + integration | `npm run test` | 0 | `all 139 entries passed` (mode=local); hub config byte-identity verified |
| 4 | Site currency | `node bin/build-site.js --check` | 0 | `Site is current: 59 skills across 5 layers` |
| 5 | Wiki validation | `node .agents/skills/ws-wiki/scripts/validate_wiki.cjs` | 0 | `PASS: Living wiki validated successfully (12 page(s))` |
| 6 | Harness clean audit | `node test/test-harness-clean.js` | 0 | `Harness OK (upstream clean) — 0 findings` |
| 7 | Integrity regenerate | `npm run generate-integrity` | 0 | `Wrote bin/skill-integrity.json (v0.5.7, 59 skills)` |
| 8 | Integrity verify | `npm run verify-integrity` | 0 | `OK: manifest matches tree (v0.5.7)` |
| 9 | Idempotent rebuild | `node bin/build-site.js` twice | 0 | identical `git hash-object docs/index.html` (286e392e…) |

DB seeds: not applicable (no DB). API/integration: not applicable (no endpoints). UI/E2E: not applicable (static docs, no runtime UI).

## Feature Quality vs Acceptance Criteria

- AC1–AC3: four cluster surfaces present in generated `docs/index.html`; rebuild deterministic and no-op on second run; `--check` clean.
- AC4–AC8: edited wiki pages carry the exact keys/skill ids and pass link/heading validation.
- AC9: `FEATURES.md` § 1.7 and `README.md` name all four clusters.
- AC10: harness Phases 0–5c and `test-harness-clean.js` report 0 findings; wiki validator exits 0.
- AC11: version 0.5.7 strictly above merge-base 0.5.6; both manifests aligned; integrity verified.

## Mutation

| Status | Reason |
|--------|--------|
| skipped | `verification.mutationTest` empty and `defaults.skipMutationTesting` (default true) |

## Regression Sabotage

| Status | Reason |
|--------|--------|
| skipped | Docs/generator-only delta; no newly added regression assertion to invert. Reproducibility covered by the idempotent-rebuild check. |

No area failed. Step 7 complete.
