# fix-pr plan gate — PR #337

- batchId: pr-337-round-1
- prId: 337
- scope: goal-act-round
- headSha: 53ebf617
- plannedAt: 2026-09-16T22:58:00Z
- activeThreadIds: [PRRT_kwDOTFajc86jHrTf]
- status: planned

| threadId | score | proposedAction | defectClass | sourcesConsulted | proactiveFixed | proactiveSkipped |
|----------|-------|----------------|-------------|------------------|----------------|------------------|
| PRRT_kwDOTFajc86jHrTf | 6 | Anchor already fixed in 7b63fffe; verify ws-megabrain and site carry no retired-karpathy references, fix same-class siblings, then resolve with commit evidence | retired-skill-reference | repo-wide `rg -i karpathy` over .agents/skills, docs/, README, FEATURES, AGENTS; PR thread; git log -S | ws-fix-pr/scripts/COOPERATIVE_FIX.md:14; ws-fix-pr/README.md:58; ws-show-harness/SKILL.md:23 | .agents/skills/ws-fix-pr/scripts/AUTO_FIX.md (byte-locked by test/test-fix-pr-proactive-class-sweep.js blob assertion; wording is historical, not a skill path). Intentional aliases left as-is: ws-senior-developer invocation alias + opt-out phrases; ws-shared/config.json `rules.karpathyGuidelines`; ws-shared/STACK.md alias row; root AGENTS.md opt-out rows; docs/index.html senior-developer card alias |

## Verification plan

- `rg -i karpathy` returns only intentional alias rows (senior-developer invocation/opt-out/config alias).
- `npm run generate-integrity && npm run verify-integrity`.
- `npm run test`.
