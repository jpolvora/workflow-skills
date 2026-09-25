# Verify — kanvas-board (Step 5, self-score)

Date: 2026-09-25 | Config `defaults.minVerifyScore`: 9 | Verdict: **10/10 — ADVANCE**

## AC-by-AC evidence

- AC1 (server + six columns): PASS — live probe `GET /api/board` on loopback returns all six columns
  (backlog 1, sprint 1, development 0, staging 3, production 130, abandoned 1; 136 cards) and `GET /`
  serves the board page. `test-kanvas-board.js` asserts page + board over fixtures.
- AC2 (Backlog rule): PASS — fixture `backlog-only` (no run dir, untracked) lands in Backlog; live repo
  shows `pre-ship-doc-sync` (todo, no run dir) in Backlog.
- AC3 (five first-match rules): PASS — one fixture per rule (cancelled→Abandoned, done+Done-log→Production,
  step-08 without done→Staging, active→Development, todo+run-dir→Sprint), all asserted.
- AC4 (popup payload): PASS — `/api/card?slug=` returns title, column, index status, phase, AC count,
  plan step/status, evidence, repo-relative links; popup close is client-side (no reload). Asserted live
  and in test.
- AC5 (typed not-found): PASS — unknown slug → `{error:{code:'not-found'}}` (404; 400 for invalid slugs),
  asserted no path leak and no stack trace in the payload.
- AC6 (loopback, GET-only, zero deps): PASS — `server.address().address === '127.0.0.1'`, POST/DELETE → 405,
  `package.json` has no `dependencies` key. All asserted in test.
- AC7 (stable JSON + snapshot): PASS — exact-shape snapshot over six fixture cards in
  `test/test-kanvas-board.js`; page consumes only that shape.
- AC8 (missing inputs): PASS — absent specs/plans/index → empty board + named warnings
  (`specs-dir-missing`, `plans-dir-missing`, `index-missing`); asserted, never throws.
- AC9 (packaging + integrity): PASS — `ws-kanvas` in `bin/skill-dependencies.json` (dependencies +
  workflows package), `npm run generate-integrity` + `--check` pass (57 skills, v0.4.73), pack dry-run
  lists all four skill files. Asserted in test.
- AC10 (installer flow): PASS — pack allowlist asserted per file; collector/server take directory
  parameters so the installed tree serves with no repo-root assumption (installed-tree launch covered by
  parameter-equivalence plus AC11 fixture test).
- AC11 (no hardcoded paths): PASS — `--specs-dir/--plans-dir/--index/--config` resolution tested against
  a fixture consumer tree with non-default directories via hub-config resolution.

## Negative scenarios (all red→green in test)

- Plan-less spec outside Backlog; cancelled state outside Abandoned; `slug=../../package` read attempt
  (400 pre-fs); unknown slug 500/stack (typed not-found); POST 2xx (405); new runtime dependency
  (none); non-loopback bind (127.0.0.1 asserted); missing graph entry/integrity fail (both pass);
  custom-dirs empty render (renders 1 card); pack omission (all four files listed).

## Stack invariants

- Node 22 stdlib only; CommonJS `.cjs`; no Python; en-us; no host names. Slug regex + `resolveInside`
  containment before every read. Sockets close in tests (`server.close`); startup path has no floating
  promises (`start().catch` sets exit code).

## Score: 10/10 — advance to product commit (Step 5 → G2) then review.

Uncovered negative scenarios: 0. No invariant violations.
