### [2026-08-27] Review jury canonical markdown materialization and juror count validation

- **Layer**: `harness`
- **Module**: `ws-code-review / ws-spec-to-pr`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-code-review/scripts/write_review_round.cjs;.agents/skills/ws-spec-to-pr/scripts/merge_review_jury.cjs`
- **Scenario / Context**: During Step 6 review jury execution, each juror's `write_review_round.cjs` was overwriting canonical `step-06-{slug}.review.md`, leaving only the last juror's findings for downstream fix mode. `merge_review_jury.cjs` was also not validating the number of juror reports against configured `defaults.reviewJury.size`.
- **DO NOT**: Overwrite canonical review markdown when running individual jurors under review jury. Allow review jury merge to silently proceed with fewer juror files than configured.
- **INSTEAD DO**: Guard canonical markdown write with `!options.juryOut` in `write_review_round.cjs`. Materialize the merged jury markdown via `--canonical-review-out` in `merge_review_jury.cjs` and validate juror count against `defaults.reviewJury.size`.
