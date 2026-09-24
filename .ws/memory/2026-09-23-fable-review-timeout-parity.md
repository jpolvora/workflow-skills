### [2026-09-23] Local dry-run must mirror the CI timeout budget
- **Layer**: devops
- **Module**: bin/review-dry-run.cjs / agentic reviewer workflow
- **Severity**: High
- **PathPattern**: bin/review-dry-run.cjs; test/test-review-dry-run.js; .github/workflows/agentic-code-review.yml
- **Scenario / Context**: The local dry-run launcher mirrored CI arguments but inherited the reviewer's 10-minute default while CI explicitly allowed 20 minutes, so a valid local run timed out.
- **DO NOT**: Claim a local command mirrors CI when engine, model, variant, and timeout behavior are not synchronized.
- **INSTEAD DO**: Set the same default timeout as CI, preserve an explicit environment override, and unit-test both the default and override paths.
