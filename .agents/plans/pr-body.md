## Summary
- Add a non-packaged upstream session harness at `.agents/dev-harness/SKILL.md` (frozen dogfood contract; not in `.agents/skills/`, not shipped to consumers).
- Point root `AGENTS.md` session autoload, DX dogfood, and write-spec / senior / fable / learning / changelog routes at that file so authoring does not `Read` live `ws-*` SKILL.md bodies.
- Packaged `ws-*` SoT and consumer hubs stay unchanged; live skill bodies load only when authoring or testing that skill.

## Test plan
- [ ] `npm run test`
- [ ] `npm run verify-integrity`
- [ ] `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`
- [ ] CI on this PR
