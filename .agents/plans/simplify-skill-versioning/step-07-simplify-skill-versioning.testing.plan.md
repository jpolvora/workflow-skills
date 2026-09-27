# Testing plan: simplify-skill-versioning

**Date:** 2026-09-27  
**Base:** `main...HEAD` on `develop`

## Unit and verification

| Alias | Command | Scope |
|-------|---------|--------|
| backendTest | `npm run test` | Full Node test matrix (139 entries) |
| verifyIntegrity | `npm run verify-integrity` | Canonical version + manifest binding |
| harnessClean | `node test/test-harness-clean.js` | Phase 0/3/5a harness audit |

## AC-focused checks

- `test/test-skill-frontmatter.js` — canonical `version.json`, no per-skill `version:` frontmatter
- `test/test-install.js` — hub whitelist includes `version.json`, integrity closure
- `test/test-delivery-commit-artifacts.js` — delivery artifact config contract

## Mutation

Skipped (`defaults.skipMutationTesting` true).

## Regression sabotage

Skipped for this run (no new invert patch authored; unit suite + verify-integrity + harness-clean provide regression signal).

## UI / E2E

Not applicable (package tooling change).
