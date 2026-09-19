### [2026-09-18] Dispatch-contract prose must mirror posture carve-outs and keep test-locked phrasing

- **Layer**: application
- **Module**: `ws-goal-fix-pr dispatch contract`
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-*/SKILL.md`
- **Scenario / Context**: A new normative dispatch section shipped two review-blocking defects: (1) an unconditional fresh-worker-per-round rule with no lite/inline carve-out, contradicting five other places that document lite as inline-only (lite SKILL.md invariant + Step 5 row, tools.md role-key rule, ws-fix-pr model section); a lite run on a subagent-capable host would have dispatched per-round workers with role models. (2) A Tier-3-fallback bullet triggering on "no bound subagent tool", skipping Tier 2 for CLI-runner hosts and misstating the cited host-dispatch.md ladder. Both were fixed surgically, but the reviewer's literal diffs had to be rejected: one replaced a test phrase-locked bullet, the other broke an AC test regex adjacency.
- **DO NOT**: Write a new unconditional dispatch/fallback rule without sweeping the existing posture carve-outs (lite-inline, tier ladder) it must mirror; do not accept a reviewer diff verbatim when spec ACs or test regexes lock the surrounding phrasing.
- **INSTEAD DO**: Before finalizing new contract prose, grep the skills tree for the posture exemptions (lite inline, Tier 1-3 ladder) and add the matching carve-out in the same batch (ADD a bullet, never replace a phrase-locked one); when a reviewer diff conflicts with a locked test or spec AC, reword the trigger narrowly so every existing regex still passes, and record why the literal diff was rejected.
