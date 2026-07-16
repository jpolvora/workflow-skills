### [2026-07-16] Ship verify bumps package version
- **Layer**: CLI / docs
- **Module**: 11-ship-pr verification (`node bin/build-site.js`)
- **Severity**: Medium
- **Trap Avoided**: Running `backendBuild` (`bin/build-site.js`) during ship Phase 2 auto-increments `package.json` version and rewrites footer in `docs/index.html`, leaving a dirty tree after "already committed" delivery. `test/package.json` pack path also drifts to the new tarball name after `npm run tests -- --local`.
- **Solution**: After ship verification, commit version bump + docs footer (+ sync `test/package.json` `file:../workflow-skills-X.Y.Z.tgz`) before `git push`; do not treat those dirties as unexpected blockers or leave them uncommitted on the PR head.
