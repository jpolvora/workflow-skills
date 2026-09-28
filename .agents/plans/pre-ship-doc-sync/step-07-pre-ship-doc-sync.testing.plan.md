---
step: 7
slug: pre-ship-doc-sync
workflowId: pre-ship-doc-sync-20260928T034600Z
status: completed
startedAt: "2026-09-28T03:46:00Z"
endedAt: "2026-09-28T04:00:00Z"
acRefs: []
---
# pre-ship-doc-sync — Testing Plan

## Automated

- `node test/test-pre-ship-doc-sync.js`
- `node test/test-powershell-config-editor.js`
- `npm run verify-integrity`

## Negative paths (NS1–NS4)

Covered by static assertions in `test-pre-ship-doc-sync.js` (warn-skip string, flag-false legacy wording, invalid → true).
