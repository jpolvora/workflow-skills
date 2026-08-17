# Step 7 Testing Plan - deepseek-harness-improvements

## Scope
P1 state-integrity + resume-gate + goal contract guards (AC4-AC9).

## Test commands (config.json.verification)
- backendTest: npm run test (authoritative suite)
- Focused: node test/test-update-state-yaml.js (AC4/AC5/AC6 + stateVersion reject)
- Focused: node test/test-resume-gate.js (AC9)

## Mutation testing
Skipped: defaults.skipMutationTesting=true and verification.mutationTest is empty (opt-in not set).

## Coverage notes
No coverage tooling configured; verification = suite exit code + focused assertions.
