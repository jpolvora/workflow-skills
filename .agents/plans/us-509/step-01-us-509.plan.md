---
superseded: true
supersededBy: step-02-us-509.plan.refined.md
step: 1
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:09Z"
endedAt: "2026-10-13T01:52:09Z"
acRefs: []
---
# Implementation Plan — us-509

## 1. Problem

`ac_ledger.cjs link` advertises a space-separated target list (`[--ac ACn ...]`
in `ledgerHelpText`), but `parseArgs` consumes exactly one value per flag
occurrence and pushes every leftover non-flag token into a `positional` array
whose only consumer is the subcommand name. Nothing validates the leftovers, so
`link --commit sha=<sha>,step=5 --ac AC1 AC2 AC3` silently attaches the commit
and the event id to `AC1` only, exits 0, and leaves the remaining ACs failing the
`pre-step6` completion gate with misleading
`product commit linkage required before step 6` errors.

The fix is a bug fix to existing behavior, not a new feature: the parser must
consume the documented target-list form, the payload must stay all-or-nothing,
and every token no flag consumed must fail loudly instead of being dropped.

## 2. Approach

1. **Target-list consumption (`parseArgs`).** Extend the loop so the target-list
   flags `--ac` and `--negative` consume every following token until the next
   `--`-prefixed token (AC1, AC4). Keep the value-optional bare-flag branch
   (`--productFailure`) intact (AC14). Leave every other repeatable flag at
   exactly one value per occurrence; the tokens they do not consume become
   errors (AC7, out-of-scope grouping for them).
2. **Reject leftovers.** After the loop, `positional[0]` is the subcommand; any
   extra positional token is an unconsumed-token error that names the first
   offending token (AC7).
3. **Missing target value.** A target-list flag with zero following values is an
   error that names the flag (`--ac requires at least one value`), never the
   literal token `undefined` (AC13).
4. **Union + validation before mutation (`link`).** Resolve the target set as the
   deduplicated union of the space-separated and repeated ids; validate every
   named `--ac` / `--negative` id against the ledger before the first in-memory
   mutation, so the invocation is all-or-nothing and an unknown id exits non-zero
   naming it with the ledger left byte-identical (AC3, AC5, AC6, AC8).
5. **Single write.** Apply status, files, tests, commit, verdicts, findings, and
   the adequacy record to every resolved target in the existing single temp-file
   plus rename write, incrementing `revision` exactly once (AC2, AC10). Keep the
   already-applied `--event-id` NOTICE/skip behavior (AC11) and the derived
   `scoreState` (AC12).
6. **Usage text.** Add the space-separated `--ac AC1 AC2` form alongside the
   repeated form in the `link` help without dropping `--ac`, `--commit`,
   `--score-boundary`, or the `Example:` line (AC9, AC15 keeps the boundary
   labels).
7. **Regression anchors.** Extend `test/test-ac-ledger.js` and
   `test/test-script-ux-golden-path.js` (no new suite row, per spec); keep
   `test/test-per-task-adequacy.js` green.

## 3. Files touched

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` | `parseArgs` multi-value targets + leftover rejection + missing-value error (AC1, AC4, AC7, AC13, AC14); `link` union/validate-before-mutate (AC2, AC3, AC5, AC6, AC8, AC10); `ledgerHelpText('link')` space-separated form (AC9) |
| `test/test-ac-ledger.js` | Multi-AC target-list, unknown-id atomicity, leftover-token, missing-value, `--negative` parity, dedup, and pre-step6 error-list assertions (AC1-AC8, AC10-AC14) |
| `test/test-script-ux-golden-path.js` | `link --help` still documents `--ac`, `--commit`, `--score-boundary` and the `Example:` line after the usage change (AC9) |
| `README.md`, `FEATURES.md` | Note the accepted `link` target-list forms in the feature narrative |
| `bin/skill-integrity.json` | Regenerated hash for `ac_ledger.cjs` |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `docs/index.html` | Patch version bump (once) |

## 4. AC coverage

- AC1, AC4: T01 `parseArgs` multi-value consumption terminated by the next `--` token.
- AC2, AC10: T02 `link` payload applied to every named target in one write, one revision bump.
- AC3: T03 union + dedup of space-separated and repeated ids.
- AC5, AC6: T04 pre-mutation validation, unknown id exits non-zero with a byte-identical ledger.
- AC7: T05 leftover-token rejection naming the first unconsumed token.
- AC8: T06 `--negative` shares the target-list semantics.
- AC9: T07 `ledgerHelpText` documents both `--ac` forms.
- AC11: T08 already-applied event id NOTICE/skip preserved.
- AC12: T09 multi-AC `link --score-boundary pre-step6` derives no linkage error.
- AC13: T10 `--ac` with no value names `--ac`.
- AC14: T11 bare `--productFailure` still parses `true` without consuming the next token.
- AC15: T12 invalid `--boundary` label still names `step5, pre-step6, ship`.

## 5. Verification plan

- `node --check .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`
- `node test/test-ac-ledger.js`
- `node test/test-script-ux-golden-path.js`
- `node test/test-per-task-adequacy.js`
- `npm run generate-integrity` + `npm run verify-integrity`
- `node test/test-harness-clean.js` (0 findings)
- `npm run test` (`config.json` → `verification.backendTest`)

## 6. Stack & Security Invariants Verification Plan

| Boundary | Invariant | Check |
|----------|-----------|-------|
| Runtime | Node 22 CommonJS `.cjs` only; no Python | `node --check` on the edited helper; `.py`/`__pycache__` scan under `.agents/skills/**`/`bin/` (harness Phase 0) |
| Dependencies | No new runtime dependency | `git diff package.json` shows the version bump only |
| Input validation | Flag values validated before any mutation; a rejected invocation names the offending token | Negative scenarios 2, 3, 4, 7 executed green |
| Path containment | Ledger/helper paths stay resolved through `path.resolve(context.repoRoot, ...)` | Diff review plus `node test/test-ac-ledger.js` with `--repo-root` fixtures |
| Process spawning | Child processes keep the `spawnSync('node', [args])` array form | Diff review of `runAdequacyHelper` |
| Durable write | Ledger write stays temp-file plus rename | Fixture asserts no `ac-ledger.json.tmp-*` residue |
| Portability | No host-product coupling; no new `config.json` key | grep changed files; `config.schema.json` unchanged |

## 7. Out of scope

Per spec: space-separated grouping for `--file`/`--test`/`--commit`/`--verdict`/
`--finding`/`--files-touched`; making the already-applied event-id skip a strict
no-write; changing `score`/`verify` exit codes; hardening `commit_g2_code.cjs` to
fail fast; comma-separated id parsing; rewriting the operator documentation that
prescribes the repeated form; reimplementation or a new dependency.
