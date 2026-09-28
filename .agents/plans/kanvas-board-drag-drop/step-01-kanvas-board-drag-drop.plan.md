# Plan — kanvas-board-drag-drop

## Scope

- Add `scripts/move.cjs` transition table (index track/untrack/sync, plan status, archive).
- Extend `server.cjs` with `POST /api/move` and move log line.
- Update `refs/board.html` for HTML5 drag-and-drop and popup Move action.
- Add `test/test-kanvas-drag-drop.js`; regenerate integrity.

## Verification

- `node test/test-kanvas-board.js`
- `node test/test-kanvas-drag-drop.js`
- `npm run verify-integrity`
