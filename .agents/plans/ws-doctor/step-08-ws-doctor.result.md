# ws-doctor — Delivery Result

## Expected

New Workflows harness skill `ws-doctor` that read-only diagnoses installed workflow skills: path errors after token expansion, invalid tool/script launcher and parse failures, configuration values/switches, and missing companion references. Package registration in dependency graphs and hubs; integrity and harness green (AC1–AC11).

## Done

- `.agents/skills/ws-doctor/SKILL.md` + `scripts/doctor.js` (`--skill`, `--json`, hybrid roots, missing-config tip)
- Hub + dep registration (`bin/` + `ws-shared` graphs; root + `ws-shared` AGENTS routers); not autoloaded
- `test/test-ws-doctor.js` wired into `package.json` tests
- Integrity regenerated; catalog rebuilt; `npm run test` green; Step 5 score 9/10; Step 6 clean after 1 autofix; Step 7 testing pass (mutation skipped)
- Fable: VERIFIED WITH CAVEATS (Step 5)

## Next steps

- Step 8: upstream prepare board + delivery commit + create PR (`shipAction: create-pr`)
- Step 9: `ws-goal-fix-pr` until threads clear, then merge when checks green

## References

- Spec: `.agents/plans/ws-doctor/step-00-ws-doctor.spec.md`
- Plan: `.agents/plans/ws-doctor/step-01-ws-doctor.plan.md` (Step 2 skipped)
- Check: `.agents/plans/ws-doctor/step-05-ws-doctor.plan.report.md`
- Review: `.agents/plans/ws-doctor/step-06-ws-doctor.review.md`
- Testing: `.agents/plans/ws-doctor/step-07-ws-doctor.testing.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 1950s (~32.5 min) |
| Steps executed | 0–7 (2 skipped) |
| Total tokens | estimated (not metered) |
| LOC lines (ship-scope skills/test/hubs/bin/docs) | see git diff --stat at ship |
| Mode | autoMode + fullMode; shipAction create-pr |
| Commits | pending Step 8 |
