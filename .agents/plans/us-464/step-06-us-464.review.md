---
step: 6
slug: us-464
workflowId: us-464-20260930T220628Z
status: completed
acRefs: []
baseRange: 36f985b9dc52106f15657726cda7bf0b856330ed...dbf18d62a41ccc9cffeb77f229b26a73e8768b85
startedAt: "2026-09-30T22:06:28Z"
endedAt: "2026-09-30T22:29:06.347Z"
---
# Code Review — us-464 (slug-scoped ws-monitor discovery)

## Scope

`git diff 36f985b9...dbf18d62` on `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`,
`test/test-ws-monitor-us464.js`, `test/test-suites.json`, `bin/skill-integrity.json` (regenerated).
Read-only observer change; no product state, no network.

## Findings

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| R1 | info | `monitor_snapshot.cjs:L1674-L1681` | `--workflow-id` now suppresses slug scoping entirely so the id is authoritative (AC6). This is an intentional contract change: a caller passing both `--workflow-id` and a non-matching `--slug` now receives the id-matched run instead of zero. The transcript correlation filter still ANDs both keys, so no unrelated transcript leaks. Pre-existing `combinedMismatch` regression in `test-ws-monitor.js` remains green. |
| R2 | info | `test/test-ws-monitor-us464.js` | Test names referenced by the AC ledger are carried as comment markers, not callable functions. Acceptable for this assertion-style suite; the ledger only requires the name to be present in the source. |
| R3 | info | `monitor_snapshot.cjs:L418-L425` | `stateDerivedSlug` falls back to the plan folder name only when the state carries neither `slug` nor `us`, mirroring the workflow-record derivation exactly. This is the documented last-resort record fallback, not folder-name selection. |

## Verdict

No critical or warning findings. No fix commit required.

- Read-only preserved: the discovery path adds no writer.
- Filter and reported slug use the same derivation, so scoping can no longer disagree with the printed slug.
- All 7 ACs have observed `exitCode 0` test evidence; `npm run test` = 156/156 green.
