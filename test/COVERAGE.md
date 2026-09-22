# Coverage — audit, gate, and justifications (us-380)

## 1. Near-100% definition

- **File coverage 100%**: every testable unit (`.agents/skills/**/scripts/*.cjs|*.js`,
  `bin/*.js`, `test/run-tests.cjs`) is executed by at least one suite entry.
- **Line ratchet ≥ 80%** and **branch ratchet ≥ 68%** over the same scope,
  enforced by `npm run coverage` (c8 over `node test/run-tests.cjs`; c8 propagates
  `NODE_V8_COVERAGE` into spawned script processes, so CLI scripts are measured).
- Thresholds are pinned from the measured post-us-380 baseline (lines 81.75%,
  branches 70.13%, functions 91.36%) minus a ~1-point variance allowance. Any
  regression below the ratchet fails the gate; raising the ratchet is welcome.

## 2. Audit (2026-09-22, AC1)

Method: enumerate all 108 units, grep the whole `test/` corpus (test files plus
`test-suites.json`) for each unit stem.

| Finding | Count |
|---------|-------|
| Testable units | 108 (98 skill scripts, 9 `bin/` entries, `test/run-tests.cjs`) |
| Covered before us-380 | 102 |
| Uncovered before us-380 | 6 |
| Test files existing but never run (orphans) | 3 (`test-classifier-history`, `test-spec-validation`, `test-workflow-state-contract`) |

Uncovered units and disposition:

| Unit | Disposition |
|------|-------------|
| `ws-activity-report/scripts/bootstrap_start.cjs` | New `test/test-bootstrap-start.js` |
| `ws-shared/runtime/scripts/ac_counts.cjs` | New `test/test-ac-counts.js` |
| `ws-spec-from-provider/scripts/list_my_user_stories.cjs` | New `test/test-provider-listers.js` (hermetic paths only) |
| `ws-spec-from-provider/scripts/list_open_issues.cjs` | Same as above |
| `ws-spec-to-pr/scripts/write_verification_manifest.cjs` | New `test/test-write-verification-manifest.js` |
| `bin/generate-skill-evals.js` | New `test/test-generate-skill-evals.js` + `WORKFLOW_SKILLS_EVALS_ROOT` test-only helper |

## 3. Missing-test plan summary (AC2)

Priority: wire 3 orphans (P0) → bootstrap/ac-counts (P0) → manifest/listers/evals
(P1) → runner `--list` contract (P2). Isolation: `temp()` fixtures only, no live
network (`gh`/PAT/config-missing paths fail before any spawn), no wall-clock
asserts, unique temp prefixes, sync `spawnSync` only. Flake guards: each file
standalone; full suite green across two consecutive runs.

## 4. Gate (AC4)

One command: `npm run coverage` (requires devDependency `c8`, Node 22).
Report: text stdout plus `coverage/coverage-final.json` (untracked build output).

## 5. Uncovered-line justifications (AC4)

Full line/branch closure is not achievable hermetically; the clusters below are
accepted and must not be "fixed" with live-network tests:

- Provider network paths (`fetch_threads`, `github-issue-to-spec`,
  `ado-workitem-to-spec`, `sweep_prior_work`, `list_my_user_stories`,
  `list_open_issues` live branches): live `gh`/ADO calls forbidden in tests;
  arg parsing, `--help`, and pre-network error paths are covered.
- `bin/cli.js` installer branches (download/extract failures, platform shims):
  covered for help, version, and local flows; destructive/remote branches excluded.
- `resolve_consumer_root.cjs` global-install fallbacks: exercised for the
  project-local path; machine-global layouts vary by host.
- `generate-skill-integrity.js` digest-mismatch exits: covered for generate/verify
  happy paths; corruption branches covered by integrity tests where hermetic.

## 6. Suite budget (AC5)

New tests add 9 fast hermetic entries (each < 30 s locally). Allowance: suite
wall time +5 min over the pre-change baseline. Timing measured in CI logs.

## 7. Wiring changes (AC3/AC6)

- `test/test-suites.json`: +9 local entries (3 orphans + 6 new gap tests).
- `package.json`: `coverage` script + `c8` devDependency.
- `bin/generate-skill-evals.js`: `WORKFLOW_SKILLS_EVALS_ROOT` test-only helper
  (default behavior unchanged).
