---
step: 8
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
acRefs: []
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T20:07:01.990Z"
---
# Delivery result — us-474

## Summary

The spec-index `sync`/close path now fails closed: it files a shipped spec + sidecars from `pending/` to `completed/` (rewriting `index.PRD` `spec:` refs in the same apply), reports the filing as **outstanding** when it cannot file, verifies at Step 8 close that an index-`[x]` spec is not still under `pending/`, and exposes a harness gate that flags any `[x]`→`pending/` row.

## Deliverables

| Artifact | Kind |
|----------|------|
| `.agents/skills/ws-spec-index/scripts/sync_index.cjs` | deterministic evidence-gated sync (files first, then indexes) |
| `.agents/skills/ws-spec-index/scripts/verify_close_filing.cjs` | Step 8 close verification (fail closed, names stale path) |
| `.agents/skills/ws-check-harness/scripts/check_spec_filing.cjs` | harness gate + Phase 5a wiring |
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Step 8 close runs the helpers |
| `.agents/skills/ws-spec-index/SKILL.md` + `REFERENCE.md` | docs |
| `test/test-spec-index-filing.js` | AC fixtures (+ `test-suites.json`) |
| `bin/skill-integrity.json` | regenerated |

## Verification

| Check | Result |
|-------|--------|
| `npm test` (configured `backendTest`) | exit 0 — 154/154 |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| Step 5 check-implementation | 10/10 (earned 70/70) |
| Step 6 code review | clean (W1 fixed + re-reviewed) |
| Step 6b fresh-verify | 7/7 ACs VERIFIED; 5/5 fault injections killed the suite |

## Commits

- `f49dce76` — `feat(us-474): deterministic spec-index sync filing + close verification`
- `c6a5823d` — `fix(us-474): review round 1 — file spec before marking index done`

Diff vs baseline `e215a3c0`: 11 files, +884/−13.

## Timing

- Workflow baseline: 2026-09-30T19:27:24Z
- Close: 2026-09-30T19:53:41Z
- Total wall-clock: ~26 min
- Steered by: batch worker `us-474`, flowMode `standard`, autoMode (Tier 3 inline-isolated; no subagent/background tool bound).
