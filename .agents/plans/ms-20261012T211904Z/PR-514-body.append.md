## Summary

`ws-monitor` discovered runs exclusively from `*.state.json` / `*.state.md`, so a
plan directory holding live step artifacts but no state file was invisible: the
snapshot printed `Workflows: 0 (0 active)`, no finding was emitted, and
`--watch --until-terminal` exited on the first tick. The designated live observer
could not see an in-flight run that lost (or never wrote) its machine state.

This change derives state-less activity from the existing step-artifact model
(the us-388 precedent: derive from the model, do not add a parallel detector) and
surfaces it.

## Changes

- `ws-monitor/scripts/monitor_snapshot.cjs`
  - `isStepArtifactName` (`step-NN-{slug}.` prefix, plus `step-05b-`), `statelessFreshness`, `listStatelessRuns`.
  - `snapshot()` discovers state-less runs (bounded top-level scan; state presence — not parse success — is the discriminator; `--slug` matches by plan directory name; `--workflow-id` never selects) and builds an `active`/`stale` record with `statePath: null`, unknown step/verification fields, and the newest artifact as repo-relative evidence.
  - Window-derived `run-without-state` finding: `warning` while the newest artifact is inside the effective stall window (`--stall-window`, default 600s), `info` when older; fresh runs join `workflowCount`/`activeCount` and suppress the empty-discovery line; stale runs stay visible without holding `--until-terminal` open.
  - `DEFECT_CONTRACTS['run-without-state']`; helpers exported; liveness/transcript loop skips state-less records.
- `ws-monitor/SKILL.md`: signal-map row + actionable-signals entry.
- `test/test-ws-monitor-us507.js` (new, 19 AC blocks) registered in `test/test-suites.json`.
- Version `0.5.42` + regenerated integrity; README/FEATURES/site footer updated.

Unchanged by design: `missing-child-state`, `stateDerivedSlug` selection, the
liveness stopwatch, and the read-only observer contract.

## Observable signal

Repro fixture (`{plansDir}/demo/` with `step-00-demo.spec.md` and
`step-01-demo.plan.md`, no state file):

- before: `Workflows: 0 (0 active)` + `No workflow state files found …`
- after: `Workflows: 1 (1 active)` + `WARNING \`run-without-state\` … Evidence: .agents/plans/demo/step-01-demo.plan.md`

## Acceptance criteria

All 19 spec ACs are covered by the new suite; fresh-verify re-derived every AC
with one fault injection each (19/19 red signals, 0 defects).

## Verification

| Check | Result |
|-------|--------|
| `npm run test` | all 164 entries passed |
| `node test/test-ws-monitor-us507.js` | ok |
| `node test/test-harness-clean.js` | 0 findings |
| `npm run verify-integrity` | OK (v0.5.42) |
| `scan_stack_invariants.cjs` | 0 issues |
| Monitor regression anchors | all green (`us-388`, `us-395`, `us-464`, `us-473`, `us-476`, `us-478`, liveness, watch-profile, base suite, observer) |

Check score 10/10; review found one Warning (needless scan under `--workflow-id`),
fixed in `1925b9f9`.

## Notes

- Do not merge with open review threads; the batch owner merges.
- Closes #507.

### Foreign commits in range

Commits reachable from `8ac467d` but not produced by this batch (`7aded9c..8ac467d`):

- none detected

Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #514.
