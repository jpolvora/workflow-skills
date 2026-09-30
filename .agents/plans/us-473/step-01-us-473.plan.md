---
step: 1
slug: us-473
workflowId: us-473-20260930T225523Z
status: completed
acRefs: []
title: Scope ws-monitor context-mismatch branch comparison to non-terminal runs
startedAt: "2026-09-30T22:55:23Z"
endedAt: "2026-09-30T23:05:00Z"
---
## 0. Summary & Business Rules

`ws-monitor` `detectContextMismatch` in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` compares
a run's recorded `state.branch` against the ambient checkout branch and always stamps the branch
difference as `critical`. For a terminal run that closed days ago, the ambient HEAD has since moved
(`develop`), so the frozen `feature/*` branch reads as a live `context-mismatch` critical. In one
27-run watch all four criticals were historical terminal runs and the finding list was byte-identical
across ticks.

Deliverable: make the branch-based `context-mismatch` severity follow run liveness — non-terminal runs
keep `critical`, terminal runs downgrade to `info` (visibility retained) and the message names the run
status used for the decision. The state-HEAD and state-worktree comparisons are untouched, and the
finding code plus its defect-contract mapping are unchanged.

Business rules:
- Read-only observer: no product write, no state mutation, no network.
- Terminal classification must reuse the existing monitor classification (`TERMINAL_RUN_STATUSES` and
  `deriveTerminalStatus`/`terminalShape` from us-395), never a new ad-hoc set.
- Node-only `.cjs`, launched with `node`; no `.py`.

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** terminal status set = existing monitor terminal
statuses; terminal handling = downgrade to `info` (keep visibility); scope = branch comparison only;
input validation/auth/concurrency/lifecycle N/A (read-only observer).

**Measurable ACs:** AC1–AC6 from `step-00-us-473.spec.md`.

**In scope:**
- `detectContextMismatch` branch comparison severity guard in `monitor_snapshot.cjs`.
- Branch finding message names the run status.
- Regression coverage in `test/` for terminal vs non-terminal vs matching branch.

**Out of scope (spec table):** comparing against the run's own recorded lineage instead of ambient
HEAD; the state-HEAD and state-worktree comparisons; rewriting historic state branches; other monitor
finding codes.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | severity guard in `detectContextMismatch` |
| tests | `test/test-ws-monitor-us473.js`, `test/test-suites.json` | regression coverage |

**Current code (`detectContextMismatch`):**

```js
const stateBranch = state.branch || state.workingBranch || null;
if (stateBranch && gitContext?.branch && stateBranch !== gitContext.branch) {
  addFinding(findings, 'critical', 'context-mismatch',
    `state branch ${stateBranch} differs from active branch ${gitContext.branch}`, [...]);
}
```

**Fix:** derive run liveness once at the top of `detectContextMismatch` using the existing
classifiers — `const derived = deriveTerminalStatus(state);` plus
`TERMINAL_RUN_STATUSES.has(String(state && state.status))` — then set the branch finding severity to
`terminal ? 'info' : 'critical'` and append the resolved run status to the message. A terminal run
whose branch differs now reports `info`, so it is no longer actionable and cannot dominate the report.
The HEAD/worktree branches keep their `warning` severity and existing messages verbatim.

**Not touched:** every other detector, `expectedArtifacts`, the multi-spec classify path, `--watch`.

## 3. Step-by-Step Plan

1. **Add the liveness guard** to the branch comparison in `detectContextMismatch`: `info` for terminal
   runs, `critical` for non-terminal; name the status in the message. → AC1, AC2, AC3
2. **Leave HEAD/worktree comparisons and the finding code/mapping unchanged.** → AC4, AC6
3. **Regression tests** in `test/test-ws-monitor-us473.js`: terminal run branch mismatch → `info` (not
   critical); active run branch mismatch → `critical`; matching branch → no branch finding. Register
   the suite in `test/test-suites.json`. → AC1–AC6
4. **Harness / Node-only check** — no `.py`; `test-harness-clean.js` 0 findings.
5. **Integrity + one version bump at ship** — `npm run build-site:bump`, `npm run generate-integrity`
   + `verify-integrity`.

## 4. Permissions, Tenancy & i18n

N/A — local read-only filesystem/git scan; no RBAC, tenancy, authZ, or user-facing i18n. Output is
en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testActiveRunBranchMismatchStaysCritical` — active run + differing branch → `critical` | `monitor_snapshot.cjs` |
| AC2 | `testTerminalRunBranchMismatchIsInfo` — `completed` run + differing branch → `info` | `monitor_snapshot.cjs` |
| AC3 | `testBranchMismatchMessageNamesStatus` — message contains the run status | `monitor_snapshot.cjs` |
| AC4 | `testHeadWorktreeComparisonsUnchanged` — state-HEAD/worktree findings keep their severity/message | `monitor_snapshot.cjs` |
| AC5 | `testMatchingBranchNoFinding` — recorded branch equals checkout → no branch finding | `monitor_snapshot.cjs` |
| AC6 | `testContextMismatchCodeMappingUnchanged` — finding code + defect contract mapping unchanged | `monitor_snapshot.cjs` |
| NS1 | `completed` run `feature/x` vs `develop` must not be critical | `monitor_snapshot.cjs` |
| NS2 | active run differing branch must still be critical | `monitor_snapshot.cjs` |
| NS3 | matching branch must not produce a branch finding | `monitor_snapshot.cjs` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Node-only runtime | `node --check` on the edited `.cjs`; no `.py` introduced | `monitor_snapshot.cjs` |
| Read-only observer | source scan: severity/message change only; no `writeFileSync` added on the detection path | `monitor_snapshot.cjs` |
| Liveness reuse | terminal decision reuses `TERMINAL_RUN_STATUSES` + `deriveTerminalStatus`; no new status set | `monitor_snapshot.cjs` |
| Finding contract | `context-mismatch` code and defect-contract mapping (line ~1544) unchanged | `monitor_snapshot.cjs` |
| Regression safety | new suite + existing `test/test-ws-monitor*.js` green under `npm run test` | `test/` |
