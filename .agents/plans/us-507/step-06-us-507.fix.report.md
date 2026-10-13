---
step: 6
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-13T00:10:00Z"
endedAt: "2026-10-13T00:10:00Z"
acRefs: []
---
# Review-Fix Report — us-507 (round 1/3)

Review round 1 raised one Warning (CR-001). Fix applied in `1925b9f9`
(`fix(us-507): skip the state-less scan when --workflow-id is supplied`).

## Change

`monitor_snapshot.cjs` `snapshot()`:

```js
// before
const statelessRuns = listStatelessRuns(plansDir, context.repoRoot).filter((run) => {
  if (options.workflowId) return false;
  if (options.slug) return run.slug === String(options.slug);
  return true;
});

// after
const statelessRuns = options.workflowId
  ? []
  : listStatelessRuns(plansDir, context.repoRoot)
    .filter((run) => !options.slug || run.slug === String(options.slug));
```

Behavior is unchanged for `--workflow-id` (AC11 still yields `workflowCount: 0`)
and for `--slug` / unscoped runs; the full plans-root scan is now skipped when it
cannot contribute a record.

## Post-fix verification

| Check | Result |
|-------|--------|
| `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | exit 0 |
| `node test/test-ws-monitor-us507.js` | ok |
| `node test/test-ws-monitor-us464.js` | exit 0 |
| `node test/test-ws-monitor-us388.js` | exit 0 |
| `npm run generate-integrity` / `npm run verify-integrity` | regenerated + OK (0.5.42) |
| `ac_ledger.cjs score --boundary pre-step6` | 10/10, no errors |

## Re-review

No Critical or open Warning remains; round 2 not required.
