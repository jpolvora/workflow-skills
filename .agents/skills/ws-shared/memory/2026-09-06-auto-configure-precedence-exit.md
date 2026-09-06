### [2026-09-06] Auto-configure detection precedence and fail-closed exit

- **Layer**: harness
- **Module**: ws-configure-project / auto_configure.cjs
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/auto_configure.cjs`, `test/test-configure-auto.js`
- **Scenario / Context:** Review threads on PR #281 showed `--auto` emitting a Node-labelled stack with dotnet verification aliases in polyglot repos, and exiting 0 while required gaps remained.
- **DO NOT:** Let later stack-detection blocks unconditionally overwrite `verification.*` aliases set by higher-precedence stacks, or exit 0 when `requiredGaps` is non-empty.
- **INSTEAD DO:** Guard every stack's verification writes with `getByPath(wanted, ...) === undefined` (dotnet/go/rust, matching the python branch); `process.exit(1)` when `!ok`; cover with polyglot and gaps-remain fixtures.
