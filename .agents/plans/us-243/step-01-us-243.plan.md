---
slug: us-243
title: "Improve ws-spec-memo: hand off runtime ops to spec-memo ws-memo (keep setup here)"
status: active
step: 1
workflowId: us-243-20260826T052032Z
startedAt: "2026-08-26T05:28:00Z"
acRefs: []
modelsPreset: cursor
endedAt: "2026-08-26T05:30:03.967Z"
---
## Summary

Document the two-skill split (`ws-spec-memo` = setup/bridge; `ws-memo` = runtime vault ops). Add soft health warnings in `check_spec_memo.cjs`, one eval, and `tools.md` pointer updates. No SURFACE.md copy, no ninth MCP tool, keep setup Recommended = disabled.

## Tasks

| # | Task | Files | AC |
|---|------|-------|-----|
| 1 | Add two-skill split + ws-memo handoff section | `references/INTEGRATION.md` | AC1, AC2 |
| 2 | Add runtime `/ws-memo` next-step line after each subcommand section | `SKILL.md` | AC3, AC9 |
| 3 | Add SSE/canvas comment pointing at spec-memo ws-memo MCP template | `references/MCP-TEMPLATE.json` | AC4 |
| 4 | Warn (exit 0) on missing `ws-memo` skill + MCP expectation when vault enabled | `scripts/check_spec_memo.cjs` | AC5, AC6 |
| 5 | Point trap/search follow-ups at `/ws-memo` in alias table | `ws-shared/tools.md` | AC7 |
| 6 | Add handoff eval | `evals/evals.json` | AC8 |
| 7 | Extend smoke tests for runtime handoff warnings | `test/test-spec-memo-scripts.js` | AC5, AC6 |
| 8 | Verify no SURFACE.md or command encyclopedia added under ws-spec-memo | (review only) | AC10 |

## Verification

- `node test/test-spec-memo-scripts.js`
- `npm run test` (full suite before ship)
- Manual: `node .agents/skills/ws-spec-memo/scripts/check_spec_memo.cjs --repo-root . --json` exits 0 when vault off
