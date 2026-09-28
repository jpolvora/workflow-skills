---
step: 8
slug: kanvas-board-drag-drop
workflowId: kanvas-board-drag-drop-20260928T033500Z
status: completed
startedAt: "2026-09-28T03:35:00Z"
endedAt: "2026-09-28T03:38:50Z"
acRefs: []
---
# kanvas-board-drag-drop — Delivery Result

## Expected

Ship ws-kanvas phase 2: HTML5 drag-and-drop, keyboard Move path, `POST /api/move`
transition table, `test/test-kanvas-drag-drop.js`, integrity refresh, PR to
`develop`.

## Done

- `move.cjs` implements index track/untrack, plan status, production sync, and
  archive writes with typed `400`/`404`/`409` guards.
- `server.cjs` serves `POST /api/move` with per-move log lines; `board.html`
  refetches after each move.
- `npm run test` green (141 entries); `verify-integrity` passes at v0.5.11.
- PR https://github.com/jpolvora/workflow-skills/pull/452 merged to `develop`
  (merge commit `32f5cd400b3e783ae85f8477dbe124b586d4f181`).

## Next steps

- Batch item `pre-ship-doc-sync` remains pending in ms-20260928T010610Z.
