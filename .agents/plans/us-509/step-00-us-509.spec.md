---
id: 509
slug: us-509
title: ac_ledger link --commit with multiple --ac attaches only to the first AC
source: github
specDate: 2026-10-12
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/509"
labels:
  - bug
step: 0
workflowId: us-509-20261013T015209Z
status: completed
startedAt: "2026-10-13T01:52:33.062Z"
endedAt: "2026-10-13T01:52:33.062Z"
acRefs: []
---
# Specification — ac_ledger link --commit with multiple --ac attaches only to the first AC

**State:** open
**Labels:** bug

## Description

`ac_ledger.cjs link` stamps acceptance criteria with status, files, tests, and the G2 product commit; `score --boundary pre-step6` then refuses to advance while any AC still lacks a commit (`ac_ledger.cjs:687`). The subcommand advertises a space-separated target list in its own usage text (`[--ac ACn ...]`, `ac_ledger.cjs:826`), but `parseArgs` consumes exactly one value per flag occurrence (`ac_ledger.cjs:87-88`) and pushes every remaining non-flag token into a `positional` array whose only consumer is the subcommand name (`ac_ledger.cjs:84`, `:96`, `:867`). Nothing validates those leftovers, so this is a bug fix to existing behavior rather than a new feature.

The failure class is **silent partial application**, not a rejected invocation:

- `link --commit sha=<sha>,step=5 --ac AC1 AC2 AC3` resolves the target list to `AC1` alone, attaches the commit and the event id there, writes the ledger once (`ac_ledger.cjs:342`, `:354-356`, `:518-523`), and exits 0.
- The unstamped ACs keep failing the pre-step6 gate with `product commit linkage required before step 6`, so the operator reads a linkage defect where the real cause is a truncated argument list: the call looked accepted and the tool reported success.

Reproduction (verified locally on version `0.5.40` with a three-AC throwaway ledger; exit codes and ledger content observed):

```bash
node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs link \
  --ledger <ledger> --event-id <id> \
  --commit sha=<sha>,step=5 --ac AC1 AC2 AC3
# exit 0; AC1 gains commits[] and linkEventIds[]; AC2 and AC3 stay unchanged
node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs score \
  --ledger <ledger> --boundary pre-step6
# exit 0; scoreState.errors[] = ["AC2: product commit linkage required before step 6",
#                                "AC3: product commit linkage required before step 6"]
```

Measured boundaries that scope the change (observed, not inferred): the repeated form `--ac AC1 --ac AC2` already links both rows; a failing target (`--ac AC1 --ac AC99`) exits non-zero with `unknown AC: AC99` and leaves the ledger byte-identical (SHA256 and `revision` unchanged); one successful call bumps `revision` exactly once; `--ac` with a missing value currently fails as `unknown AC: undefined`; and an unsupported `--boundary` label exits non-zero naming `step5`, `pre-step6`, and `ship` (`ac_ledger.cjs:633-634`).

Required behavior:

- One `--ac` accepts a space-separated id list, and the repeated form keeps working; the resolved target set is their deduplicated union, terminated by the next `--`-prefixed token.
- The whole payload (status, files, tests, commit, verdicts, findings, adequacy record) applies to every named target in a single write, or to none: ids are validated before the first mutation, an unknown id fails non-zero naming it, and nothing is persisted on failure.
- Tokens that no flag consumed are an error, never dropped. This is the loud fallback that stops any other repeatable flag (`--file`, `--test`, `--commit`, `--verdict`, `--finding`, `--files-touched`) from truncating silently; space-separated grouping for those flags stays out of scope.
- `--negative` follows the same target-list rules, because it is the sibling target list of the same subcommand (`ac_ledger.cjs:274`, `:343`) and reaches the same completion gate through the same loop.

Boundaries and touchpoints:

