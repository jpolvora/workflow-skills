# Testing plan — explicit-knowledge-chain (Step 7)

## Unit & coverage
- Command: `npm run test` (`config.json verification.backendTest`), mode=local, 153 entries.
- Focus: `test/test-explicit-knowledge-chain.js` (entry 71/153) — grep assertions for AC1–AC8 over the edited skill prose.
- Coverage: N/A (prose-only change; no instrumented product code paths added).

## Hosts / DB / API / RBAC
N/A — skill-package prose change; no servers, seeds, endpoints, or tenancy surface.

## Integration / E2E / UI
N/A — no UI routes; browser testing skipped (no browser surface).

## Feature-quality AC checklist
Each AC maps to an observable grep assertion in the regression test (chain order, citation rule, UNCERTAIN flag, ban tokens, table headers, judge check + report section, intact 2-round budget, AGENTS.md mirror, marker contrast, return-for-completion).

## Mutation
Skipped: `defaults.skipMutationTesting` true and `verification.mutationTest` empty.

## Pass/fail
Pass: `npm run test` exit 0 with the new suite green. Fail: any entry red (record excerpt + status failed).
