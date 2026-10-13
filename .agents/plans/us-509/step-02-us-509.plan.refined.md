---
step: 2
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:09Z"
endedAt: "2026-10-13T01:52:09Z"
acRefs: []
---
# Refined Plan — us-509

Refinement of `step-01-us-509.plan.md` after the Step 2 interview. The approach
is unchanged; the refinements below are the folded gaps. This is the plan of
record; `step-01-us-509.plan.md` is marked superseded.

## Refined implementation

1. `parseArgs` in
   `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`:
   - keep `--help`/`-h` and the value-optional `--productFailure` branch (AC14);
   - for `--ac` and `--negative`, consume every following token until the next
     `--`-prefixed token, erroring with `--ac requires at least one value` (or
     `--negative ...`) when none is present (AC1, AC4, AC13);
   - keep the other repeatable flags at one value per occurrence;
   - after the loop, `positional[0]` is the subcommand and any extra positional
     token throws `unexpected token: <token>` naming the first offender (AC7).
2. `link`:
   - resolve `acIds = [...new Set(options.ac || [])]` and
     `nsIds = [...new Set(options.negative || [])]` (AC3);
   - before any in-memory mutation, validate every named id against
     `ledger.acceptanceCriteria` / `ledger.negativeScenarios`, throwing
     `unknown AC: <id>` / `unknown negative scenario: <id>` (AC5, AC6);
   - apply the whole payload (status, files, tests, commit, verdicts, findings,
     adequacy) to every resolved target in the existing single
     temp-file-plus-rename write, incrementing `revision` once (AC2, AC8, AC10);
   - keep the already-applied `--event-id` NOTICE/skip (AC11) and the derived
     `scoreState` boundary, including a `pre-step6` multi-AC commit link deriving
     no linkage error (AC12).
3. `ledgerHelpText('link')`: document both `--ac AC1 AC2` and
   `--ac AC1 --ac AC2`, keeping `--ac`, `--commit`, `--score-boundary`, the flag
   list, and the `Example:` line (AC9).
4. AC15: `scoreLedger`'s `boundary must be one of: step5, pre-step6, ship` path
   is untouched and guarded by a regression assertion.
5. Tests: extend `test/test-ac-ledger.js` (multi-target link, union/dedup,
   unknown-id atomicity, leftover token, missing value, `--negative` parity,
   pre-step6 error list, tmp residue) and `test/test-script-ux-golden-path.js`
   (`link --help` both forms); keep `test/test-per-task-adequacy.js` green. No
   new `test-suites.json` row.

## Refined AC map

AC1/AC4 → `parseArgs` consumption block; AC2/AC10 → single-write revision block;
AC3 → union/dedup block; AC5/AC6 → atomicity block; AC7 → leftover-token block;
AC8 → `--negative` parity block; AC9 → golden-path `link --help` block;
AC11 → event-id replay block; AC12 → `score --boundary pre-step6` block;
AC13 → missing-value block; AC14 → bare `--productFailure` block; AC15 →
invalid-boundary regression block.

## Risk

Low. One product file; the only behavioral changes are (a) the newly accepted
space-separated target form and (b) leftover/missing-value tokens now failing
closed. Both are additive to the documented contract and no in-repo caller
depends on silent truncation.
