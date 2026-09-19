### [2026-09-18] Restated ownership needs a whole-file sweep, not a section sweep

- **Layer**: application
- **Module**: `ws-* skill contracts`
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-*/SKILL.md`
- **Scenario / Context**: `ws-goal-fix-pr` states batch-worker ownership in three sections (Steps, Round-batch dispatch, Subagent contract). Two fix-pr batches swept only the dispatch section and each missed same-class unconditional statements elsewhere (telemetry bullet, then the Learning-ownership clause in Steps + Ownership split + Subagent contract), causing three review waves on one PR. Each wave's fix was correct; the sweep scope was wrong.
- **DO NOT**: Scope a proactive sweep to the section you restructured when the contract restates the same ownership or rule in other sections — a section-scoped sweep guarantees a follow-up wave for each restatement you skipped.
- **INSTEAD DO**: When a contract restates ownership in multiple sections, grep the ENTIRE file for the owner tokens (`batch worker`, `dispatched worker`, `worker-reported`, `every batch`) and render an explicit fix-or-skip verdict on every hit in the same batch; assert zero residual unconditional hits before committing.