- Single product touchpoint: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` — `parseArgs` (`:74-97`), `link` (`:271-...`), and `ledgerHelpText` (`link` case at `:825-840`).
- The in-repo G2 caller already builds the repeated form (`commit_g2_code.cjs:157`, documented at `:85`) and is unaffected; it records a failed link as a warning and continues (`:161`), so the `scoreState.errors[]` list stays the observable signal rather than an exit code.
- Usage text is test-locked: `test/test-script-ux-golden-path.js:52-72` requires `link --help` to document `--ac`, `--commit`, and `--score-boundary` and to print an `Example:` line, so usage changes must be additive.
- Regression anchors: `test/test-ac-ledger.js` (registered at `test/test-suites.json:364`) drives `link` and `score` against `--repo-root` fixtures and validates the ledger against its JSON schema; `test/test-per-task-adequacy.js:19` covers the per-target adequacy validation that the multi-target path must preserve.
- Change surface obligation: `ac_ledger.cjs` is hash-tracked (`bin/skill-integrity.json:601`), so integrity data must be regenerated in the same change.
- Stack: Node 22 CommonJS `.cjs` with no new dependency and no Python; the ledger write stays temp-file plus rename (`ac_ledger.cjs:103-108`), so an interrupted write cannot truncate the ledger.
- Documented operator contract keeps both forms: `ws-implement-tasks/SKILL.md:54` prescribes one `--ac` per covered AC, `STEP-DISPATCH.md:94` links the G2 SHA, and `gates.md:229`, `:233` show single-target examples; none of them regress.

## Acceptance Criteria

- AC1: The `ac_ledger.cjs link` subcommand shall accept two or more AC ids after a single `--ac` flag as space-separated values.
- AC2: When `link` receives `--ac AC1 AC2 AC3` together with a `--commit` payload, the helper shall attach that commit and the event id to every named AC in one ledger write.
- AC3: While one invocation uses both `--ac AC1 --ac AC2` and `--ac AC1 AC2`, the helper shall resolve the target list as the deduplicated union of the named ids.
- AC4: When the value list after `--ac` reaches a token that starts with `--`, the helper shall stop consuming ids and treat the preceding values as the complete target list.
- AC5: The helper shall validate every named target id against the ledger before applying any evidence, so each `link` invocation is all-or-nothing.
- AC6: If a named target id is absent from the ledger, then the helper shall exit non-zero naming that id and shall leave the ledger file byte-identical.
- AC7: If `link` receives non-flag tokens that no flag consumed, then the helper shall exit non-zero naming the first unconsumed token instead of ignoring it.
- AC8: The helper shall apply the same multi-value, union, and all-or-nothing semantics to `--negative` target ids that it applies to `--ac`.
- AC9: The `link` usage text shall name both the space-separated `--ac AC1 AC2` form and the repeated `--ac AC1 --ac AC2` form.
- AC10: When a multi-target `link` succeeds, the helper shall record the commit and the event id on every named AC and increment the ledger revision exactly once.
- AC11: While the same event id is already applied to every named target, the helper shall skip the payload, print the existing `NOTICE` line on stderr, and exit 0.
- AC12: When a multi-AC `link --commit` call completes with `--score-boundary pre-step6`, the helper shall derive a `scoreState.errors` list without a `product commit linkage required before step 6` entry for any named AC.
- AC13: If `--ac` is supplied with no value, then the helper shall exit non-zero with a message naming `--ac` instead of the token `undefined`.
- AC14: When the bare `--productFailure` flag is passed with no value, the helper shall parse it as `true` without consuming the following token.
- AC15: If the `--boundary` label is not `step5`, `pre-step6`, or `ship`, then the helper shall exit non-zero with a message naming all three accepted labels.

## Original Issue Context

Verbatim body of GitHub issue #509 (snapshot audited at `.agents/plans/us-509/step-00-us-509.issue.json`; `state: OPEN`, `labels: [bug]`).

## Failure class

`ac_ledger.cjs link --commit` with multiple `--ac` targets silently attaches
the commit to the first AC only. The remaining ACs keep erroring
(`product commit linkage required before step 6`) with no indication the
link call was partial.

## Reproduction

```bash
node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs link \
  --ledger <ledger> --event-id <id> \
  --commit sha=<sha>,step=5 --ac AC1 AC2 AC3 AC4 AC5 AC6
node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs score \
  --ledger <ledger> --boundary pre-step6
