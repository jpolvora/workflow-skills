---
step: 5
slug: code-review-findings-fixes
workflowId: code-review-findings-fixes
status: completed
startedAt: "2026-09-20T23:08:37.461Z"
endedAt: "2026-09-20T23:08:37.461Z"
acRefs: []
---
# Check-Implementation Report — code-review-findings-fixes

## Verdict
Score: 10/10 (advance threshold 9 met). No unresolved findings, zero invariant violations, earned units: 60/60.

## AC Verification
- AC1 centralized runtime bootstrap: `bootstrap_runtime.cjs` implemented with candidate resolution order (`WORKFLOW_SKILLS_SHARED_DIR` -> local `.agents/skills` -> global skills root -> packaged fallback). PASS (`test/test-bootstrap-runtime.js`).
- AC2 script refactoring: `check_unique_runtime.cjs`, `observer.cjs`, and `ac_ledger.cjs` consume `bootstrap_runtime.cjs` with graceful fallback. PASS (`test/test-bootstrap-runtime.js`).
- AC3 portable homedir resolution: `check_hub_separation.cjs` updated to use `require('os').homedir()` instead of raw environment variables. PASS (`test/test-bootstrap-runtime.js`, `test/test-hub-separation.js`).
- AC4 UTF-8 streaming decoder: `monitor_snapshot.cjs` `readBoundedTailText` uses `StringDecoder` across buffer chunks to prevent boundary-split multi-byte sequence corruption. PASS (`test/test-bootstrap-runtime.js`, `test/test-ws-monitor-us356.js`).
- AC5 banned `.ws/runtime` detection: `check_unique_runtime.cjs` inspects repo root for forbidden `.ws/runtime` directory and fails closed if present. PASS (`test/test-bootstrap-runtime.js`, `test/test-unique-runtime.js`).
- AC6 regression & harness cleanliness: Full test suite (`npm run test`), harness audits (`test/test-harness-clean.js`), and skill integrity checks (`verify-integrity`) pass cleanly with 0 findings. PASS.

## Negative Scenarios
- NS1: Fail-closed error reporting when bootstrap candidate paths are invalid or unresolvable. PASS (`test/test-bootstrap-runtime.js`).
- NS2: Multi-byte UTF-8 character splitting does not corrupt decoded output or trigger replacement character regressions. PASS (`test/test-bootstrap-runtime.js`).

## Verification Commands & Aliases
- `backendTest` (`npm run test`): exit code 0.
- `node test/test-bootstrap-runtime.js`: exit code 0.
- `node test/test-harness-clean.js`: exit code 0 (0 findings).
- `npm run verify-integrity`: exit code 0.

## Scope
Touched:
- `.agents/skills/ws-shared/runtime/scripts/bootstrap_runtime.cjs` [NEW]
- `test/test-bootstrap-runtime.js` [NEW]
- `.agents/skills/ws-check-harness/scripts/check_hub_separation.cjs` [MODIFIED]
- `.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs` [MODIFIED]
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` [MODIFIED]
- `.agents/skills/ws-spec-to-pr/scripts/observer.cjs` [MODIFIED]
- `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` [MODIFIED]
- `package.json` [MODIFIED]
- `bin/skill-integrity.json` [MODIFIED]
