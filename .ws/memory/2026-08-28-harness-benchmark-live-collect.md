### [2026-08-28] Live harness-benchmark collect must use a prepare baseline, not git diff HEAD

- **Layer**: Tests
- **Module**: harness-benchmark / collect / sensor / compare
- **Severity**: High
- **PathPattern**: scripts/harness-benchmark/**;benchmarks/fixtures/**;test/test-harness-benchmark.js
- **Scenario / Context**: Review threads on PR 256 showed live collect scoring completeness 0 after a normal orch (new files untracked or already committed), discrimination PASS without running real tests (scratch missing testFile; applyPatch appended +lines), inverted fx-incomplete failIf, and snapshot tests rewriting tracked baselines.
- **DO NOT**: Use `git diff HEAD` for completeness or judge fraud; copy only sensorPaths into scratch; append patch +lines at EOF; fail incomplete fixtures when completeness is below a min; snapshot named baselines into the tracked repo on every `npm test`.
- **INSTEAD DO**: Seed git in prepare and diff from `.benchmark-baseline-sha` plus untracked names; copy testFile/expectedOutputPaths; apply unified hunks in place; failIf with expectCompletenessMax; snapshot into a temp `--repo-root`; reject compare across fixture/mode.
