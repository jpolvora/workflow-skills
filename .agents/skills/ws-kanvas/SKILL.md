---
name: ws-kanvas
version: 0.4.75
description: Packaged local kanban visualizer for spec and workflow state (Backlog, Sprint, Development, Staging, Production, Abandoned).
disable-model-invocation: true
invocation_names:
  - kanvas
  - ws-kanvas
---

# ws-kanvas

> When this skill is loaded, output "ws-kanvas loaded."

Local, read-only kanban board over the specs of record (`{specsDir}`) and their workflow state
(`{plansDir}` + `index.PRD`). One card per spec; click a card for a details popup. The board never
mutates specs, plans, or the index — it is a read lens over the same sources `ws-spec-list` reads.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

## Launch

Dogfood in this repo:

```bash
npm run kanvas                 # serves the board from the packaged skill tree
KANVAS_PORT=4173 npm run kanvas
```

From any installed tree (project-local or global), with consumer overrides:

```bash
node {skillsRoot}/ws-kanvas/scripts/server.cjs --specs-dir {specsDir} --plans-dir {plansDir}
node {skillsRoot}/ws-kanvas/scripts/server.cjs --config {sharedDir}/config.json
node {skillsRoot}/ws-kanvas/scripts/server.cjs --port 4173
```

| Flag / env | Effect |
|------------|--------|
| `--specs-dir DIR` | Specs root (default: `<cwd>/.agents/specs`) |
| `--plans-dir DIR` | Plans root (default: `<cwd>/.agents/plans`) |
| `--index FILE` | `index.PRD` path (default: `<specsDir>/index.PRD`) |
| `--config FILE` | Consumer hub config; `plans.specsDir` / `plans.dir` resolve relative to the consumer root unless absolute; the root is the config directory minus one hub segment (resolver-sourced name or any dot-directory), never the bare cwd |
| `--port N` / `KANVAS_PORT` | Bind port (default `4173`) |

Explicit flags win over `--config`, which wins over the `<cwd>` defaults. No hardcoded
`.agents/specs` / `.agents/plans` assumptions: every path is a resolved parameter.

## Endpoints (GET only; anything else → 405)

| Endpoint | Response |
|----------|----------|
| `GET /` | Self-contained board page (`refs/board.html`) |
| `GET /api/board` | Board JSON: `{ generatedAt, specsDir, plansDir, warnings[], columns[], cards[] }` |
| `GET /api/card?slug={slug}` | One card in the AC7 shape, or typed `not-found` JSON for unknown slugs |

The server binds `127.0.0.1` only, recomputes per request (no cache, no watcher; use the Refresh
button), and prints the bound URL on start. Missing or unreadable inputs yield an empty board with a
named warning banner, never a crash. Slugs over HTTP must match `^[a-z0-9]+(-[a-z0-9]+)*$` and stay
inside the resolved roots (anything else → 400 before any filesystem read).

## Column rules (first match wins, top-down)

1. **Abandoned** — plan state `status: cancelled`/`failed`, or the slug sits in the index Archive table
   with a `cancelled`/`failed` outcome (`dropped`/`superseded` read the same).
2. **Production** — index Feature map / Next-specs row is `[x]` done AND a Done-log row exists
   for the slug (the delivery record; any era outcome cell, including legacy `Implemented`).
3. **Staging** — a `step-08-*.result.md` ship record exists but the index row is not yet `[x]`.
4. **Development** — a plan `*.state.md` exists with `status: active` (or `implemented`).
5. **Sprint** — tracked in `index.PRD` as `[ ]` todo AND a `{plansDir}/{slug}/` run directory exists.
6. **Backlog** — everything else (spec of record, no run directory, no done mark).

## Card shape (AC7 — the only contract the page consumes)

`slug`, `title`, `column`, `indexStatus` (`done` | `todo` | `untracked`), `phase`,
`acCount`, `planStep`, `planStatus`, `evidence` (PR URL / commit sha when present), `links`
(repo-relative spec file, plan directory, index row anchor).

## Files

| File | Role |
|------|------|
| `scripts/collect.cjs` | Board JSON builder (`collectBoard({specsDir, plansDir, indexPath})` + `--json` CLI) |
| `scripts/server.cjs` | `node:http` loopback server for the page + JSON endpoints (Node 22 stdlib only) |
| `refs/board.html` | Self-contained page (inline CSS/JS, `fetch`); no build step, no dependencies |

## Rules

- en-us; harness-neutral; path tokens and flags only — never hardcode consumer directories.
- Read-only: no `POST`/`PUT`/`DELETE` routes, no file writes, no watcher side effects.
- Stdlib only: zero new `package.json` dependencies.
