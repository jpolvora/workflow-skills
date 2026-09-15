### [2026-09-15] Pipeline prose dedup must keep checker- and test-locked substrings

- **Layer:** harness
- **Module:** pipeline skill dedup / harness checks
- **Severity:** Medium
- **PathPattern:** `.agents/skills/ws-*/SKILL.md`;`.agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs`;`test/test-research-pipeline-quality.js`;`test/test-score-and-refine-second-pass.js`
- **Scenario / Context:** Shrinking duplicated pipeline prose removed the per-skill handoff sentence and reworded two long gate paragraphs. `check_pipeline_handoff.cjs` requires the substring `state.handoffs` in all 11 pipeline skills, so `test-research-pipeline-quality.js` failed; and `test-score-and-refine-second-pass.js` locks the exact phrases `Do not drop ACs` (ws-implement-tasks) and `optional \`scoreAndRefine\` second pass` (ws-plan-verify), so simple rewording failed.
- **DO NOT:** Delete the `state.handoffs` mention from a pipeline `SKILL.md`, or reword gate prose without checking phrase-locked tests, when deduping shared contracts.
- **INSTEAD DO:** Keep a terse one-line handoff pointer per pipeline skill (dedup the long sentence only), and after any pipeline prose shrink run `node .agents/skills/ws-check-harness/scripts/check_pipeline_handoff.cjs --repo-root .` plus `node test/test-score-and-refine-second-pass.js` before regenerating integrity.
