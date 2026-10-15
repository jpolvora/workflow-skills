## Summary

Fixes #508. Finishes the residual `ws-check-workflows` repo-root resolution defect that survived the #504 fix (`c9b47ecf`) and makes the shared-vs-bin dependency parity check report itself instead of silently disappearing.

- **Resolver**: replaces `findRepoRoot` with `resolveRepoRootInfo({ root, source })` with provenance `explicit-flag` → `consumer-checkout` → `install-root` → `cwd-fallback`. A consumer checkout at the working directory (markers `.git`, `.ws/config.json`, `package.json`, cwd only) wins; otherwise the global **install root** (`<home>/.agents` for `<home>/.agents/skills/ws-*`) is used. The install **parent** is never returned.
- **Parity reporting**: the shared-vs-bin check reports `checked` when both manifests exist, `skipped` (naming the missing manifest) otherwise, and a **CRITICAL** when the resolved root is a real package root carrying `bin/` yet a manifest is missing — no more silent skip.
- **Diagnostics**: `--json` gains `resolvedRoot`, `resolutionSource`, and `checks` (keeping `{status, issues, simulations}`); the Markdown report gains a "Resolved Root & Repo-level Checks" section. `--report` is written inside the resolved root. A `cwd-fallback` resolution emits a WARNING.
- **Tests**: `test/test-check-workflows-global-root.js` is extended with the `<home>/.agents/skills` shape (no `.git`), consumer-checkout and install-root fixtures, the skip record, `--report` scope, and the degraded-resolution WARNING (AC1–AC13, NS1–NS10); the #504 anchors are regression-locked.

## Version

0.5.42 → 0.5.43 (integrity regenerated).

## Verification

- `node test/test-check-workflows-global-root.js` — PASS
- `npm run test` — 164/164
- `node test/test-harness-clean.js` — 0 findings
- Fresh-verify fault injection against the pre-fix resolver — RED PROVEN

### Foreign commits in range

Commits reachable from `94ab0ec` but not produced by this batch (`7cf823b..94ab0ec`):

- none detected
Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #515.
