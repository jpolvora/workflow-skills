## Summary

Fixes #509. `ac_ledger.cjs link` advertised a space-separated target list (`[--ac ACn ...]`) but `parseArgs` consumed exactly one value per flag occurrence and dropped every remaining non-flag token, so `link --commit sha=<sha>,step=5 --ac AC1 AC2 AC3` silently attached the commit to `AC1` only and exited 0. The remaining ACs kept failing the `pre-step6` gate with misleading `product commit linkage required before step 6` errors.

## Change

- `parseArgs`: `--ac` and `--negative` now consume every following token until the next `--`-prefixed token (target list). The repeated form keeps working. A target list with no value errors naming the flag; any token no flag consumed errors naming the first offender. The value-optional `--productFailure` branch is unchanged.
- `link`: resolves the target set as the deduplicated union of the space-separated and repeated ids, validates every named id against the ledger **before** the first mutation (all-or-nothing), and applies the whole payload to every target in the existing single temp-file-plus-rename write with one `revision` bump.
- `ledgerHelpText('link')`: documents both `--ac AC1 AC2` and `--ac AC1 --ac AC2`.

## Scope

Product touchpoint: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`. Asserts live in the existing suites (`test/test-ac-ledger.js`, `test/test-script-ux-golden-path.js`); no new suite row. Space-separated grouping for the other repeatable flags stays out of scope (they now fail loudly instead of truncating).

## Verification

- `node test/test-ac-ledger.js`, `test/test-script-ux-golden-path.js`, `test/test-per-task-adequacy.js` — exit 0
- `npm run test` (`backendTest`) — exit 0, 164/164
- `node test/test-harness-clean.js` — 0 findings
- `npm run generate-integrity` / `verify-integrity` — OK (v0.5.44)
- Derived ledger score 10/10; fresh-verify fault injection: 13 injections, all caught

Version: `0.5.43` → `0.5.44`.

Note: `test/test-subagent-dispatch.js` has a documented 400 ms child-startup timing flake under load; it was re-run green and the full suite passed.

### Foreign commits in range

Commits reachable from `13a5ece` but not produced by this batch (`a7325de..13a5ece`):

- none detected
Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #516.
