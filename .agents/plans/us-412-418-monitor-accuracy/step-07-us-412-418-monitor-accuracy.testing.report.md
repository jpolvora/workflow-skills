# Testing report — us-412-418-monitor-accuracy (step-07)

- New: `node test/test-ws-monitor-us412-418.js` → ok (10 blocks: shapes A/B/C,
  AC4, AC1 units, AC5 live control + fallback, AC7 predicate + resolve, AC6
  stubbed-clock time pressure, AC8 issue-shape stall, AC10 read-only).
- Full: `npm run tests` → all 131 entries passed, hub config byte-identity ok.
- Harness: `node test/test-harness-clean.js` → 0 findings (Harness OK).
- Integrity: `npm run generate-integrity` + `npm run verify-integrity` → match
  (v0.4.71, single patch bump over merge-base 0.4.70).
- Red proof (pre-fix, throwaway script): shapes A/B/C yielded 9/7/9 criticals;
  post-fix 0/0/0 with the live control at 6 criticals.
- Mutation testing: skipped per config (`skipMutationTesting: true`).
- No browser surface; `skipTests` false.