# AC1 gains commits[]; AC2-AC6 still report linkage errors.
```

## Expected

Either attach the commit to every named AC, or fail loudly naming that
multi-AC commit linkage is unsupported. Silent partial application breaks
the score gate with misleading errors.

## Workaround

Loop one link call per AC with a suffixed `--event-id`.

### Prior Work Sweep

- Sweep result (`.agents/plans/us-509/prior-work-sweep.json`, `status: ok`, keywords `ac_ledger`, `link commit`): **no open pull request and no in-flight branch for tracker id 509**, so this is not duplicate work. The only `#509` pull-request hit is the merged release PR #454, which carries no code change for this failure class.
- PR #421 (merged) `feat(us-415-416-script-ux-golden-path)`: added the ledger usage surface (`e198a9a4`, which introduced `ledgerHelpText` and the `[--ac ACn ...]` line) and the review-fix commit `22496c78` that touched `ac_ledger.cjs`. It also introduced the help lock `test/test-script-ux-golden-path.js:52-72`, which is the assertion a usage-text change must keep green.
- Commit `f1655277` (merged) `fix(per-task-test-adequacy-review): fix-pr round 1 - link re-validates adequacy status, emit stays in-repo`: the last substantive `link` change; it validates the adequacy payload per `--ac` target, so a multi-target change must keep per-target adequacy validation intact.
- Commit `e3290ad9` (merged) `fix(review): support bare productFailure flag and guard fileTouched in report`: closest prior art inside `parseArgs` for value-optional flags (`ac_ledger.cjs:89-92`); any change to value consumption must not regress the bare-flag branch.
- Commit `2af629d0` (merged) `fix(review): persist options.filesTouched in link and assert schema validation`: pins the `link` payload persistence and the ledger schema assertion that the multi-target path must keep.
- PR #241 (merged) `fix-pr: batch plan (reviewer) then execute (fix model) — 0.3.40`: harness run that produced the surrounding `ac_ledger.cjs` review-fix commits in this history; no parser change and no overlap with this defect.
- No sibling spec covers `ac_ledger link` target lists (`.agents/specs/**` has no other match), so there is no spec-level duplicate risk to reconcile.

### Design Intent

