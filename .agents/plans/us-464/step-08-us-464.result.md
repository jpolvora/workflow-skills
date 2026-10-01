---
step: 8
slug: us-464
workflowId: us-464-20260930T220628Z
status: completed
shipStatus: pending
acRefs: []
startedAt: "2026-09-30T22:06:28Z"
endedAt: "2026-09-30T22:45:12.212Z"
---
# Delivery result — us-464

## What shipped

`ws-monitor` slug-scoped discovery now selects every discovered run whose **state-derived
slug** equals `--slug <value>`, independent of the plan folder name and the state-file
layout. The canonical `{plansDir}/{runId}/{runId}.state.md` `ws-spec-multi` batch state is
no longer dropped; `--workflow-id` remains authoritative and returns the matching run
regardless of any slug filter; an unmatched slug returns zero.

- Skill source: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
  (`stateDerivedSlug`, `stateFileMatchesSlug`, slug-filter path).
- Regression suite: `test/test-ws-monitor-us464.js` (registered in `test/test-suites.json`).

## Acceptance criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | Implemented | derived-slug filter + `testSlugSelectsCanonicalRunIdRun`/`testSlugSelectsCanonicalLayout` |
| AC2 | Implemented | `testSlugIndependentOfFolderName` (folder `renamed-folder-xyz`) |
| AC3 | Implemented | canonical runId layout selected (`testSlugSelectsCanonicalLayout`) |
| AC4 | Implemented | slug-named folder selected (`testSlugSelectsSlugNamedFolder`) |
| AC5 | Implemented | legacy flat `ws-spec-multi/` selected (`testSlugSelectsLegacyFlatFile`) |
| AC6 | Implemented | `--workflow-id` wins over slug (`testWorkflowIdBypassesSlugFilter`) |
| AC7 | Implemented | unmatched slug → 0 (`testUnmatchedSlugReturnsZero`) |

Verify score: **10/10** (step-05 report). Fresh-verify: 7/7 PASS, 5/5 injections detected
(step-05b report).

## Commits (branch `develop`)

| SHA | Step | Message |
|-----|------|---------|
| `dbf18d62` | 5 | `feat(us-464): verified implementation` |
| `2d6cf770` | 8 | `chore(release): bump 0.5.27 and sync site/integrity for us-464 slug-scoped ws-monitor discovery` |

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Full suite | `npm run test` | 156/156 pass (exit 0) |
| Integrity | `npm run generate-integrity` + `verify-integrity` | OK, v0.5.27 |
| Harness | `node test/test-harness-clean.js` | 0 findings |
| Config GUI editor | `node test/test-powershell-config-editor.js` | static tests pass |
| Node-only | `node --check monitor_snapshot.cjs` | OK, no `.py` |

## Pre-ship board

| # | Check | Result |
|---|-------|--------|
| 1 | Version bumped once per release PR | ✅ 0.5.27 > merge-base 0.5.26 |
| 2 | Integrity regenerated + verified | ✅ |
| 3 | Desktop config GUI editor synced | ✅ (no config schema change; editor test green) |
| 4 | Tests + harness clean | ✅ 156/156 + 0 findings |
| 5 | Docs/site/catalog in sync | ✅ site rebuilt (61 skills) |

## Timing

- Workflow started: `2026-09-30T22:06:28Z`
- Delivery result: `2026-09-30T22:44:29Z`
- Total wall clock: ~38 minutes

## Ship

Branch policy `stay-on-develop` (shared head). Push `develop`; PR `develop -> main`.
No merge by this worker (batch master owns convergence + merge).
