# Check-Implementation Report — us-401

Score: 10/10 (minVerifyScore 9). All ACs implemented with evidence; no
scoreAndRefine rounds needed.

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 path-scoped staging | pass | `tools.md` commit-code, `gates.md` staging, `commit_g2_code.cjs` (`git add --`), `refresh` N/A; contract test asserts no broad form in any recipe block |
| AC2 no destructive verbs | pass | Canonical forbidden list in `git-ownership.md`; scripts scan clean; stash-all gate removed from `setup.md` |
| AC3 baseline advancement | pass | `refresh_baseline.cjs` + PROTOCOLS.md subsection; temp-repo test proves forward refresh + foreign STOP |
| AC4 dirty-tree tolerance | pass | `setup.md` gate rewrite + §4 of contract; test proves foreign bytes identical |
| AC5 baseline record | pass | Schema fields + `baselineSourceRef`; idempotency proven by test rerun |
| AC6 shared protocol + refs | pass | 8 referencing docs asserted by test (orch, lite, multi, fix-pr, gates, setup, protocols, tools) |
| AC7 regression test | pass | `test/test-git-ownership-contract.js` green, registered in `test-suites.json` |
| AC8 gates green | pass | scan clean, state-contract suite green; full `npm run test` + harness gates at Step 7/8 |

Negative scenarios (all 8): each maps to a failing assertion in the committed
test (broad staging, destructive verb, reset-to-baseline is absent by
construction — helper has no reset path, dirty-tree refusal removed, baseline
not recorded, orchestrator without reference, no test, red gates). No
`knownDefect`, no `missingEvidence`.

G2-code ready: 14 product paths (12 skill/test files + version/integrity
generated files once produced). `{plansDir}` excluded.
