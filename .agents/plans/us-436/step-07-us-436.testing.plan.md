---
slug: us-436
step: 7
workflowId: us-436-20260927T190308Z
status: completed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11]
---

# Testing Plan — us-436

Change class: documentation emphasis (site generator template + wiki prose + version/integrity projections). No runtime, API, schema, DB, RBAC, or tenancy surface.

## Surface

- `probe_test_surface.cjs --json`: package test surface present (139 entries under `test/`), `skipReason: null`.
- Verification aliases (`config.json.verification`): `backendTest = npm run test`; all build/format/mutation aliases empty.

## Commands

| Area | Command | Covers |
|------|---------|--------|
| Unit + integration | `npm run test` | Full 139-entry suite (site build, wiki validate, integrity, install, harness) |
| Harness clean audit | `node test/test-harness-clean.js` | 0-findings upstream invariant |
| Wiki validation | `node .agents/skills/ws-wiki/scripts/validate_wiki.cjs` | Links, headings, anchors |
| Site currency | `node bin/build-site.js --check` | docs/index.html + wiki HTML not stale |
| Integrity | `npm run generate-integrity` + `npm run verify-integrity` | Manifest matches tree |

## Feature-quality AC checklist

- AC1–AC3: four cluster cards present in generated `docs/index.html`; rebuild idempotent; `--check` exit 0.
- AC4–AC8: wiki pages name the exact keys/skills and validate clean.
- AC9: `FEATURES.md` + `README.md` name all four clusters.
- AC10: harness clean + wiki validator 0.
- AC11: version 0.5.7 > merge-base 0.5.6; integrity verified.

## Mutation

`verification.mutationTest` empty and `defaults.skipMutationTesting` (default true) → mutation **skipped**.

## Regression Sabotage

No new behavioral regression assertions in this docs/generator delta → sabotage not applicable; recorded `skipped` with reason.

## Skip policy

No skip. Browser/UI validation not applicable (static site, no runtime UI).
