---
workflowId: skill-install-checksums-20260720T181031Z
slug: skill-install-checksums
us: null
specSource: local
specPath: specs/skill-install-checksums/step-00-skill-install-checksums.spec.md
workflowType: standard
startedAt: "2026-07-20T18:10:31Z"
endedAt: "2026-07-20T18:47:17Z"
status: completed
currentStep: 9
dryRun: false
autoMode: true
skipTesting: false
skipTests: false
fullMode: true
execMode: parallel
branch: develop
prUrl: https://github.com/jpolvora/workflow-skills/pull/88
prState: MERGED
mergeCommit: d5d6605c078fcd11d3104f6654e21e17aa573056
baselineCommit: 85e7a0b1078d5353299d620039b89acdb2b2c42b
preExistingDirty:
  - .agents/skills/08-ship-pr/PREPARE-CHECKLIST.md
  - .agents/skills/08-ship-pr/SKILL.md
  - .agents/skills/08-ship-pr/examples.md
  - AGENTS.md
  - CHANGELOG.md
checkpoints: []
workflowManifest:
  created:
    - specs/skill-install-checksums/step-01-skill-install-checksums.plan.md
    - specs/skill-install-checksums/step-02-skill-install-checksums.plan.refined.md
    - specs/skill-install-checksums/step-03-skill-install-checksums.plan.exec.md
    - specs/skill-install-checksums/step-03-skill-install-checksums.exec.dag.json
    - bin/install-rules.js
    - bin/skill-integrity-lib.js
    - bin/generate-skill-integrity.js
    - bin/skill-integrity.json
    - .agents/skills/shared/hub.gitignore
    - .agents/skills/shared/memory/2026-07-20-integrity-npm-gitignore-runs.md
    - specs/skill-install-checksums/step-05-skill-install-checksums.plan.report.md
    - specs/skill-install-checksums/step-06-skill-install-checksums.review.md
    - specs/skill-install-checksums/step-06-skill-install-checksums.fix.report.md
    - .agents/skills/shared/memory/2026-07-20-integrity-post-verify-no-bless.md
    - specs/skill-install-checksums/step-07-skill-install-checksums.testing.plan.md
    - specs/skill-install-checksums/step-07-skill-install-checksums.testing.report.md
    - specs/skill-install-checksums/step-08-skill-install-checksums.result.md
  artifacts: []
commits: []
completedSteps:
  - 0
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
  - 9
stepStatus:
  0: skipped-local-spec
  1: completed
  2: completed
  3: completed
  4: completed
  5: completed
  6: completed
  7: completed
  8: completed
  9: completed
completedTasks:
  - T1
  - T2
  - T3
  - T4
  - T5
  - T6
  - T7
  - T8
stepDispatches:
  - { step: 1, dispatched: "2026-07-20T18:13:14Z" }
  - { step: 2, dispatched: "2026-07-20T18:15:03Z" }
  - { step: 3, dispatched: "2026-07-20T18:16:40Z" }
  - { step: 4, dispatched: "2026-07-20T18:26:29Z" }
  - { step: 5, dispatched: "2026-07-20T18:28:07Z" }
  - { step: 6, dispatched: "2026-07-20T18:31:07Z" }
  - { step: 7, dispatched: "2026-07-20T18:32:02Z" }
  - { step: 8, dispatched: "2026-07-20T18:33:55Z" }
  - { step: 9, dispatched: "2026-07-20T18:49:14Z" }
