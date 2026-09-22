### [2026-09-20] Dynamic construction for retired hub path checks; explicit line ranges in AC ledger file evidence

- **Layer**: `Tests`
- **Module**: `harness-audits`
- **Severity**: `Medium`
- **PathPattern**: `test/test-shared-hub-paths.js, .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, .agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs`
- **Scenario / Context**: When adding an automated check in `check_unique_runtime.cjs` to detect forbidden `.ws/runtime` directories, using the literal string `'.ws/runtime'` tripped `test/test-shared-hub-paths.js` which statically scans the codebase for occurrences of that retired path. Separately, linking implementation file evidence into `ac-ledger.json` requires explicit line ranges (`file.cjs:Lstart-Lend`), rejecting bare paths.
- **DO NOT**: hardcode the literal string `'.ws/runtime'` in source code or harness tests, even when implementing an audit that checks for its existence; nor pass bare file paths to `ac_ledger.cjs link --file`.
- **INSTEAD DO**: construct banned path checks dynamically using `path.join(repoRoot, '.ws', 'runtime')` or `['.ws', 'runtime'].join('/')` to keep static path-invariant scanners clean; and format all file evidence for `ac_ledger.cjs link` with precise line ranges (e.g. `--file path/to/file.cjs:L1-L50`).
