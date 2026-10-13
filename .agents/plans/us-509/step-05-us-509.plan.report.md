---
step: 5
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:09Z"
endedAt: "2026-10-13T01:57:00Z"
acRefs: []
---
# Check-implementation report — us-509

Spec: `step-00-us-509.spec.md` (plan of record: `step-02-us-509.plan.refined.md`).
Boundary: `step5`. Derived score: **10/10** (earnedUnits 150 / totalUnits 150,
`knownDefect: false`, `missingEvidence: false`, `errors: []`).

## Change under test

`ac_ledger.cjs`:

- `parseArgs` consumes `--ac` / `--negative` as space-separated target lists
  terminated by the next `--`-prefixed token; a missing value errors naming the
  flag; any token no flag consumed errors naming the first offender; the
  value-optional `--productFailure` branch is unchanged.
- `link` resolves the deduplicated union, validates every named id before the
  first in-memory mutation, and applies the whole payload to every target in the
  single temp-file-plus-rename write, bumping `revision` once.
- `ledgerHelpText('link')` documents both accepted `--ac` forms.

## AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `test/test-ac-ledger.js` — one `--ac AC1 AC2 AC3` link; all three rows carry `commits[]` and `linkEventIds[]` |
| AC2 | Implemented | same call; each of AC1-AC3 gains the commit and event id in one write |
| AC3 | Implemented | `--ac AC1 AC2 --ac AC1 --ac AC3` resolves to one deduplicated set; exactly one `union-evt` per row |
| AC4 | Implemented | `--ac AC1 AC2 --score-boundary step5` persists boundary `step5` (list stopped at the next flag) |
| AC5 | Implemented | unknown-id call leaves `AC1` without the rejected commit/status (validate before mutate) |
| AC6 | Implemented | `--ac AC1 AC99` exits 1 with `unknown AC: AC99`; ledger file byte-identical |
| AC7 | Implemented | `--commit a b` exits 1 naming `sha=2222222,step=5`; nothing persisted |
| AC8 | Implemented | `--negative NS1 NS2` links both rows in the fixture ledger |
| AC9 | Implemented | `link --help` names `--ac AC1 AC2` and `--ac AC1 --ac AC2` |
| AC10 | Implemented | one revision bump per successful multi-target link |
| AC11 | Implemented | replayed `g2-multi` prints the NOTICE and skips the payload |
| AC12 | Implemented | multi-AC `--commit ... --score-boundary pre-step6` derives `errors: []` |
| AC13 | Implemented | `--ac` with no value exits 1 with `--ac requires at least one value`; no `undefined` |
| AC14 | Implemented | bare `--product-failure` leaves the following `--status Implemented` consumed as a flag |
| AC15 | Implemented | `score --boundary nope` exits 1 naming `step5, pre-step6, ship` (unchanged) |

## Spec negative scenarios (NS1-NS12)

All twelve spec negative/failing scenarios are asserted in
`test/test-ac-ledger.js` (NS1-NS12) and mapped in the ledger. The NS9 usage lock
additionally asserts in `test/test-script-ux-golden-path.js`.

## Reproduction (pre-fix baseline vs post-fix)

- Pre-fix (documented in the spec, verified on `0.5.40`): `link --commit
  sha=<sha>,step=5 --ac AC1 AC2 AC3` linked `AC1` only, exited 0, and left two
  `product commit linkage required before step 6` errors at `--boundary pre-step6`.
- Post-fix (measured this run): the same command links all three rows
  (`AC1/AC2/AC3 commits=[{sha:'abcdef1',step:5}]`, `revision=2`) and
  `score --boundary pre-step6` reports `errors: []`.

## Verification executed

| Command | Result |
|---------|--------|
| `node --check .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` | exit 0 |
| `node test/test-ac-ledger.js` | ok (exit 0) |
| `node test/test-script-ux-golden-path.js` | ok (exit 0) |
| `node test/test-per-task-adequacy.js` | ok (exit 0) |
| `npm run generate-integrity` / `npm run verify-integrity` | OK (v0.5.44) |
| `node test/test-harness-clean.js` | 0 findings |
| `npm run test` (`verification.backendTest`) | exit 0 — all 164 entries passed |

Note: `test/test-subagent-dispatch.js` flaked once with its documented
`child started before the kill` timing assertion (a 400 ms child-startup race
under load, unrelated to this change); a lone re-run passed and the full
`npm run test` then passed 164/164.

## Diff scope

Only the single product touchpoint (`.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`),
its existing suites, the regenerated integrity record, the version bump, the
rebuilt site, and one FEATURES.md sentence. No new dependency, no Python, no
`config.json` schema change.

## Score rationale

Every AC row reaches full units (status, linked files, mapped observed test,
plan sections); the configured `backendTest` alias is observed passing; no
negative scenario is uncovered; no critical invariant violation. Derived score
**10/10** ≥ `defaults.minVerifyScore` (9).
