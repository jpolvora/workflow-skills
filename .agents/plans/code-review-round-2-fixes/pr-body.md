# Harness Hardening Round 2 — Open Findings from the 20-Commit Read-Only Review

Implements spec `.agents/specs/0109-code-review-round-2-fixes.spec.md` (AC1–AC15, findings F01–F27).

## What changed

- State/gate correctness: observer writes go through the canonical writer (revision bump, plans-index refresh, baton-lock serialization); coordinator gate resolves cancel/unmatched input to `EXIT_BLOCKED`; spec-memo spawn passes spaced win32 paths intact and surfaces child stderr; ship verify fails closed when base detection fails.
- Consumer/global installs: skills-root resolution from consumer context in harness checks; `os.homedir()` home expansion with fail-closed; Azure `apiBase` threading with override; GitHub/ADO PR-row parity; `--specs-dir` honored.
- GUI/schema/hub sync: owner binding, boolean-`false` persistence, packaged `ws-senior-developer` default, remaining schema bindings with parity tests; hub docs reference only the skills-install runtime.
- Tests: hermetic provider-parity/bootstrap/observer/global-config suites wired into `npm test`; unique-runtime scan covers `scripts/`; Node-only benchmark paths.
- Installer/Windows/tooling: hub-content quarantine, scope-correct global pointers, unknown-flag rejection; drain-safe exits, win32-only case-fold, cross-drive `user` classification; secrets-scanner `+++` filter + `rg` failure surfacing; build-site bump, parameterized wiki branches, codepoint integrity ordering, gitignore report match, CI `develop` trigger.

## Verification

- Ledger `pre-step6` 10/10, verify 9/10 at gate, review APPROVE 10/10, fable-judge VERIFIED (0 frauds).
- `npm run test` green, `test-harness-clean.js` 0 findings, integrity regenerated.
- Preview dry-run exit 0 (1 warning-level thread, non-blocking).

## Commits

- `ae3806d6` feat(code-review-round-2-fixes): verified implementation
- `b6ca3eba` feat(code-review-round-2-fixes): verified implementation (refine round-1 leftovers)
- `f78199d8` docs(code-review-round-2-fixes): configured delivery artifacts
