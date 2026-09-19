### [2026-09-18] New contract carve-outs need same-batch regression assertions
- **Layer**: tests
- **Module**: ws-goal-fix-pr dispatch contract + dispatch test
- **Severity**: Medium
- **PathPattern**: test/test-*.js; .agents/skills/ws-*/SKILL.md
- **Scenario / Context**: Three fix batches added Lite/inline carve-out prose to the ws-goal-fix-pr dispatch contract without locking the new branch in the dispatch test (zero lite matches), so a fourth review wave flagged the unasserted branch as a silent-regression risk: a future edit could drop the carve-out and every existing assertion would still pass.
- **DO NOT**: Ship a new behavioral branch or carve-out in a contract file without asserting that branch in its regression test in the same batch; do not adopt reviewer-suggested test regexes without running them against the actual text, and never reword the contract to fit a test.
- **INSTEAD DO**: In the same batch that adds the carve-out, add additive assertions naming the branch (do-not-dispatch + pair-inline-on-captured-model + no-internal-telemetry); verify each suggested regex passes via node before committing, drop or re-anchor any that fail, and keep every existing assertion green.