Evidence: `git log -S "'ac', 'negative', 'file'"` and `git log -S "unknown AC:"` both attribute the parser and the id lookup to the original `ac_ledger.cjs` landing (`76c9795e`), later edited for review threads (`24ef03d7`); `git log -S "ACn ..."` and `git log -S "function ledgerHelpText"` attribute the usage text to `e198a9a4` (PR #421).

- **Intentional constraint — one value per flag occurrence.** The helper family builds `option = [...]` from repeated flags (`ac_ledger.cjs:77`, `:87-88`). The in-repo caller depends on that: `commit_g2_code.cjs:157` deliberately emits `...linkedAcs.flatMap((id) => ['--ac', id])`, its own usage documents `--ac AC1 --ac AC2` (`:85`), and `ws-implement-tasks/SKILL.md:54` instructs one `--ac` per covered AC. Repeated-flag consumption is therefore by design and must keep working; the defect is the missing rejection of tokens no flag consumed.
- **Intentional constraint — a failed link must not corrupt the ledger.** Ids are resolved and validated inside the per-AC loop (`ac_ledger.cjs:342`, `:354-356`) and the ledger is written only after it (`:518-523`). Measured: `--ac AC1 --ac AC99` exits 1 with `unknown AC: AC99`, and the ledger SHA256 and `revision` are unchanged. The fix must preserve that all-or-nothing property, not introduce validate-as-you-go writes.
- **Intentional constraint — usage text and help are test-locked.** `test/test-script-ux-golden-path.js:52-72` asserts every subcommand help prints a flag list plus `Example:`, so the `link` usage line can gain the space-separated form but cannot drop `--ac`, `--commit`, `--score-boundary`, or the example.
- **Intentional constraint — the completion gate reads the error list, not an exit code.** `score --boundary pre-step6` exits 0 while reporting linkage failures in `scoreState.errors[]` (measured), and `commit_g2_code.cjs:161` downgrades a failed link to a `WARN`. The observable to fix is therefore the derived error list, not a new exit convention.
- **Intentional constraint — hashed skill content.** `bin/skill-integrity.json:601` records the `ac_ledger.cjs` hash, so the edit requires regenerated integrity (root hub § Harness change protocol).
- **Accidental gap.** The `[--ac ACn ...]` usage line reads as space-separated repetition, but `parseArgs` never implemented it and never validated leftovers (`:84`, `:96`, `:867`). An agent or operator following the documented short form loses every target after the first, and the tool reports success: the usage text and the parser disagree, and only the parser's silent truncation is observable.

## Notes

- Evidence chain in execution order: `ac_ledger.cjs:74-97` (`parseArgs`; one value per occurrence at `:87-88`; leftover tokens at `:84`) → `:96`, `:867` (only `positional[0]`, the subcommand, is read) → `:272-277` (`link` target requirement) → `:342`, `:354-356` (only the resolved ids are mutated; unknown ids throw) → `:518-523` (single ledger write, `scoreState` recomputed) → `:687` (`product commit linkage required before step 6`) → `:826` (usage advertises `[--ac ACn ...]`).
- True failure mode per `--help`: `link --help` documents `--ac`, `--negative`, `--status`, `--file`, `--test`, `--commit`, `--verdict`, `--finding`, `--sabotage-exit`, `--adequacy-file`, `--gap`, `--plan-index`, `--alias-result`, `--test-surface-skip`, `--invariant-violation`, `--score-boundary`, `--files-touched`, `--failing-paths`, `--product-failure`; `score --help` documents `--ledger`, `--boundary step5|pre-step6|ship`, `--files-touched`, and states that `link` recomputes `scoreState` with `--score-boundary` winning, else `pre-step6` when commits exist, else `step5`.
- Failure-mode asymmetry worth keeping in mind while implementing: invalid input fails closed at exit 1 (`unknown AC: AC99`, `link requires at least one --ac, ...`, `boundary must be one of: step5, pre-step6, ship`), while a *low* score or a linkage error is reported inside the JSON with exit 0. Only the first class changes here.
- Observed quirk left alone: re-running an already-applied event id prints the `NOTICE` and still rewrites the ledger, bumping `revision` (3 → 4 in the reproduction) even though the payload is skipped. Payload idempotency is preserved (AC11); making the skip a strict no-write is deferred, because other gates read `revision` accounting.
- Reproduced and cleaned up locally: the probe ledger lived in a throwaway directory under the repository root (the helper rejects paths outside the repository, `resolveConsumerContext` containment) and was deleted after measurement; no fixture, ledger, or scratch file from this analysis is left behind.
- Anonymization: the issue text and this spec cite only this public package and repository-relative paths; ledger locations stay as the `<ledger>` and `{us-dir}/ac-ledger.json` tokens, and no host, machine, or consumer identifier is recorded.
- Committed-fixture consequence for the implementer: assertions belong in the existing suites (`test/test-ac-ledger.js`, `test/test-script-ux-golden-path.js`) so no new `test/test-suites.json` row is needed; a new file would require one (`:364` shows the existing registration).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Space-separated multi-value grouping for evidence flags (`--file`, `--test`, `--commit`, `--verdict`, `--finding`, `--files-touched`) | They keep exactly one value per flag occurrence and now fail loudly when a token is left unconsumed (AC7); extending grouping to them is a separate interface change with its own payload semantics. |
| Making the already-applied `--event-id` skip a strict no-write | Outside the reported failure class; `revision` is read by other gates, and the payload itself is already idempotent (AC11). |
| Changing `score` / `verify` exit codes so a low score or a linkage error exits non-zero | Callers and gates read `scoreState.errors[]` plus the derived score; changing exit semantics would break `commit_g2_code.cjs` and the verify loop for an unrelated reason. |
| Changing `commit_g2_code.cjs` to fail fast instead of warning when a link fails (`:161`) | Separate hardening of the G2 caller; this spec pins the linkage error list as the observable that must disappear once every named AC is linked (AC12). |
| Comma-separated id parsing (`--ac AC1,AC2`) and other alternative id dialects | One accepted dialect per flag keeps the parser predictable; recorded as a deferred idea in the context companion. |
| Rewriting the operator documentation that prescribes the repeated form (`ws-implement-tasks/SKILL.md:54`, `gates.md:229`, `:233`) | The repeated form remains supported, so those instructions stay correct; only the `link` usage text gains the additional accepted form (AC9). |
| Reimplementing the helper in another language or adding a dependency | The package ships Node 22 CommonJS `.cjs` helpers with no Python and no new runtime dependency; a reimplementation is not required to fix argument consumption. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Primary branch of the issue's "Expected" choice | Attach the payload to every named AC, so the space-separated form succeeds | The usage text already advertises `[--ac ACn ...]`, the issue calls the one-call-per-AC loop a workaround, and the repeated form stays working for `commit_g2_code.cjs:157`, so accepting the short form closes the defect without breaking a caller | n |
| Rejected-and-loud alternative | Any token no flag consumed fails the invocation non-zero, naming the first offending token, with nothing written | Gives the issue's second branch a concrete, testable home for every flag family (including the untouched evidence flags) instead of leaving silent truncation available elsewhere | n |
| Target-list terminator | Values are consumed until the next `--`-prefixed token | Mirrors the existing value-optional flag check (`ac_ledger.cjs:89-92`) and keeps `--ac AC1 AC2 --status Implemented` unambiguous | n |
| Combination of both accepted forms | Union of the space-separated and repeated ids, deduplicated | Makes `--ac AC1 --ac AC2 AC3` behave predictably and keeps recorded automation valid; a repeated identical id is not a second target | n |
| Repeated identical id | Collapses to one target instead of failing | A duplicate is not an input error, and failing would contradict the union semantics above; the negative scenarios still assert no duplicated commit or event entries | n |
| Unknown id handling | Non-zero exit naming the id, ledger byte-identical | Matches the measured current behavior (`unknown AC: AC99`, hash and `revision` unchanged), so the fix preserves atomicity instead of inventing a new failure contract | n |
| `--negative` parity | Same multi-value, union, and atomicity rules as `--ac` | Identical target-list semantics in the same subcommand (`ac_ledger.cjs:274`, `:343`) and the same silent-truncation class reaching the same gate | n |
| Auth boundaries, rate limits, data expiry, network failure, concurrency | N/A because the helper is a local Node CLI over a JSON ledger file with no network, authentication, or TTL surface, and one process writes the ledger per invocation | FORMAT.md implicit-dimension collapse for dimensions this change does not touch | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | The change touches one product file (`.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`) plus its existing test suites and the regenerated integrity record; no other skill body or script changes | `git diff --stat` lists only those paths |
| Atomic criteria | Each of AC1–AC15 asserts one observable outcome and none depends on another AC's internal state | AC-to-test map reviewed against this spec before implementation |
| Failure modes enumerated | Unknown id, unconsumed token, missing `--ac` value, duplicate id, already-applied event id, and invalid boundary label are covered by AC3, AC6, AC7, AC11, AC13, and AC15 | Negative scenarios below executed as red tests first |
| Observation telemetry | Link outcome is observable as `commits[]`, `linkEventIds[]`, and `revision` in the ledger JSON plus `scoreState.errors[]` after `score --boundary pre-step6` | `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger <fixture>/ac-ledger.json --event-id <id> --ac AC1 AC2 --commit sha=<sha>,step=5 --score-boundary pre-step6`, then `score --boundary pre-step6` |
| Existing anchors preserved | `link --help` keeps documenting `--ac`, `--commit`, and `--score-boundary` with an `Example:` line, and per-target adequacy validation still rejects a mismatched record | `node test/test-script-ux-golden-path.js`, `node test/test-per-task-adequacy.js`, `node test/test-ac-ledger.js` |
| Zero open blockers | Prior-work sweep reports no open pull request and no in-flight branch for issue #509, and no sibling spec owns `ac_ledger link` target lists | Sweep output recorded under Prior Work Sweep (`.agents/plans/us-509/prior-work-sweep.json`) |
| Stack invariant — Node-only runtime | The helper stays a Node 22 CommonJS `.cjs` module using only built-in modules; no new dependency, no `.py` file, and no Python invocation is added under `.agents/skills/` or `bin/` | `node --check .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` plus a `ws-check-harness` Phase 0/5a pass with 0 findings |
| Stack invariant — boundary input validation | CLI flag values are validated against the ledger before any mutation, and a rejected invocation names the offending token (`typescript-node.md` § 3) | Negative scenarios 2, 3, 4, and 7 executed and green |
| Stack invariant — path containment and process spawning | Ledger and helper paths stay resolved through `path.resolve(context.repoRoot, ...)` and any child process keeps the `spawnSync('node', [args])` array form (`typescript-node.md` § 4) | Diff review of the edited regions plus `node test/test-ac-ledger.js` with `--repo-root` fixtures |
| Stack invariant — durable write | The ledger write stays temp-file plus rename (`ac_ledger.cjs:103-108`), so an interrupted link cannot truncate the ledger | Fixture asserts no `ac-ledger.json.tmp-*` residue after a successful and a failing link |
| Integrity regenerated | `bin/skill-integrity.json:601` matches the edited helper before ship | `npm run generate-integrity` then `npm run verify-integrity` |
| Anonymization | Every cited path is repository-relative and no host, machine, or consumer identifier appears in the spec, the tests, or the new messages | Manual read of the diff plus a grep of the new strings for absolute paths |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Successful multi-target link: `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger {us-dir}/ac-ledger.json --event-id g2-commit-<sha> --ac AC1 AC2 AC3 --commit sha=<sha>,step=5 --score-boundary pre-step6` writes one ledger revision where every named row carries the commit in `commits[]` and the event id in `linkEventIds[]`.
- Completion gate signal: `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs score --ledger {us-dir}/ac-ledger.json --boundary pre-step6` exits 0 and its `scoreState.errors[]` contains no `product commit linkage required before step 6` entry for a linked AC; the reproduction above is the pre-fix baseline that must disappear.
- Idempotency signal: re-running the same `--event-id` prints `NOTICE: event-id "<id>" already applied to target criteria; skipping link payload` on stderr and exits 0.
- Usage signal: `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs link --help` exits 0 and names both accepted `--ac` forms alongside the existing flag list and `Example:` line.
- Failure signals that must stay fail-closed: `unknown AC: <id>` (exit 1), the new unconsumed-token message (exit 1), `link requires at least one --ac, --negative, --alias-result, --test-surface-skip, --gap, or --plan-index` (exit 1), and `boundary must be one of: step5, pre-step6, ship` (exit 1).
- Ledger-integrity observation: SHA256 of the ledger plus its `revision` before and after a rejected invocation must be identical; one successful invocation increments `revision` by exactly one.
- Suite anchors: `node test/test-ac-ledger.js`, `node test/test-script-ux-golden-path.js`, `node test/test-per-task-adequacy.js`, then `npm run test` (`config.json` → `verification.backendTest`) before the product commit.
- Integrity gate: `npm run generate-integrity` and `npm run verify-integrity` once the helper bytes change.

### Negative & Failing Test Scenarios

- Red test: a three-AC ledger plus `link --event-id <id> --commit sha=<sha>,step=5 --ac AC1 AC2 AC3` must link all three rows and derive no linkage error at `--boundary pre-step6`. On the pre-fix baseline the same command exits 0 with `commits` on AC1 only and two linkage errors, so the test fails before the change and passes after it.
- Red test: an unknown target alongside a valid one (`--ac AC1 --ac AC99`) must exit non-zero with `unknown AC: AC99` and leave the ledger byte-identical — SHA256 and `revision` unchanged, and AC1 must not receive the commit, status, or event id from the rejected call (all-or-nothing).
- Red test: a leftover token for a non-target flag (`--commit sha=<a>,step=5 sha=<b>,step=5`) must exit non-zero naming the second token and persist nothing; on the baseline the first commit is linked silently and the second vanishes.
- Red test: `--ac` with no value must exit non-zero with a message naming `--ac`, and stderr must not contain the bare token `undefined` (today's `unknown AC: undefined`).
- Red test: `--negative NS1 NS2` on a two-scenario ledger must attach the payload to both rows; on the baseline only `NS1` is linked and `NS2` keeps the `no observed passing test` deficiency.
- Red test: a duplicated id (`--ac AC1 --ac AC1 AC2`) must resolve to one target set with exactly one commit entry per row, no duplicated `linkEventIds` values, and a single revision bump.
- Red test: a multi-target call whose second id is unknown must leave the first id's `commits`, `status`, `files`, and `linkEventIds` untouched, proving no partial payload is persisted before validation completes.
- Regression assertion: the bare `--productFailure` flag still parses as `true` and consumes no following token, and alias-result fail-closed behavior is unchanged (`test/test-per-task-adequacy.js`, `test/test-ac-ledger.js`).
- Regression assertion: `link --help` still documents `--ac`, `--commit`, and `--score-boundary` with an `Example:` line, and every other subcommand help keeps its flag list (`test/test-script-ux-golden-path.js:52-72`).
- Contract assertion: an unsupported `--boundary` label still exits non-zero naming `step5`, `pre-step6`, and `ship`, while a valid boundary that finds a linkage error still exits 0 and reports it in `scoreState.errors[]` — the fix must not "repair" the gate by changing exit codes.
- Stack invariant test: the helper remains a Node 22 CommonJS module with no new dependency and no Python file or invocation; `node --check` passes and the harness detectors (`ws-check-harness` Phase 0 for `.py`/`__pycache__` and Phase 5a) report 0 findings for the edited skill.
- Durability test: force a failing link and a successful link against the same fixture and assert no `ac-ledger.json.tmp-*` residue remains, proving the temp-file-plus-rename write survived the new validation path.
