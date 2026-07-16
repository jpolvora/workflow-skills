---
workflowId: promote-shared-skills-20260716T022051Z
slug: promote-shared-skills
us: null
specSource: local
specPath: .cursor/plans/promote-shared-skills/step-00-promote-shared-skills.spec.md
startedAt: "2026-07-16T02:20:51Z"
endedAt: null
status: active
currentStep: 0
dryRun: false
autoMode: false
skipIntegration: false
skipTests: false
fullMode: false
execMode: null
workflowType: standard
branch: develop
baseBranch: main
baselineCommit: c80c94e0f4dcdde7e9e37727d1abb3e9fc83cc92
preExistingDirty: []
checkpoints:
  - uswf/promote-shared-skills-20260716T022051Z/before-step-0
  - uswf/promote-shared-skills-20260716T022051Z/before-step-1
workflowManifest:
  created:
    - .cursor/plans/promote-shared-skills/step-00-promote-shared-skills.spec.md
    - specs/promote-shared-skills.spec.md
  artifacts:
    - .cursor/plans/promote-shared-skills/step-00-promote-shared-skills.spec.md
commits: []
completedSteps:
  - 0
stepStatus:
  0: completed
skippedSteps: []
completedTasks: []
refineRound: 0
currentModel: null
recommendedModel: null
stepModels:
  - { step: 0, model: null, dispatched: "2026-07-16T02:21:00Z" }
modelChain: {}
telemetry:
  loc:
    baseline: 22448
  workflowStartedAt: "2026-07-16T02:20:51Z"
  steps:
    - { N: 0, label: "Spec Creation", finishedAt: "2026-07-16T02:22:58Z", filesTouched: 2 }
  totalElapsedSec: 0
  totalTokens: 0
---
# State — promote-shared-skills (`promote-shared-skills-20260716T022051Z`)

## Workflow baseline

- Branch: `develop`
- Base: `main`
- Baseline commit: `c80c94e0f4dcdde7e9e37727d1abb3e9fc83cc92`
- Entry: free-text brainstorm (switched from `/spec-to-pr-lite` → `/spec-to-pr`)
- Checkpoint: `uswf/promote-shared-skills-20260716T022051Z/before-step-1`

## Artifacts

- specPath: `.cursor/plans/promote-shared-skills/step-00-promote-shared-skills.spec.md`
- mirrorPath: `specs/promote-shared-skills.spec.md`
- specSnapshot: *(n/a — local brainstorm)*

## Workflow memory

- User invoked lite with free-text; chose option 1 → full `spec-to-pr` for Step 0 brainstorm.
- Feature: promote seven `shared/` skills to top-level installables; packages Full/Workflows/Extra/Individual; dependency map + smart dep select-on; site Installation packages section; preserve `config.json` + `self-learning/memory/`.
- AskQuestion tool unavailable this session → markdown gate fallback (`askquestion-unavailable`).
- Step 0 complete via [00-write-spec](1b794d4c-5a0e-4812-b1e5-6c3c85f286dc).

## Accumulated decisions

- Orchestrator: `spec-to-pr` (`workflowType: standard`)
- Providers: `active=local`, `scm=github`
- `fullMode: false` (ship gate later will recommend Skip)
- Seven skills to promote: caveman, gabarito, karpathy-guidelines, spec-format, goal-loop, self-learning, changelog
- `shared/` remains config/docs hub only (not a selectable skill)

## Gate history

- `askquestion-unavailable | entry-gate | Tool not found: AskQuestion | 2026-07-15T22:19:00Z`
- `entry | free-text-brainstorm | user chose full orch | 2026-07-16T02:20:51Z`
- `step-0 | completed | 2026-07-16T02:22:58Z`

## Doc consolidation log

*(empty)*
