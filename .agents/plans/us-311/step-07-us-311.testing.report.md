---
slug: us-311
title: Testing report — Stamp finished step artifacts with the step result
status: completed
step: 7
workflowId: us-311-20260911T034559Z
startedAt: "2026-09-11T03:45:59.000Z"
endedAt: "2026-09-11T04:04:33.822Z"
acRefs: []
---
## Testing report

- Base build: N/A (no build alias; Node script package).
- Unit/suite: `npm run test` — exit 0 (fresh Step 7 run, 159s), incl. `test-artifact-stamp-status: T1-T8 passed` as final battery.
- DB seeds: N/A. API/integration: suite-embedded batteries (install, migration, workflows simulation) all green. UI/E2E browser: skipped (no UI surface).
- Mutation: SKIPPED — `verification.mutationTest` empty and `defaults.skipMutationTesting: true`.
- Sabotage: PASSED.
  - Step 4 script run: `run_sabotage.py --test "npm run test"` on uncommitted fix → `test-failed-as-expected` (115s full-chain run, bit at T1–T8), `restored: true`.
  - Step 7 script re-run tripped the install integrity gate first (3.2s, vacuous pass — inverted runtime vs committed 0.4.15 digests), so evidence was re-proven manually: reverse-patch applied to the 3 fix files → `node test/test-artifact-stamp-status.js` fails exactly at `T1: completed finish stamps completed` (exit 1) → `git checkout` restore → T1–T8 green.
  - TDD red baseline (pre-fix tree) also observed at Step 4: T1 red with `'active'` stamped.
- AC checklist: AC1–AC7 each mapped to observed T1–T8 outcomes; NS1–NS5 red-before/green-after evidenced.
- Side effects cleaned: `benchmarks/results/*` restored, `workflow-skills-*.tgz` removed.

Status: passed. No failures, no flakes observed across 4 full-suite runs this workflow.
