### [2026-09-18] Eval bulk regenerator deletes hand-added evals
- **Layer**: Tests
- **Module**: SkillEvals
- **Severity**: High
- **PathPattern**: bin/generate-skill-evals.js; .agents/skills/*/evals/evals.json
- **Scenario / Context**: When updating eval assertions (e.g. path-token renames), refreshing eval JSON files with the bulk generator.
- **DO NOT**: Run `node bin/generate-skill-evals.js` to refresh evals — the generator is stale relative to committed evals.json files and deletes hand-added eval cases (observed: 233 lines dropped across 7 unrelated files, e.g. ws-fix-pr ids 3-4).
- **INSTEAD DO**: Hand-edit the specific evals.json assertions, update the generator source strings identically when they exist there, and verify with `git diff --stat` that only intended eval files changed; revert collateral with `git checkout -- <paths>`.
