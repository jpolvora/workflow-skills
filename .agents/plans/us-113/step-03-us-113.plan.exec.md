# Execution Plan — US-113

**Exec Mode:** sequential

## Tasks

### Task 1: Fix `verifyIds` in `bin/cli.js` `runUpdate()`
- Filter `afterManifest.skills` by `upstreamSet.has(n)` so custom repo-local skills not in the upstream package are not evaluated against `upstreamIntegrityManifest`.

### Task 2: Add test assertion in `test/test-install.js`
- Create a test case where a consumer workspace has a custom skill in `installed-skills.json` and verify `runUpdate()` exits 0 cleanly.
