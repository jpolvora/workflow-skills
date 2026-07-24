# Implementation Plan — [bug] cli: update fails post-verification when consumer workspace has repo-local custom skills

**US:** 113  
**Slug:** us-113  
**Date:** 2026-07-23  

## 1. Overview & Context

When running `workflow-skills update` (or `update --include-new`) in a consumer workspace with repo-local custom skills (skills present under `.agents/skills/` that are tracked in `installed-skills.json` but not part of the upstream `workflow-skills` package), the CLI copies skills and updates the manifest, but then fails during post-verification with exit code 1 (`Integrity: consumer tree mismatch after copy`).

### Root Cause
In `bin/cli.js` (`runUpdate`):
1. `runUpdate` identifies custom consumer skills not present upstream: `staleLocal = tracked.filter((name) => !upstreamSet.has(name))`.
2. After copying skills and updating manifest, `afterManifest = readInstalledSkillsManifest()` is loaded.
3. `verifyIds` is evaluated as `afterManifest.skills.filter((n) => fs.existsSync(path.join(targetSkillsDir, n)))`.
4. Since `staleLocal` skills exist on disk, `verifyIds` includes `staleLocal`.
5. `postVerifyAndWriteLocal(verifyIds, ...)` runs `verifyClosure(verifyIds, ...)` against `upstreamIntegrityManifest` (`bin/skill-integrity.json`).
6. Custom skills do not exist in `upstreamIntegrityManifest`, triggering `missing-from-manifest` error in post-verification.

## 2. Target File Changes

### `bin/cli.js`
In `runUpdate()`:
Filter `afterManifest.skills` so that `verifyIds` only includes skills in `upstreamSet`:
```javascript
const afterManifest = readInstalledSkillsManifest();
const verifyIds = afterManifest
  ? afterManifest.skills.filter((n) => upstreamSet.has(n) && fs.existsSync(path.join(targetSkillsDir, n)))
  : skillsToCopy.filter((n) => fs.existsSync(path.join(targetSkillsDir, n)));
```

### `test/test-install.js`
In Phase 2 or Phase 10/11 of `test-install.js`:
Add an automated test case verifying that running `runUpdate` on a consumer workspace containing a tracked custom repo-local skill does not fail post-verification and leaves the custom skill intact.

## 3. DAG Tasks / Task Breakdown

1. `task-1`: Edit `bin/cli.js` to filter `staleLocal` skills out of `verifyIds` in `runUpdate()`.
2. `task-2`: Add test assertion in `test/test-install.js` for `runUpdate()` with custom repo-local skills.
3. `task-3`: Run `npm run tests -- --local` and `npm run verify-integrity` to confirm zero regressions.

## 4. Verification Plan

- `npm run tests -- --local`
- `npm run verify-integrity`
