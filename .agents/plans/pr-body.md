## Summary

Release **0.3.36** from `develop` → `main`.

- ADO `comment_issue.py` accepts optional `--org` / `--project` / `--api-base` / `--pat-env` (config remains the default). Close-loop matches work-item fetch CLI.
- Package stamp 0.3.36.

## Test plan

- [x] `node test/test-provider-parity.js` (org/project dry-run spawn)
- [x] `node test/test-hermes-spec-to-pr-enhancements.js`
- [x] `npm run test` (exit 0)
- [x] `npm run verify-integrity` (v0.3.36)
- [x] Leak scan: no HIGH findings
- [ ] CI on this PR
- [ ] `ws-goal-fix-pr` until review threads are 0
