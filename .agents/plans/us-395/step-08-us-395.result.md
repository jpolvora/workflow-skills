---
slug: us-395
step: 8
workflowId: us-395-20260922T080709Z
status: completed
startedAt: "2026-09-22T15:25:00Z"
endedAt: "2026-09-22T15:40:00Z"
branch: develop
baseBranch: main
branchStrategy: stay
acRefs: []
---
# Delivery Result — us-395

## Summary

Closed the observer-contract violation where finished work stays live. The state writer now closes on terminal-step coverage (all steps through the pipeline close step terminal) unconditionally on telemetry and idempotently; `ws-monitor` emits `terminal-run-active` and `stale-parent-row` and never reports a terminal-shaped run as active; `ws-spec-multi` contract docs add supersede retirement and parent-child handoff propagation (extends the merged #393 in-place row keying). Two fixture tests and eval cases cover the new behavior.

## Change set

| File | Change |
|------|--------|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | Terminal-shape close guard (`isTerminalShape`, `TERMINAL_RUN_STATUSES`) |
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | `terminalShape`, `deriveTerminalStatus`, `terminal-run-active`, `stale-parent-row`, `detectStaleParentRows` |
| `.agents/skills/ws-monitor/SKILL.md` | Queue signals + signal map + terminal-state observation section |
| `.agents/skills/ws-monitor/evals/evals.json` | Eval ids 3–4 |
| `.agents/skills/ws-spec-multi/STATE.md` | Queue invariants: supersede retirement, handoff, idempotency; Resume Policy rule 10 |
| `.agents/skills/ws-spec-multi/SKILL.md` | Invariant 7 extension |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 1/2 supersede retirement; Phase 4b handoff |
| `.agents/skills/ws-spec-multi/evals/evals.json` | Eval id 4 |
| `test/test-ws-monitor-us395.js`, `test/test-terminal-close-us395.js` | Fixtures (registered in `test-suites.json` harnessEfficiency) |

## Release mechanics

- Version bumped once via `npm run build-site:bump` (0.4.55 → 0.4.56; package.json + `packageVersion` in `bin/skill-dependencies.json` + `.agents/skills/ws-shared/runtime/skill-dependencies.json` + site footer + fixture tarball ref).
- Integrity regenerated + verified after the review-fix commit (`npm run generate-integrity`, `npm run verify-integrity`).
- No `config.schema.json` / `config.json.example` change → `Edit-WorkflowSkillsConfig.ps1` untouched.

## Verification (observed exit codes)

| Command | Exit |
|---------|------|
| `npm run test` (post-fix) | 0 (117/117) |
| `node test/test-harness-clean.js` | 0 (0 findings) |
| `node test/test-ws-monitor-us395.js` | 0 |
| `node test/test-terminal-close-us395.js` | 0 |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | 0 |
| `npm run verify-integrity` | 0 |
| `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --repo-root . --json` | 0 (live specimens) |

## Timing

Wall-clock: start `2026-09-22T13:00:00Z` → close `2026-09-22T15:40:00Z`.

## Branch / shipping

- Branch strategy: **stay on `develop`** (operator requirement) — no `feature/us-395` branch created.
- PR target: `main`.
- Ship phase: `ws-ship-pr` (push + create PR), then Step 9 convergence + merge.
