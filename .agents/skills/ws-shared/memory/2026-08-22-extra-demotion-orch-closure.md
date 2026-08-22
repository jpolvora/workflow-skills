### [2026-08-22] Extra demotion must retarget orch closure checks
- **Layer**: `Harness`
- **Module**: `ws-check-workflows / test-evals-schema / test-doc-sync`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-check-workflows/scripts/check_workflows.py, test/test-evals-schema.js, test/test-doc-sync.js, docs/index.html`
- **Scenario / Context**: Demoting `ws-update-plan-implementation` to Extra and merging pattern skills dropped one evals.json and left check_workflows `aux_skills` still treating the Extra skill as a required `ws-spec-to-pr` dep. `npm test` then failed at hardcoded `Validated 45 eval files`, stale `docs/index.html`, and Dependency Closure CRITICAL.
- **DO NOT**: Keep Extra/optional Post skills in check_workflows `aux_skills`, leave eval-count assertions hardcoded after deleting skill evals, skip `node bin/build-site.js` after catalog membership changes, or leave `test/test-doc-sync.js` pinned to the previous `package.json` version after `build-site:bump`.
- **INSTEAD DO**: Drop demoted ids from orch dispatch-closure lists; recount eval files (`bin/validate-evals.cjs` stdout); rebuild the site catalog in the same change set as skill-graph edits; bump the `test-doc-sync.js` version assertion in the same commit as `package.json`.
