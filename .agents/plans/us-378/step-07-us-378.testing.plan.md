---
slug: us-378
workflowId: us-378-20260921T112549Z
kind: testing-plan
---

# Step 7 — Testing plan (us-378)

Probe: `probe_test_surface.cjs` reports `hasTestSurface: true` (alias `backendTest` → `npm run test`). No skip.

## Unit & coverage

- Command: `npm run test` (alias `backendTest`; fail-fast across `test-suites.json` local entries).
- Coverage: this package has no instrumented coverage runner and `config.json.coverage` sets no command; ratios cannot be measured. Substituted evidence: full-suite green plus the targeted `test/test-ws-patterns-generator.js` battery (TDD red observed, then green).
- Gaps vs changed files: none — new behavior (skill body, seed script, graph entries, autoload carve-out, retired-pattern guard, catalog/docs rows) is asserted by the new battery; neighboring suites (install, autoload-configure, migration, wiki, context-budget, doc-sync, harness-clean) cover integration.

## Hosts, credentials, DB, API, RBAC

- N/A with reason: local skill package; no servers, endpoints, databases, auth boundaries, tenants, or locales. No seeds, no Bearer [REDACTED] no migrations. Browser/UI testing not applicable (docs site is static output; visual checks out of scope for this change).

## Integration/E2E paths

- Installer fixture flows (uninstall preserves generator-managed tree), autoload round-trips, integrity generate/check, harness check scripts, site build — all executed inside `npm run test` suites.

## Feature-quality AC checklist

- AC1–AC13 each mapped to battery asserts plus suite evidence; negative scenarios NS1–NS9 linked to observed tests at Step 5. Pass = suite exit 0 with zero failures.

## Defect threshold

- Pass: `npm run test` exit 0. Any failure → Step 7 incomplete; fix-mode handoff (none anticipated; Steps 4–6 already green).

## Mutation

Skipped: `defaults.skipMutationTesting` is true and `verification.mutationTest` is empty/unset. Regression sabotage dedupes to the Step 5 run (same battery, passed, bytes restored).
