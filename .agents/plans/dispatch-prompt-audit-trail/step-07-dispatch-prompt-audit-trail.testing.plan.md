---
slug: dispatch-prompt-audit-trail
step: 7
---

# Testing plan — dispatch-prompt-audit-trail

## Unit & coverage

- Command: `npm run test` (`config.json` → `verification.backendTest`; 147 enumerated
  entries via `test/run-tests.cjs`). No other build/test/format aliases configured.
- New suite `test/test-dispatch-prompt-audit.js` covers AC1–AC10 plus the CR-001
  regression (substep inheritance, dag fail-closed).
- Coverage tool: none configured for this repo (`c8` coverage script exists but no
  gate threshold is wired to Step 7); gap analysis is by AC mapping instead.

## Gaps vs changed files

Every product file has executing coverage: writer (direct CLI runs), provenance +
gate (dispatch/finish/validate CLI runs), schemas (schema-validate assertions),
docs (source assertions), G2 exclusion (functional git-fixture run).

## Hosts, DB, API, RBAC, UI

Not applicable — Node skill package with no servers, databases, HTTP endpoints,
tenancy, or UI. No seeds, no endpoint probes, no browser run (`skip-browser`
effective by absence of surface; `probe_test_surface.cjs` reports the backendTest
alias as the only surface).

## Integration

CLI-level fixture flows (hermetic temp repos driving the real
`update_state`/`validate_state`/`commit_g2_code`/builder/writer binaries) serve as
the integration battery; they run inside the new suite.

## Feature-quality AC checklist

AC1–AC10 each map to ≥1 observed assertion with exit codes (see the Step 5 report
matrix); negative scenarios NS1–NS5 linked observed.

## Defect thresholds

Pass: `npm run test` exit 0 (147/147), sabotage `passed`, mutation `skipped` per
policy, zero Critical/Warning findings open. Any suite failure or sabotage
`failed` fails Step 7 (fix handoff, max 3 retries, then Pause).

## Mutation

`status: skipped` — `defaults.skipMutationTesting: true` and
`verification.mutationTest` empty (both skip rules apply).

## Regression sabotage

Invert patch flips the gate's manifest-sha comparison (`!==` → `===`) in
`promptPairError`, so valid prompt pairs fail the gate; the new suite must exit
non-zero under inversion, and the helper must restore byte-identical content.
Command: `run_sabotage.cjs --test "npm run test" --paths <workflow_state> --invert-patch <patch>`.
