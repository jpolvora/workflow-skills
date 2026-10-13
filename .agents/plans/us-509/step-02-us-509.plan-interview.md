---
step: 2
slug: us-509
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:09Z"
endedAt: "2026-10-13T01:52:09Z"
acRefs: []
---
# Plan Interview — us-509

Audit of `step-01-us-509.plan.md` before implementation. Complexity class
`complex`; the classifier required the interview.

## Questions and resolutions

1. **Does accepting the space-separated form break the in-repo caller?**
   No. `commit_g2_code.cjs:157` emits the repeated form
   (`linkedAcs.flatMap((id) => ['--ac', id])`) and `ws-implement-tasks/SKILL.md:54`
   prescribes one `--ac` per AC. The union of the space-separated and repeated
   ids keeps both forms working (AC3).
2. **Where does validation move to?** `link` currently resolves ids in the
   per-AC loop and throws on the unknown row before `writeJson`, so the ledger is
   already byte-identical on failure. The refined plan hoists an explicit
   pre-mutation validation of every named `--ac` / `--negative` id so the
   all-or-nothing contract is stated and asserted rather than incidental (AC5,
   AC6).
3. **Which flags become space-separated?** Only `--ac` and `--negative` — the
   two target lists of the same subcommand. Every other repeatable flag keeps one
   value per occurrence; the leftover rejection in `parseArgs` is what makes
   `--commit a b` fail loudly instead of dropping `b` (AC7, out of scope for the
   rest).
4. **Does the leftover rejection have an existing caller that passes positional
   values?** No. Every call site in `test/**`, `bin/**`, and
   `.agents/skills/**` passes only flags; `positional[0]` is always the
   subcommand. The value-optional `--productFailure` branch consumes no following
   token, so it is unaffected (AC14).
5. **Usage-text lock.** `test/test-script-ux-golden-path.js:52-72` requires
   `link --help` to print `--ac`, `--commit`, `--score-boundary`, and an
   `Example:` line. The change is additive only (AC9).
6. **Hashed content.** `bin/skill-integrity.json` records the
   `ac_ledger.cjs` hash; integrity must be regenerated in the same change.
7. **Boundary label error.** AC15's `--boundary` validation lives in
   `scoreLedger` and is untouched; the plan guards it as a regression.

## Gaps found and folded into the refined plan

- Name the `--ac`/`--negative` missing-value error after the flag, and assert
  stderr does not contain the bare token `undefined` (AC13).
- Assert the deduplicated union with an exact commit-entry count per row and a
  single `revision` bump (AC3, AC10).
- Assert a rejected multi-target call leaves the first named row's `commits`,
  `status`, `files`, and `linkEventIds` untouched (all-or-nothing, AC5/AC6).
- Assert no `ac-ledger.json.tmp-*` residue after a failing and a successful link
  (durable write).

## Verdict

Plan approved; no open questions block implementation. Confidence high: single
product touchpoint, existing regression anchors, no schema or config change.
