---
step: 7
slug: ws-shared-resolution-cleanup
workflowId: ws-shared-resolution-cleanup-20260919T210648Z
status: completed
startedAt: "2026-09-19T21:06:48Z"
verdict: pass
endedAt: "2026-09-19T21:32:15.880Z"
acRefs: []
---
# Step 7 testing report — ws-shared-resolution-cleanup

Commit under test: 84559abbf0b7633977ab8173e7198bba2ba77f23 (Step 5 G2).
Probe: `probe_test_surface.cjs` → `hasTestSurface: true`, alias
`backendTest: npm run test`. No auto-skip (no `skipTesting`, surface exists).

## Results (all exit 0, observed this session)

| Check | Outcome |
|-------|---------|
| `test-global-config-missing.js` (AC5, NS3) | ok — fail-closed without hub, pass-through with hub, local-without-hub; error points at `ws-configure-project` |
| `test-harness-clean.js` (AC1, AC2, NS1) | 0 findings; packageVersion aligned 0.4.42; integrity manifest matches tree |
| `check_harness_links.cjs` (AC2) | clean |
| `test-hybrid-consumer-root.js` (AC3) | all passed |
| `test-local-first-precedence.js` (AC3) | ok |
| `test-skills-runtime-resolution.js` (AC3) | ok |
| `test-check-harness-install-mode.js` (AC3) | all passed |
| `test-check-harness-links.js` (NS2) | all passed |
| `test-doc-sync.js` (AC4) | ok |
| `test-shared-hub-paths.js` (AC4) | ok (271 residual hits allowlisted) |
| `test-node-helper-ports.js` (cjs/py parity) | ok |
| `generate-skill-integrity.js --check` (AC4) | matches tree (v0.4.42) |

AC mapping: AC1 ✓ AC2 ✓ AC3 ✓ AC4 ✓ AC5 ✓. NS1 ✓ NS2 ✓ NS3 ✓.
No failures, no missing coverage on touched code.

## Skipped areas (per policy, not judgment)

- **UI/browser**: skipped — no browser surface (frontend `none`, no devHost).
- **DB seeds / API / RBAC**: n/a — `database.type: none`, no hosts/ports.
- **Full `npm run test`**: deferred (long suite); targeted AC-covering
  subset above is green. Step 5 ledger records the same subset green.
- **Mutation**: `skipped` — `mutationTest` empty + `skipMutationTesting: true`.
- **Regression sabotage**: `skipped` — ledger marks sabotage `not-required`
  (no invert patch for this cleanup).

## Accessibility / alerts

n/a — no forms or UI touched.

## Verdict

**Pass.** No `failed` sections; Mutation/Sabotage `skipped` per policy.
No code fixes needed; nothing to hand to `ws-implement-tasks`.
Next: Step 8 (close + ship). Do not push from this step.
