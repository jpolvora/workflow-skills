### [2026-09-15] Dangling symlink/junction handling in installer

- **Layer:** infrastructure
- **Module:** installer (bin/install-rules.js)
- **Severity:** Medium
- **PathPattern:** bin/install-rules.js
- **Scenario / Context:** Secondary-target projection creates junctions/symlinks. When a link target is deleted (e.g. test temp dir removed), `fs.existsSync` returns false while the reparse point still occupies the path. Code gating removal on `existsSync` then fails: `symlinkSync` throws EEXIST and the copy-fallback `mkdir` throws ENOENT.
- **DO NOT:** Use `fs.existsSync` alone to decide whether a projection destination must be removed before `symlinkSync`/`mkdirSync`.
- **INSTEAD DO:** Check lexical existence via `fs.lstatSync` (`pathLexists`) and remove stale reparse points first; add a regression test that creates a dangling link and proves reinstall/update heals it.
