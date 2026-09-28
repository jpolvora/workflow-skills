---
name: ws-kanvas
description: Packaged local kanban visualizer for spec and workflow state (Backlog, Sprint, Development, Staging, Production, Abandoned).
disable-model-invocation: true
invocation_names:
  - kanvas
  - ws-kanvas
---
# ws-kanvas

> When this skill is loaded, output "ws-kanvas loaded."

Local kanban board over the specs of record (`{specsDir}`) and their workflow state
(`{plansDir}` + `index.PRD`). One card per spec; click a card for a details popup, drag cards
between columns, or use the keyboard Move action in the popup. Moves persist through `POST /api/move`
(index track/sync, plan status, archive rows); the board never creates run directories or ship records.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

## Launch

Dogfood in this repo:

```bash
npm run kanvas
KANVAS_PORT=4173 npm run kanvas
```

From any installed tree:

```bash
node {skillsRoot}/ws-kanvas/scripts/server.cjs --specs-dir {specsDir} --plans-dir {plansDir}
node {skillsRoot}/ws-kanvas/scripts/server.cjs --config {sharedDir}/config.json
```

The server binds `127.0.0.1` only (default port `4173`, `KANVAS_PORT` override), recomputes per request, and logs one JSON line per successful move.

## Column rules (first match wins, top-down)

1. **Abandoned** — cancelled/failed plan status or Archive outcome row.
2. **Production** — index `[x]` done **and** a Done-log row for the slug.
3. **Staging** — `step-08-*.result.md` exists without index `[x]`.
4. **Development** — plan state `active` / `implemented`.
5. **Sprint** — index `[ ]` todo **and** a run directory exists.
6. **Backlog** — everything else.

## Endpoints

| Endpoint | Response |
|----------|----------|
| `GET /` | Self-contained board page (`refs/board.html`) |
| `GET /api/board` | Board JSON: `{ generatedAt, specsDir, plansDir, warnings[], columns[], cards[] }` |
| `GET /api/card?slug={slug}` | One card in the AC7 shape, or typed `not-found` JSON for unknown slugs |
| `POST /api/move` | Body `{ "slug", "toColumn" }` — validates, writes owning signals, returns `{ card, notice? }` or typed `400`/`404`/`409` |

All other non-`GET` routes (except `POST /api/move`) return `405`.

### Move transition table (drop target)

| Target | Write |
|--------|--------|
| **backlog** | Untrack index row when no `{plansDir}/{slug}/` exists |
| **sprint** | `ws-spec-index` track (`[ ]` row); notice when runless |
| **development** | Plan `*.state.md` `status: active` when state file exists |
| **staging** | Always `409` (`staging-not-writable`) — derived column only |
| **production** | Index `[x]` + Done-log row when delivery evidence exists |
| **abandoned** | Plan `status: cancelled` or Archive row when runless |

Demotions that rewrite shipped history return `409`. Same-column drop is `200` no-op.

## Files

| File | Role |
|------|------|
| `scripts/collect.cjs` | Board JSON builder (`collectBoard({specsDir, plansDir, indexPath})` + `--json` CLI) |
| `scripts/move.cjs` | Move transition table + index/plan/archive writers |
| `scripts/server.cjs` | `node:http` loopback server for the page + JSON + `POST /api/move` (Node 22 stdlib only) |
| `refs/board.html` | Self-contained page (inline CSS/JS, drag-and-drop + popup Move action) |

## Rules

- en-us; harness-neutral; path tokens and flags only — never hardcode consumer directories.
- Loopback-only; stdlib-only; zero new `package.json` dependencies.
- Only `POST /api/move` mutates consumer index/state files; the board never commits git changes.
