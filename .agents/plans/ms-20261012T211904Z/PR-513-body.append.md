## Summary

Adds a packaged, deterministic, **create-only state bootstrap** to the shared
workflow-state runtime so a fresh `ws-spec-to-pr` run can no longer reach ship
with no workflow state (issue #506). The packaged runtime only exposed
operations on an *existing* state file, so the first state write had no
supported command and an unattended `autoMode` run could skip it silently,
leaving no `.state.json`, `.state.md`, `telemetry.jsonl`, or plans-index row —
and making the mandatory pre-advance gate unsatisfiable.

## Changes

- `performInit` + `init` operation in
  `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`, reached through
  the shared `runUpdateCli` so both the standard and lite wrappers expose it.
  Identity derives from the run arguments plus the registered
  `step-00-{slug}.spec.md`; `syncStateDualWrite` writes the state pair,
  `refreshPlansIndexForState` keeps the index row hash coherent, and the result
  is validated before returning. Create-only and fail-closed.
- Absent-state remediation in `performUpdate` names the bootstrap command.
- Absent-state `; HS-5` label in the validator for any standard pre-advance
  check, naming the resolved missing state path.
- Contract docs: `setup.md` (bootstrap once; no hand-write), `gates.md`
  golden-path Step 0 row, `STEP-DISPATCH.md` Step 0 ordering.
- New suite `test/test-state-bootstrap.js`, registered in `test/test-suites.json`.
- Patch bump 0.5.40 → 0.5.41 with regenerated integrity.

## Acceptance criteria

AC1-AC18 from `0176-us-506.spec.md`, all covered with direct evidence in
`step-05-us-506.plan.report.md`.

## Verification

- `npm run tests` — all 163 entries passed.
- `npm run verify-integrity` — OK (v0.5.41).
- `node test/test-harness-clean.js` — 0 findings.
- Dogfood: this run's own state was created with the new `init`, and pre-advance
  gates 1, 4, 6, 7, 8, 9 passed on it.

Closes #506

### Foreign commits in range

Commits reachable from `5aac8c4` but not produced by this batch (`56a1994..5aac8c4`):

- `a7a64c25` Merge remote-tracking branch 'origin/main' into develop (`a7a64c25b35d0c01c746f624f44dcd40051c1e16`)
- `8926ebae` Merge remote-tracking branch 'origin/main' into develop (`8926ebae4ff8e630af81b2bf82189c8781be80b6`)
- `d4f2cb67` docs(specs): import issues 506-511 as pending specs and track them in index.PRD (`d4f2cb67c28adfbea9bcd146e4e6c590e425fa46`)

Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #513.
