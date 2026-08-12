---
slug: refine-ws-activity-report-human-timing
status: delivered
---

# Delivery result — refine-ws-activity-report-human-timing

## Shipped

Refined `ws-activity-report` human vs agent duration model so billable **Human Total ≥ Agent Running Total**. Agent execution time counts as concurrent human supervision; invoice uses Human Total.

## Files

- `.agents/skills/ws-activity-report/scripts/infer_human_timing.py`
- `.agents/skills/ws-activity-report/references/TIMING.md`
- `.agents/skills/ws-activity-report/references/OUTPUT.md`
- `.agents/skills/ws-activity-report/SKILL.md`
- `test/test-infer-human-timing.js`
- `package.json` (test script wiring)

## Verification

- `node test/test-infer-human-timing.js` — pass

## Benchmark

Wall-clock (workflow): auto pipeline Steps 0–8.
