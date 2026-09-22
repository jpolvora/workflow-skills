# Plan — us-380: test coverage to near 100%

Spec: `.agents/specs/0113-us-380.spec.md`. Flow: standard (steps 0–9 inline).

## 0. Step 0 — spec + classify (done)

- `validate_spec.cjs --mode=authoring` → PASS (8 ACs).
- Complexity: multi-file, new gate + new tests → **standard**.

## 1. AC1 — coverage audit (done, formalize in `test/COVERAGE.md`)

Method: enumerate every testable unit (`.agents/skills/**/scripts/*.cjs|*.js`,
`bin/*.js`, `test/run-tests.cjs`) and grep the whole `test/` corpus
(files + `test-suites.json`) for each unit stem.

Result (2026-09-22): **108 units, 102 covered, 6 uncovered, 3 orphaned tests**.

Uncovered units:

| # | Unit | Notes |
|---|------|-------|
| 1 | `ws-activity-report/scripts/bootstrap_start.cjs` | Pure FS logic, hermetic-testable |
| 2 | `ws-shared/runtime/scripts/ac_counts.cjs` | Library (`module.exports`), require-testable |
| 3 | `ws-spec-from-provider/scripts/list_my_user_stories.cjs` | Needs `gh`; test `--help`/arg-validation/error paths only |
| 4 | `ws-spec-from-provider/scripts/list_open_issues.cjs` | Same as 3 |
| 5 | `ws-spec-to-pr/scripts/write_verification_manifest.cjs` | Temp-fixture testable |
| 6 | `bin/generate-skill-evals.js` | ESM generator; test `--help`/dry-run or output shape in temp clone |

Orphaned tests (exist, never run): `test-classifier-history.js`,
`test-spec-validation.js`, `test-workflow-state-contract.js`.

Near-100% definition (AC1/AC4): **file coverage 100%** (every unit executed by
≥1 suite entry) **+ line threshold + branch threshold** enforced by one command
(`npm run coverage`, c8 over `node test/run-tests.cjs`; c8 propagates
`NODE_V8_COVERAGE` to spawned script processes). Thresholds pinned after
baseline (§4).

## 2. AC2 — missing-test plan (priority order)

1. Wire 3 orphans into `test-suites.json` local (P0 — zero new code, immediate gain).
2. `test-bootstrap-start.js` (P0) — temp plan dirs, candidate ranking, missing dir.
3. `test-ac-counts.js` (P0) — require library, ledger matrix incl. malformed JSON.
4. `test-write-verification-manifest.js` (P1) — `--help`, temp usDir manifest write.
5. `test-provider-listers.js` (P1) — `--help` exit 0, bad `--limit` exit ≠ 0,
   missing-config error path; no `gh` invocation (assert failure occurs before
   spawn or stub `gh` via temp PATH shim returning canned JSON).
6. `test-generate-skill-evals.js` (P1) — run against temp skills root if flag
   supported, else assert help/usage + idempotent dry output shape.
7. `test/run-tests.cjs --list` smoke (P2) — assert entry count > 0 and orphans present.

Isolation rules: `temp()` fixtures only, `cwd` restored, `env` extended not
replaced, no live network (`gh` stubbed), no wall-clock asserts, unique temp
prefixes, all promises awaited/handled, handles closed.
Flake guards: two consecutive full-suite runs, order-independence by construction
(each file standalone via `run()`).

Out of scope (per spec): product behavior changes, runner rewrite, mutation gate,
benchmarks, live-network tests.

## 3. AC3 — implement + full suite green twice

Add test files above, register in `test-suites.json`, run `npm run test` twice.

## 4. AC4 — coverage gate

- Add `c8` devDependency; `package.json`: `"coverage": "c8 --check-coverage
  --lines <T> --branches <B> --reporter=text --reporter=json
  --include='.agents/skills/**/scripts/*.{cjs,js}' --include='bin/*.js'
  --include='test/run-tests.cjs' --exclude='test/**' node test/run-tests.cjs"`.
- Baseline first, then pin T/B at-or-just-below measured post-test values and
  record them in `test/COVERAGE.md` with uncovered-line justifications.
- `test/COVERAGE.md` = audit matrix + this plan summary + gate definition +
  justifications (single artifact, no repo writes outside `test/`, `bin/` untouched
  except nothing, `package.json` scripts only).

## 5. AC5/AC7/AC8

- AC5: suite time measured before/after, allowance stated in COVERAGE.md.
- AC7: new files `.js` CommonJS via `node` launcher; validate CLI inputs;
  FS inside temp/repo roots; `scan_stack_invariants.cjs --stack typescript-node`
  no new findings.
- AC8: `ws-secrets-leak-review` clean; no tokens in fixtures.
- AC6: `generate-integrity` + `verify-integrity` + `ws-check-harness` exit 0.

## 6. Stack & Security Invariants Verification Plan

typescript-node subset on new helpers: awaited promises (assert via sync
`spawnSync` only), validated inputs (arg-parse tests), contained paths
(`temp()` + repoRoot only), closed handles (spawnSync, no servers).
`tsc` N/A (JS). Verified by `scan_stack_invariants.cjs` + negative scenarios
(malformed ledger, missing dir, bad limit, missing config).

## 7. Ship

Product commit after verify ≥ 9 → `ws-ship-pr` (base `main`) →
`ws-goal-fix-pr` to 0 threads + green → merge. No push before ship phase.

## Self-interview (Step 2, inline)

- Q: Does c8 cover spawned processes? A: Yes via env inheritance; verify in baseline.
- Q: CI has no install step — will `npm run coverage` fail there? A: Add separate
  `coverage` CI job with `npm install` + gate; leave existing job untouched.
- Q: `generate-skill-evals.js` writes into `.agents/skills/*/evals/` (repo writes)?
  A: Must test in temp clone or via env override; if it hardcodes repo root, test
  usage/help + pure functions only, justify remainder in COVERAGE.md.
- Q: Threshold gaming? A: Thresholds pinned from measured baseline + new tests must
  raise, not lower, coverage; justifications required per uncovered line cluster.
