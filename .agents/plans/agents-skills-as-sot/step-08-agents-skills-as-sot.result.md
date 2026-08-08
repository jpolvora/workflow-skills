# agents-skills-as-sot — Delivery Result

## Expected

Move upstream skill SoT from `src/skills` to `.agents/skills`; retarget installer/integrity/site/tests/hubs; update `ws-check-harness` / `ws-check-workflows`; remove `sync-skills`; invert gitignore; preserve consumer-owned `ws-shared` data; DoD via integrity + tests + harness scan root.

## Done

- [x] SoT lives under `.agents/skills` (39 packages); `src/skills` removed
- [x] Consumer-owned hub files preserved / excluded from pack
- [x] `bin/cli.js`, integrity, build-site, install-rules retargeted to `.agents/skills`
- [x] `package.json` ships `.agents/skills/`; version **0.0.119**; site bumped
- [x] Hubs/docs state `.agents/skills` as SoT; sync-skills removed
- [x] Harness upstream Skills scan root = `.agents/skills`; dogfood-lag / SoT-id equivalence removed
- [x] `npm run verify-integrity` OK; `npm run test` exit 0
- [x] Review clean after 1 fix round (pack exclusions for CHANGELOG.md + installed-skills.json)
- [x] Verify score **9/10**

## Next steps

- Create PR `develop` → `main` (fullMode)
- Step 9: `ws-goal-fix-pr` until review threads clear
- Confirm CI / harness on PR

## References

- Spec: `.agents/plans/agents-skills-as-sot/step-00-agents-skills-as-sot.spec.md`
- Plan: `step-02-agents-skills-as-sot.plan.refined.md`
- Check: `step-05-agents-skills-as-sot.plan.report.md` (9/10)
- Review: `step-06-agents-skills-as-sot.review.md` (+ fix report)
- Testing: `step-07-agents-skills-as-sot.testing.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 0h 32m 21s (1941s) |
| Steps executed | 0–7 completed |
| Total tokens | n/a (estimated: true; agent session) |
| LOC lines | Skill tree relocated `src/skills` → `.agents/skills` (protocol `src/web/tests` counters not primary for this move); package version 0.0.118 → 0.0.119 |
| Mode | [AUTO] [FULL] |
| Verify score | 9/10 |
| Review | Clean after 1 autofix round |
