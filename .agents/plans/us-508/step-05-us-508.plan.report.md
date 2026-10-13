---
step: 5
slug: us-508
workflowId: us-508-20261013T005850Z
status: completed
startedAt: "2026-10-13T01:19:07.476Z"
endedAt: "2026-10-13T01:19:07.476Z"
acRefs: []
---
# Check-implementation report — us-508

Spec: `.agents/plans/us-508/step-00-us-508.spec.md`
Plan of record: `.agents/plans/us-508/step-02-us-508.plan.refined.md`
Diff under review: working tree (`check_workflows.cjs`, `test-check-workflows-global-root.js`, `bin/skill-integrity.json`).

## Verification score: 10/10

## Evidence

| Command | Result |
|---------|--------|
| `node --check .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` | exit 0 |
| `node test/test-check-workflows-global-root.js` | exit 0 — `PASS: ... us-508 AC1-AC13, NS1-NS10` |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | exit 0 — 0 findings |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| `npm run generate-integrity` + `npm run verify-integrity` | exit 0 — manifest matches tree |

## AC matrix

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `resolvedRoot` + `resolutionSource` (vocabulary `explicit-flag`/`consumer-checkout`/`install-root`/`cwd-fallback`) in the `--json` payload; asserted on every fixture. |
| AC2 | Implemented | `isConsumerCheckout` (`.git` / `.ws/config.json` / `package.json`, cwd only); consumer fixture resolves to the checkout; `.git`-only fixture too. |
| AC3 | Implemented | No-marker cwd → `install-root` = `<home>/.agents`; asserted. |
| AC4 | Implemented | `isInstallParent` guard; assertion `resolvedRoot !== <home>`. |
| AC5 | Implemented | `checkDependencyParity` emits a `skipped` record with `missingPath`. |
| AC6 | Implemented | Skip reason in `--json checks` and the markdown "Resolved Root & Repo-level Checks" section. |
| AC7 | Implemented | Package-root fixture (bin manifest present, shared absent) → CRITICAL, exit 1. |
| AC8 | Implemented | `cwd-fallback` → WARNING naming the resolved root; lone-script fixture asserts it. |
| AC9 | Implemented | `--report` joined to `REPO_ROOT`; asserted inside the consumer checkout, absent from the install parent/root. |
| AC10 | Implemented | Regression asserts `resolvedRoot` + `resolutionSource`. |
| AC11 | Implemented | Fixture has no `.git` inside the install tree (asserted) yet resolves correctly. |
| AC12 | Implemented | Global-only fixture asserts the skip record naming `<root>/bin/skill-dependencies.json`. |
| AC13 | Implemented | Consumer-cwd fixture asserts root == checkout and no install-parent write. |
| NS1–NS10 | Implemented | All negative scenarios exercised in the extended suite. |

## Notes

- Resolver route: best-effort reuse of the shared `inside()` from
  `resolve_consumer_root.cjs` with a local fallback; the AC2 marker set stays
  local (context D4) because the shared `resolveRepoRoot()` keys on
  `.ws/config.json` only. Redefinition of the shared module remains out of scope.
- No new runtime dependency; no Python; Node 22 CommonJS only.

## Reservations

- None blocking. Score 10/10 — every AC has an observed executable assertion.
