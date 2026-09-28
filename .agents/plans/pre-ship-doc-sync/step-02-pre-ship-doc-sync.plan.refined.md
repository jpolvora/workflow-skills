---
step: 2
slug: pre-ship-doc-sync
workflowId: pre-ship-doc-sync-20260928T034600Z
status: completed
startedAt: "2026-09-28T03:46:00Z"
endedAt: "2026-09-28T03:52:00Z"
acRefs: []
---
# pre-ship-doc-sync — Refined Plan

## Implementation

1. Schema + example + GUI binding for `defaults.requirePreShipDocSync`.
2. `resolveRequirePreShipDocSync(config)` in `resolve_consumer_root.cjs`.
3. Document gate in `STEP-DISPATCH.md`, lite Step 4 row, `gates.md`, hubs, and `ws-wiki`.
4. Regression suite `test/test-pre-ship-doc-sync.js` mapped to AC1–AC12 surfaces.
5. Regenerate integrity and bump package patch on ship.

## Product commit

`9d840fe441ddc465baa49ff6b276c86e1be07d29` (already on `develop` / `main`).
