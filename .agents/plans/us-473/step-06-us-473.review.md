---
step: 6
slug: us-473
workflowId: us-473-20260930T225523Z
status: completed
startedAt: "2026-09-30T23:10:00Z"
endedAt: "2026-09-30T23:16:00Z"
acRefs: []
---
# Code review — us-473

Scope: `git diff main...HEAD` (`3f19b090` fix + `cb9bd032` release sync).
Reviewer: two-phase adversarial model (derive intent from AC1–AC6, then attack the diff).

## Diff under review

- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` — `detectContextMismatch` branch severity guard (10 added lines, 2 changed).
- `test/test-ws-monitor-us473.js` — new regression suite (114 lines).
- `test/test-suites.json` — register the suite under `harnessEfficiency`.
- `chore(release)` commit: version `0.5.28` + regenerated `bin/skill-integrity.json` + site/doc sync (no code semantics).

## Phase 1 — intent re-derivation

| AC | Expected change | Found |
|----|-----------------|-------|
| AC1 | non-terminal branch mismatch → `critical` | `terminal ? 'info' : 'critical'` — non-terminal stays critical |
| AC2 | terminal branch mismatch → `info` or omit | terminal → `info`, visibility kept |
| AC3 | message names run status | `(run status: ${runStatus})` appended |
| AC4 | HEAD/worktree comparisons unchanged | lines 946–965 byte-identical |
| AC5 | matching branch → no branch finding | guarded by `stateBranch !== gitContext.branch` |
| AC6 | code + defect-contract mapping unchanged | code literal `'context-mismatch'`; `DEFECT_CONTRACTS` untouched |

## Phase 2 — adversarial checks

- **Shape-derived path (MEMORY trap):** severity keys off the literal status only. A terminal-shaped run still reporting `active` (all steps terminal, no `endedAt`) is **not** softened — `TERMINAL_RUN_STATUSES.has('active')` is false → `critical`, consistent with the repo MEMORY entry "monitor severity keys off the status literal, not the shape". Explicitly asserted by the test.
- **`failed` run:** `TERMINAL_RUN_STATUSES` includes `failed`; treated as terminal → `info`. Matches "severity follows run liveness" (a failed run is closed).
- **Null/undefined state:** `deriveTerminalStatus(undefined)` returns `null`; `TERMINAL_RUN_STATUSES.has('undefined')` false → `critical`, `runStatus` `'unknown'`. No crash (`state?.status` optional chaining).
- **Multi-spec caller:** `detectContextMismatch(state, ...)` at line 1707 passes the batch state; a `completed` batch → `info`. Batch runs are terminal; intended.
- **Actionability:** `info` is excluded from `actionableFindings` (critical|warning only), so the finding no longer proposes a defect issue — the reported noise class is resolved.
- **Scope creep:** no other detector, export, or mapping touched. No `.py`, no network, no writes.
- **Test integrity:** suite asserts real severity/message pairs and would fail if severity were hardcoded; registered in `test-suites.json` so `npm run test` exercises it (157/157 green, exit 0).

## Findings

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 0 |
| Suggestion | 0 |
| Info | 0 |

Verdict: **clean** — advance to Step 6b. No review-fix commit required (product tree unchanged after the G2-code commit).
