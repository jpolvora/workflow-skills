### [2026-09-03] Installer secondary-target lifecycle must be symmetric across install/update/uninstall
- **Layer**: harness
- **Module**: bin/cli.js
- **Severity**: Medium
- **PathPattern**: `bin/cli.js`, `test/test-install.js`
- **Scenario / Context**: Multi-host `--targets` flows added per-command (install persists, update syncs, uninstall removes) left asymmetric gaps found by PR review: install ignored manifest targets on repeat runs, `--targets` without `--global` was silently dropped, update never persisted explicit targets, uninstall never cleaned secondary projections
- **DO NOT**: Add a scope-gated CLI flag that silently no-ops outside its scope, or resolve secondary targets in one command without persisting/reusing/cleaning them the way sibling commands do
- **INSTEAD DO**: Fail closed on scope mismatch (`--targets` without `--global` errors); persist explicit targets to `installed-skills.json` on every mutating command; reuse recorded targets when flags are omitted; remove secondary projections on uninstall; cover incremental-reuse and uninstall-cleanup in Phase 12 tests
