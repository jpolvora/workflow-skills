### [2026-09-22] AC-ledger scoreState boundary must match the next pre-advance; regenerate integrity after skill edits

- **Layer**: Infrastructure
- **Module**: ws-spec-to-pr / ws-shared runtime
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs, bin/skill-integrity.json
- **Scenario / Context**: During the us-389 standard run, `validate_state.cjs --pre-advance 7` failed with "ledger scoreState must match derived step5 score" because `commit_g2_code.cjs` had stamped `scoreState.boundary = pre-step6` (needed for advance to 6), while advance to 7/8 re-derives at boundary `step5` and advance to 9 at `ship`. Separately, the first `npm test` after editing `Edit-WorkflowSkillsConfig.ps1` failed Phase 0b with a stale `bin/skill-integrity.json`.
- **DO NOT**: assume one `ac-ledger` `scoreState` fits every advance, and do not run the suite after touching hashed skill content without regenerating integrity first.
- **INSTEAD DO**: after linking commits, re-link with an explicit `--score-boundary` matching the next advance (`pre-step6` for 6, `step5` for 7/8, `ship` for 9) so `scoreState.boundary` matches; and run `npm run generate-integrity` immediately after any edit under `.agents/skills/**` before `npm run test` / `verify-integrity`.
