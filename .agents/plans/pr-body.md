## Summary

Release **0.3.35** from `develop` → `main`.

- `validate_spec.cjs` `--help`/`-h` prints usage and exits 0 (was treated as a spec path → ENOENT on `cwd/--help`).
- Unknown dash flags now fail with `unknown argument` instead of opening a file.
- Package stamp 0.3.35 (site footer + skill frontmatter + integrity).

## Test plan

- [x] `node test/test-spec-lint.js` (includes `--help` / `--nope` assertions)
- [x] `npm run test` (exit 0)
- [x] `npm run verify-integrity` (v0.3.35)
- [x] Leak scan: no HIGH findings
- [ ] CI on this PR
- [ ] `ws-goal-fix-pr` until review threads are 0
