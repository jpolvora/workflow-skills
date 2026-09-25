# Plan — kanvas-board (ws-kanvas packaged local kanban visualizer)

Slug: `kanvas-board` | Spec: `.agents/specs/0130-kanvas-board.spec.md` | Pipeline: standard | Date: 2026-09-25

## 1. Goal
Ship `ws-kanvas` as a first-class packaged skill (SKILL.md + `scripts/collect.cjs` + `scripts/server.cjs` +
`refs/board.html`), registered in `bin/skill-dependencies.json`, hashed by integrity, covered by
`test/test-kanvas-board.js`, with `npm run kanvas` dogfood entry, CATALOG row, rebuilt site, and installer
coverage — all six columns with first-match rules and a card-click details popup.

## 2. Stack & Security Invariants Verification Plan
- Node 22 stdlib only (`node:http`, `node:fs`, `node:path`, `node:os`); zero new `package.json` dependencies.
- Scripts are CommonJS `.cjs` (repo `"type": "module"`); no Python; en-us prose; no host product names.
- Slug validation `^[a-z0-9]+(-[a-z0-9]+)*$` + directory-containment checks before any `fs` read (AC negative).
- Server binds `127.0.0.1` only (port `4173`, `KANVAS_PORT` override); GET-only routes; non-GET → 405.
- Unknown/malformed slug → typed `not-found` JSON (no stack trace, no absolute path leak).
- Missing/unreadable inputs → empty board + named warning banner, never a crash.
- Run `scan_stack_invariants.cjs --stack typescript-node` if present, else reviewer pass on server diff.

## 3. Design
- `collect.cjs` exports `collectBoard({specsDir, plansDir, indexPath})` → `{ generatedAt, specsDir, plansDir,
  warnings[], columns[{id,title,count}], cards[{slug,title,column,indexStatus,phase,acCount,planStep,
  planStatus,evidence,links}] }` plus `--json` CLI for the server and tests. Pure function over disk reads.
- Column rules (first match): Abandoned (state `cancelled`/`failed` or index Archive dropped/superseded) →
  Production (index `[x]` + Done-log delivery evidence) → Staging (`step-08-*.result.md` present, not `[x]`) →
  Development (`*.state.md` `status: active|implemented`) → Sprint (index `[ ]` + run dir exists) → Backlog.
- `server.cjs` args: `--specs-dir`, `--plans-dir`, `--index`, `--port`, `--config` (reads `.ws/config.json`
  `plans.specsDir`/`plans.dir` relative to consumer root); defaults resolve from cwd `.agents/specs|plans`.
  Endpoints: `GET /` (board.html), `GET /api/board`, `GET /api/card?slug=`. Recompute per request, no cache.
- `board.html`: self-contained (inline CSS/JS, `fetch`), six columns, card-click popup, refresh button, warning
  banner slot; consumes only the AC7 shape.
- Consumers launch `node {skillsRoot}/ws-kanvas/scripts/server.cjs --specs-dir X --plans-dir Y`; dogfood
  `npm run kanvas` = `node .agents/skills/ws-kanvas/scripts/server.cjs`.

## 4. Ship-scope files (only these)
1. NEW `.agents/skills/ws-kanvas/SKILL.md`
2. NEW `.agents/skills/ws-kanvas/scripts/collect.cjs`
3. NEW `.agents/skills/ws-kanvas/scripts/server.cjs`
4. NEW `.agents/skills/ws-kanvas/refs/board.html`
5. NEW `test/test-kanvas-board.js` (+ `test/test-suites.json` entry)
6. EDIT `package.json` (`kanvas` script)
7. EDIT `bin/skill-dependencies.json` (`"ws-kanvas": []` + workflows package list)
8. EDIT `CATALOG.md` (Layer 5 row + task-router entry; scope count 47→48)
9. REGEN integrity data (`npm run generate-integrity`) + `docs/index.html` (`node bin/build-site.js`)
10. EDIT `FEATURES.md` only if it enumerates skills (check at implementation)
11. Worker artifacts under `.agents/plans/kanvas-board/` (never committed until Step 8 close scope)

## 5. Tests (map to ACs)
- `test/test-kanvas-board.js`: six fixture columns (one fixture per rule, AC2/AC3), popup payload shape (AC4),
  unknown slug typed not-found (AC5), loopback-only + GET-only + zero-deps assertions (AC6), AC7 snapshot,
  missing-inputs warning banner (AC8), installed-tree launch + custom dirs fixture (AC10/AC11), pack allowlist
  check (AC9/AC10 via `npm pack --dry-run` file list assertion on `.agents/skills/ws-kanvas/`).
- Existing suite stays green: `npm run tests`, `npm run verify-integrity`, `node bin/build-site.js --check`,
  `ws-check-harness` equivalent (`node test/test-harness-clean.js` if present).

## 6. Risks
- `test-doc-sync.js` requires CATALOG row per skill dir and `build-site --check` clean → rebuild site in same
  change. `pre-ship-doc-sync` parallel session owns its own files; do not touch or depend on them.
- Coverage thresholds (`npm run coverage` lines 80/branches 68 over skills scripts) — keep scripts small and
  branch-light; new test exercises most branches.
- `FEATURES.md` may enumerate skill counts — check and sync if needed.

## 7. Steps
1. Write SKILL.md + collect.cjs + server.cjs + board.html.
2. Wire package.json, skill-dependencies, CATALOG, FEATURES (if needed).
3. Write test-kanvas-board.js + suites entry; run it; run full `npm run tests`.
4. Regen integrity + verify; rebuild site + `--check`; pack dry-run check.
5. Verify (self-score vs ACs) → product commit → review → testing → close → PR → goal-fix-pr → merge →
   `ws-spec-index sync kanvas-board`.
