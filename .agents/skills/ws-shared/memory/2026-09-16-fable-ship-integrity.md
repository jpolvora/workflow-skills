### [2026-09-16] Latest integrity regeneration must precede ship commit
- **Layer**: devops
- **Module**: upstream release ship (ws-ship-pr, integrity gate)
- **Severity**: High
- **PathPattern**: bin/skill-integrity.json
- **Scenario / Context**: During the 0.4.31 ship, hashed hub content (Edit-WorkflowSkillsConfig.ps1) was edited after `generate-integrity`, so `npm run test` failed with "skill-integrity.json is stale vs current tree"; the suite passed only after regenerating integrity again. The fable-judge audit for the ship-scope tree returned VERIFIED WITH CAVEATS because the deterministic harness scripts and full suite ran, but interactive ws-check-harness Phases 0-5c were not executed end-to-end.
- **DO NOT**: Regenerate integrity before the last hashed-file edit, or present the deterministic harness subset as a completed full harness audit.
- **INSTEAD DO**: Make `npm run generate-integrity && npm run verify-integrity` the final step before commit, re-run `npm run test` after any post-regen skill/hub edit, and state the harness-audit scope honestly (deterministic phases plus suite evidence).
