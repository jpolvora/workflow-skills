# Kanvas Board (`specs`)

> Provenance: `.agents/skills/ws-kanvas/SKILL.md`, `.agents/skills/ws-kanvas/scripts/collect.cjs`, `.agents/skills/ws-kanvas/scripts/server.cjs`, spec `0130-kanvas-board`, spec `0131-kanvas-board-drag-drop` (specified, not yet shipped).

## Feature

`ws-kanvas` is a packaged, read-only kanban over every spec of record and its workflow state. This repository starts it with `npm run kanvas`. Consumers start the same server with `node {skillsRoot}/ws-kanvas/scripts/server.cjs` and `--specs-dir` / `--plans-dir` from their hub. The board never writes specs, plans, or `index.PRD`.

## How it works

Six columns fill by first match, top to bottom. Abandoned is a cancelled or failed plan state, or an Archive row with a dropped or superseded outcome. Production is an index row marked `[x]` with E1 delivery evidence in the Done log. Staging is a `step-08-*.result.md` ship record whose index row is still open. Development is a plan `*.state.md` with `status: active` or `implemented`. Sprint is a tracked `[ ]` row that already has a `{plansDir}/{slug}/` directory. Backlog is every other spec of record.

A card click opens a popup with title, column, index status, phase, acceptance-criteria count, plan step and status, PR or commit evidence, and repo-relative links. An unknown slug shows a typed not-found state. Missing specs, plans, or `index.PRD` yield an empty board and a named warning.

Phase 2 (spec 0131) adds draggable cards, a keyboard Move path in the card popup, and `POST /api/move` with a documented transition table over index track/sync, plan status, and archive writes. v1 `GET` routes are unchanged; only `POST /api/move` mutates consumer index/state files (never git commits).

## Backend

The server binds loopback only and serves `GET` routes from the Node 22 standard library. `collect.cjs` emits a stable JSON card (`slug`, `title`, `column`, `indexStatus`, `phase`, `acCount`, `planStep`, `planStatus`, `evidence`, `links`). The skill is listed in `bin/skill-dependencies.json` and covered by skill integrity hashes so install delivers it with the rest of the package.

## Frontend

`refs/board.html` is one self-contained page. It renders the six columns and the details popup and consumes only the collector JSON. Each column carries a distinct phase accent (a `--phase-accent` custom property keyed off `data-column-id`) used for its border, header underline, card tint, and drop-target outline; the phase label text remains the primary differentiator. Column, card, drop-target, popup, and backdrop surfaces derive from system colors (`Canvas`/`CanvasText`/`Highlight`) with `color-mix()` tints and plain system-color fallbacks, so they stay legible under the declared `color-scheme: light dark`.
