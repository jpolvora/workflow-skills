# testing-executor-model — Fable Judge

**Verdict:** VERIFIED WITH CAVEATS

## Claims vs ground truth

| Claim | Evidence |
|-------|----------|
| testingModel in schema/example | `git diff` on config.schema.json + config.json.example |
| reviewerModel narrowed to 5–6 | schema description + STEP-DISPATCH + tools.md |
| lite does not apply testingModel | ws-spec-to-pr-lite/SKILL.md |
| tests pass | `npm run test` exit 0 (this session) |
| integrity regenerated | `npm run verify-integrity` exit 0 |

## Caveats

- Model switch is an agent-dispatch contract (same as existing planner/execution/reviewer keys); no host API runtime.
- Parallel workers can move HEAD off `feature/testing-executor-model`; re-checked before edits.

## Safety floor

Not REFUTED.
