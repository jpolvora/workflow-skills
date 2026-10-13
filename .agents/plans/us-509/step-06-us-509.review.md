---
step: 6
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:57:00Z"
endedAt: "2026-10-13T02:00:00Z"
acRefs: []
---
# Code review — us-509

Diff under review: `git diff main...HEAD` (commit `f08e3ce3`), scoped to
`.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, its two existing suites,
the version/integrity bump, the rebuilt site, and one FEATURES.md sentence.

## Review verdict

**Clean — no Critical or Warning findings.**

## Checks

| Check | Result |
|-------|--------|
| Scope enclosure — only the single product touchpoint plus tests/version/integrity/site | Pass — `git show --stat` lists 11 files, none beyond the declared plan (AC DoR "Bounded scope") |
| Target-list termination — values consumed until the next `--` token | Pass — `while (... !argv[index+1].startsWith('--'))`; `--ac AC1 AC2 --score-boundary step5` stops correctly |
| All-or-nothing — ids validated before the first mutation | Pass — validation loops hoisted above `planIndex` backfill and the per-AC loops; no `writeJson` before them |
| Leftover rejection names the first unconsumed token | Pass — `unexpected token: ${positional[1]}` |
| Missing-value error names the flag, never `undefined` | Pass — `--${token.slice(2)} requires at least one value` |
| Bare `--productFailure` branch unchanged | Pass — original condition and `index -= 1` preserved verbatim |
| Union + dedup | Pass — `[...new Set(options.ac || [])]` / same for `--negative` |
| Single write / single revision bump | Pass — one `ledger.revision += 1` and one `writeJson` (temp file + rename) preserved |
| Already-applied event-id NOTICE/skip preserved | Pass — untouched |
| Golden-path usage lock preserved | Pass — `--ac`, `--commit`, `--score-boundary`, `Example:` all still printed |
| Node-only, no new dependency, no Python | Pass — `node --check` clean; no `.py` |
| Path containment / array-form spawn | Pass — unchanged call sites |
| Hashed content regenerated | Pass — `verify-integrity` OK (v0.5.44) |

## Caller sweep (no regression)

Every in-repo caller passes flags only — `commit_g2_code.cjs:154-159` (repeated
`--ac`), `test-per-task-adequacy.js:190` (repeated `--ac`), the other suites
(single `--ac`), and the operator recipes in `ws-implement-tasks/SKILL.md:54`
and `gates.md:230`. None relies on silently dropped positional tokens.

## Observations (INFO, non-blocking)

- INFO-001: the new `positional.length > 1` guard also rejects a stray token
  attached to `--help` (e.g. `link --help extra`). No caller or test does this;
  fail-closed is the intended posture for AC7.
- INFO-002: the delivered `knownDefect`-free score depends on linking observed
  tests for the spec negative scenarios; the ledger now records NS1-NS12 with
  observed passing tests.

## Fix rounds

None required. No product files changed after review.

## Fable audit

`fable.enabled: true`, `autoAudit: true`. Adversarial re-check of the diff against
the spec's failure class (silent partial application) found no `REFUTED` claim:
the reproduction is fixed, the atomicity property is preserved, and the loud
fallback is asserted.
