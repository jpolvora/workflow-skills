---
slug: us-354
step: 6
base: origin/main
rounds: 1
verdict: clean
workflowId: us-354-20260919T043606Z
status: completed
startedAt: "2026-09-19T04:40:20.850Z"
endedAt: "2026-09-19T05:00:01.491Z"
acRefs: []
---
# Step 6 — Code review (us-354)

Primary diff: `git diff --name-status origin/main...HEAD` (9 files; committed snapshot `fa463049`; dirty preflight clean for product paths).

## Phase 1 — Triage hypotheses

1. Guard runs post-finish: a failed guard cannot roll back an already-recorded finish — investigated, fail-closed (retry/block path, no `baton_released`), reachable abuse requires a worker that finishes with explicit `toolCalls: 0`, which the turn rule forbids the worker from emitting as completed. Retained as Suggestion (documented limitation for envelope-less CLI runners: missing-artifact is their observable signal).
2. Brace token `{skillsRoot}` in `host-dispatch.md` prose — Warning, fixed (relative path `../ws-spec-to-pr/WORKER-TURN-RULES.md` per `tools.md` rule 5).
3. `extractToolCalls` regex without word boundary (`mytoolCalls: 0` false positive) — Warning, fixed (`(?:^|[^A-Za-z0-9_])` prefix guard).
4. New telemetry enum members vs `ws-monitor` / telemetry tests — investigated, tolerated (type-equality filters only); tests green.
5. Duplicated normative blocks across the three dispatch insertions vs `check_duplicates.cjs` (min 6 lines) — investigated: shared surface is 2 sentences, canonical full text lives in one file, coordinator copy is `.cjs` (outside the `.md` scan). Clean.
6. Secrets / host-product names in shipped bodies — none; portability check defers to `test-harness-clean.js` (Phase 5a) at Step 7.

## Phase 2 — Adversarial proof (retained findings)

| id | Severity | Evidence | Failure scenario | Missing protection | Discards |
|----|----------|----------|------------------|--------------------|----------|
| R1 | Warning | `host-dispatch.md:L151` (pre-fix) | Consumer host renders brace token literally; rule pointer 404s in strict hosts | `tools.md` path-token rule (relative links in skill bodies) | Fixed: relative path; test-harness links gate covers |
| R2 | Warning | `worker_turn_guard.cjs` `extractToolCalls` (pre-fix) | Identifier suffix (`mytoolCalls: 0`) misread as failed turn | Word-boundary anchoring | Fixed: non-word prefix guard; regression suite re-run green |

## Fix → re-review (round 1/3)

Fixed R1 + R2 in the same surgical pass; `test-worker-turn-guard.js` re-run: all checks passed (exit 0). No Critical/Warning remain. Suggestions: none outstanding (H1 documented limitation only).

## step-output

```yaml
status: success
findings: {critical: 0, warning: 0, suggestion: 1}
advance: true
```