skippedSteps: []
refineRound: 0
currentModel: Cursor Grok 4.5
stepModels:
  - { step: 1, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:13:14Z" }
  - { step: 2, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:15:03Z" }
  - { step: 3, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:16:40Z" }
  - { step: 4, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:26:29Z" }
  - { step: 5, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:28:07Z" }
  - { step: 6, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:31:07Z" }
  - { step: 7, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:32:02Z" }
  - { step: 8, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:33:55Z" }
  - { step: 9, model: Cursor Grok 4.5, dispatched: "2026-07-20T18:49:14Z" }
telemetry:
  workflowStartedAt: "2026-07-20T18:10:31Z"
  workflowEndedAt: "2026-07-20T18:47:17Z"
  totalElapsedSec: 1950
  loc: "{'baseline': None, 'final': None, 'added': None, 'removed': None, 'netDelta': None}"
  totalTokens: 305000
  steps:
    - { N: 1, label: Planning, dispatchedAt: "2026-07-20T18:13:14Z", finishedAt: "2026-07-20T18:13:14Z", elapsedSec: 95, promptTokens: 28000, completionTokens: 5500, estimated: true, model: Cursor Grok 4.5, filesTouched: 1 }
    - { N: 2, label: Interview, dispatchedAt: "2026-07-20T18:15:03Z", finishedAt: "2026-07-20T18:15:03Z", elapsedSec: 165, promptTokens: 42000, completionTokens: 7500, estimated: true, model: Cursor Grok 4.5, filesTouched: 1 }
    - { N: 3, label: Plan to tasks, dispatchedAt: "2026-07-20T18:16:40Z", finishedAt: "2026-07-20T18:16:40Z", elapsedSec: 120, promptTokens: 38000, completionTokens: 6500, estimated: true, model: Cursor Grok 4.5, filesTouched: 2 }
    - { N: 4, label: Implement, dispatchedAt: "2026-07-20T18:26:29Z", finishedAt: "2026-07-20T18:26:29Z", elapsedSec: 600, promptTokens: 50000, completionTokens: 20000, estimated: true, model: Cursor Grok 4.5, filesTouched: 13 }
    - { N: 5, label: Verify, dispatchedAt: "2026-07-20T18:28:07Z", finishedAt: "2026-07-20T18:28:07Z", elapsedSec: 90, promptTokens: 25000, completionTokens: 4000, estimated: true, model: Cursor Grok 4.5, filesTouched: 1 }
    - { N: 6, label: Code review, dispatchedAt: "2026-07-20T18:31:07Z", finishedAt: "2026-07-20T18:31:07Z", elapsedSec: 300, promptTokens: 35000, completionTokens: 10000, estimated: true, model: Cursor Grok 4.5, filesTouched: 7 }
    - { N: 7, label: Testing, dispatchedAt: "2026-07-20T18:32:02Z", finishedAt: "2026-07-20T18:32:02Z", elapsedSec: 180, promptTokens: 28000, completionTokens: 5500, estimated: true, model: Cursor Grok 4.5, filesTouched: 2 }
    - { N: 8, label: Ship, dispatchedAt: "2026-07-20T18:33:55Z", finishedAt: "2026-07-20T18:33:55Z", elapsedSec: 400, promptTokens: 0, completionTokens: 0, estimated: true, model: Cursor Grok 4.5, filesTouched: 1 }
    - { N: 9, label: Fix PR, dispatchedAt: "2026-07-20T18:49:14Z", finishedAt: "2026-07-20T18:49:14Z", elapsedSec: 0, promptTokens: 0, completionTokens: 0, estimated: true, model: Cursor Grok 4.5, filesTouched: 0 }
---
# Workflow state — skill-install-checksums

## Context

- Entry: local `*.spec.md` via local-spec-provider (`action: overwritten`)
- Flags: `full` + `auto`
- `{plansDir}` = `specs`

## Artifacts

- specPath: `specs/skill-install-checksums/step-00-skill-install-checksums.spec.md`
- planPath: `specs/skill-install-checksums/step-02-skill-install-checksums.plan.refined.md`
- resultPath: `specs/skill-install-checksums/step-08-skill-install-checksums.result.md`
- prUrl: https://github.com/jpolvora/workflow-skills/pull/88
- prState: MERGED
- mergedAt: 2026-07-20T18:47:17Z
- mergeCommit: `d5d6605c078fcd11d3104f6654e21e17aa573056`

## Telemetry log

| Step | Label | Model | Elapsed | Tokens |
|------|-------|-------|---------|--------|
| Step 1 | Planning | Cursor Grok 4.5 | 95s | 33500 |
| Step 2 | Interview | Cursor Grok 4.5 | 165s | 49500 |
| Step 3 | Plan to tasks | Cursor Grok 4.5 | 120s | 44500 |
| Step 4 | Implement | Cursor Grok 4.5 | 600s | 70000 |
| Step 5 | Verify | Cursor Grok 4.5 | 90s | 29000 |
| Step 6 | Code review | Cursor Grok 4.5 | 300s | 45000 |
| Step 7 | Testing | Cursor Grok 4.5 | 180s | 33500 |
| Step 8 | Ship | Cursor Grok 4.5 | 400s | 0 |
| Step 9 | Fix PR | Cursor Grok 4.5 | 0s | 0 |

## Gate history
- `workflow-complete | PR #88 MERGED @ d5d6605 | 2026-07-20T18:47:17Z`
- auto-gate | step 9 | PR #88 merged — workflow complete | 2026-07-20T18:49:14Z
- auto-gate | step 8 | Run goal-fix-pr loop | 2026-07-20T18:33:55Z
- auto-gate | step 7 | Commit plan + result, then create PR | 2026-07-20T18:32:02Z
- auto-gate | step 6 | Advance to Step 7 | 2026-07-20T18:31:07Z

- `model-hint | F3→F4 | before-step-6 | current=Cursor Grok 4.5 | 2026-07-20T18:45:00Z`
- auto-gate | step 5 | Advance to Step 6 | 2026-07-20T18:28:07Z
- auto-gate | step 4 | Advance to Step 5 | 2026-07-20T18:26:29Z

- `model-hint | F1→F2 | current=Cursor Grok 4.5 | 2026-07-20T18:20:00Z`
- `auto-gate | step 3→4 | Advance to Step 4 | 2026-07-20T18:20:00Z`
- auto-gate | step 3 | Advance to Step 4 | 2026-07-20T18:16:40Z
- auto-gate | step 2 | Advance to Step 3 | 2026-07-20T18:15:03Z
- auto-gate | step 1 | Advance to Step 2 | 2026-07-20T18:13:14Z

- `init | autoMode=true fullMode=true | 2026-07-20T18:10:31Z`
- `auto-gate | step 0 | skip (local spec register) | 2026-07-20T18:10:31Z`
- `auto-gate | complexity | Standard path | 2026-07-20T18:10:31Z`
- `auto-gate | step 0→1 | Advance to Step 1 | 2026-07-20T18:10:31Z`

## Workflow memory

(empty)

## Accumulated decisions

- Integrity path: `bin/skill-integrity.json` (from spec example; lock in plan)
- Local record: sibling `shared/skill-integrity-local.json` (spec prefer)
- Algorithm: sha256 lowercase hex
- Unsafe override: `--force-integrity`

## Step outputs

### Step 0

- status: skipped (local-spec-provider register)
- summary: Canonical spec already at us-dir; register normalized in place

### Step 9

- status: completed (PR merged; fix-pr loop not required after merge)
- summary: https://github.com/jpolvora/workflow-skills/pull/88 MERGED at 2026-07-20T18:47:17Z (`d5d6605`)
- evidence: review fix commit `bd017d8` on PR; workflow closed post-merge

## Open items

(none — workflow completed)

## Doc consolidation log

(none)

## Workflow baseline

- baselineCommit: `85e7a0b1078d5353299d620039b89acdb2b2c42b`
- branch: `develop`
