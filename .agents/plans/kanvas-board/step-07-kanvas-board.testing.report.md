# Testing — kanvas-board (Step 7)

Date: 2026-09-25. `defaults.skipTesting: false`. No browser phase (local server verified via HTTP).

## Results on the committed tree

- `node test/test-kanvas-board.js`: ok (7 fixture cards, AC7 snapshot, HTTP behavior, AC11 incl. BOM).
- `npm run tests` (full local + harness-efficiency): exit 0, 134/134 with final product files.
- `node test/test-doc-sync.js`: ok (CATALOG row, `build-site --check` current).
- `npm run verify-integrity`: OK (57 skills, v0.4.73).
- `node test/test-harness-clean.js`: 0 findings.
- Live `npm run kanvas` code path probed on loopback: six columns, 136 cards, card payload ok.
- Installed-tree proof: packed 0.4.73 tarball contains all four skill files; real CLI install into a
  temp consumer lands `ws-kanvas`; server started from the installed tree serves the board from
  config-resolved custom dirs (1 card, correct column).

## Notes

- Standalone `node test/test-install.js --local` without a prior `npm pack` fails on its own
  (it rewrites `test/package.json` at the stale-tarball fallback and exercises PATH-sensitive hook
  stages); the sanctioned `npm run tests` path (pretests pack first) is green. The stray
  `test/package.json` rewrite was reverted; no repo change resulted.
- BOM hardening (server config reader, spec frontmatter) was found through the installed-tree proof
  and is covered by committed regression asserts; review-fix commit `df808b53`.
- A stale, gitignored `workflow-skills-0.4.65.tgz` predates this run; left untouched. Fresh
  `workflow-skills-0.4.73.tgz` (gitignored) left in place so tarball resolution prefers the exact version.

## Verdict

PASS — proceed to Step 8 close + ship.
