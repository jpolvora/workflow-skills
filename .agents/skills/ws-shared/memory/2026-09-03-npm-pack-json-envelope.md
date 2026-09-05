### [2026-09-03] npm pack --json envelope shape varies by npm major
- **Layer**: tests
- **Module**: test-package-runtime-exclusions
- **Severity**: Medium
- **PathPattern**: `test/test-package-runtime-exclusions.js`
- **Scenario / Context**: `test-package-runtime-exclusions.js` parsed `npm pack --dry-run --json` output as a legacy array envelope (`parsed[0].files`); under npm 12 the same command prints an object envelope keyed by package name, crashing before any file-list assertion and failing the full `npm run test` alias
- **DO NOT**: Assume `npm pack --json` always returns an array envelope, or index `[0]` without checking the parsed shape
- **INSTEAD DO**: Normalize the envelope first (array item or first object value, e.g. `envelope[Object.keys(envelope)[0]]`) so the test passes on both legacy-array and object-envelope npm majors
