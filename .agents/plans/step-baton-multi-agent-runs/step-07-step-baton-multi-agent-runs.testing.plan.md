---
step: 7
slug: step-baton-multi-agent-runs
workflowId: step-baton-multi-agent-runs-20260918T232508Z
status: completed
startedAt: "2026-09-18T23:25:08Z"
acRefs: []
---

# Testing Plan — step-baton-multi-agent-runs (Step 7)

Feature: step-level baton handoffs for multi-CLI runs (run config + baton
record + deterministic coordinator). Standard orch Step 7 via `ws-testing`.
`skipTesting=false`, test surface exists (`probe_test_surface.cjs`
`hasTestSurface: true`).

Memory folded: vault search no hits; local trap (High, 2026-09-03) — sabotage
artifacts must stay out of `{us-dir}/.runtime/` (validate_state HS-5), so the
invert patch lives under `/tmp`. Benchmark trap — no `npm run benchmark`.

## 1. Unit & coverage commands

From `config.json.verification` (only non-empty test alias):

- `backendTest`: `npm run test` (exit 0 required)
- `backendBuild`, `frontendBuild`, `frontendTest`: empty — no build gate.
- Env note: bare env lacks a `python` alias (only `python3`); the suite shells
  to `python` at `check_workflows.py`. Run with the existing
  `/tmp/py-shim/python -> python3` on PATH (no product edits).

Focused suites (changed-file coverage, run individually first):

| Suite | ACs / NS |
|-------|----------|
| `node test/test-step-baton-config.js` | AC1–AC4, NS4 |
| `node test/test-step-baton-claim.js` | AC5, AC6, AC8; NS1, NS7 |
| `node test/test-step-coordinator.js` | AC7, AC9–AC14; NS2, NS3, NS5, NS6 |
| `node test/test-step-baton-telemetry.js` | AC15 |
| `node test/test-step-baton-monitor.js` | AC16 |
| `node test/test-step-baton-specmemo.js` | AC17 |

Coverage tooling: none configured (no c8/nyc/v8 flags in scripts); coverage
signal is suite pass + AC/NS mapping above plus the full-suite green run.
Gaps vs changed files: none expected — all 6 suites target the new/edited
product files (`step_baton.cjs`, `step_coordinator.cjs`, `workflow_state.cjs`
finish hook, `monitor_snapshot.cjs`, 3 schemas, docs/PS1).

## 2. Targets, credentials, DB seeds

- Hosts/ports: N/A. Node skill package, no `apiHost`/`devHost` (empty), no
  listener (plan §6.1 grep-verified). No credentials involved.
- DB seeds: N/A (`database.type: none`, no migrations). Rollback per AC: N/A.
- State-file isolation scope is `workflowId` + branch (plan §4); coordinator
  tests use temp-dir fixtures, no shared state.

## 3. API contracts, RBAC, tenancy

- API contracts: N/A — no HTTP surface. Contract surface is CLI/file:
  coordinator exit codes (0 terminal success, 2 blocked/failed, 3 config
  error, 4 changed-underfoot), named `err.code` family, `telemetry.jsonl`
  envelope, monitor snapshot read-only shape. Asserted by the suites above.
- RBAC: N/A (local same-user spawn, spec-confirmed). Tenancy: per-run state
  paths; covered by AC8 serialization tests.

## 4. Integration / E2E paths

- Dual-write integration: claim/release land in both `.state.json` and
  `.state.md` (`test-step-baton-claim.js`).
- Coordinator subprocess loop: stub workers (ok/nonzero/hang/no-finish/
  gate-emit), timeout kill, external advancement, vault-call counting
  (`test-step-coordinator.js`, `test-step-baton-specmemo.js`).
- UI/E2E: explicitly skipped — `frontend.framework: none`, no routes or
  translations. Accessibility/contrast: N/A (no form UI; en-us CLI logs only).

## 5. Feature-quality AC checklist (observable outcomes)

AC1 run config accepted + `{prompt}/{cwd}/{slug}/{step}` argv substitution;
AC2/AC4 fail-fast named errors, no partial run; AC3 unmapped steps unchanged;
AC5 claim wins only on equal revision + free lease; AC6 atomic
handoff+clear+advance, idempotent re-finish; AC7 expiry re-claimable with log,
`maxAttempts` → `blocked`; AC8 one winner, loser named conflict + backoff, no
double step body; AC9 full loop to terminal exit 0; AC10 poll-only
coordinator, one-shot workers; AC11 gates at coordinator, worker gate output =
violation; AC12 clean exit without advance = failed attempt; AC13 sparse
payload + baton envelope, prompt-as-path; AC14 nonzero/timeout/no-finish =
retry + telemetry; AC15 five events with required fields, schema-valid lines;
AC16 snapshot baton fields from state alone, zero writes; AC17 vault mirror
on / zero calls off.

## 6. Defect-threshold pass/fail

- Pass: all 6 focused suites exit 0, full `npm run test` exit 0, sabotage
  `passed` (inverted run non-zero + byte-identical restore), mutation
  `skipped` per policy, no UI/API/DB areas applicable.
- Fail: any suite non-zero, sabotage `failed`, or restore mismatch (abort).

## 7. Mutation: skipped (policy)

`defaults.skipMutationTesting: true` and `verification.mutationTest` empty →
Mutation `status: skipped`, no threshold evaluation. Regression sabotage runs
instead (skill Step 8): caller-authored invert patch against
`.agents/skills/ws-shared/runtime/scripts/step_baton.cjs` (flip the AC5
revision-equality check `!==` → `===`), executed with the configured
`backendTest` alias (`npm run test`) via
`python3 .agents/skills/ws-testing/scripts/run_sabotage.py --test "npm run test"`.
Expected: inverted run non-zero, every declared path changes bytes,
restoration byte-identical on `--paths` only. Patch file: `/tmp` (never
`{us-dir}/.runtime/` per memory trap).
