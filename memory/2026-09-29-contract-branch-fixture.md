### [2026-09-29] Contract branch needs a fixture
- **Layer**: Quality
- **Module**: tests
- **Severity**: Medium
- **PathPattern**: test/test-*.js
- **Scenario / Context**: A helper rejects a distinct input class (non-semver string, symlink) and review scored the missing fixture 6.
- **DO NOT**: Treat a nearby failure test (invalid JSON, missing file) as coverage for a different branch.
- **INSTEAD DO**: Add one fixture that hits that branch and asserts the documented error and exit code.
