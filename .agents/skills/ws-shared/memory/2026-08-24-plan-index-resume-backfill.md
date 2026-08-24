### [2026-08-24] New pre-advance artifacts need resume backfill docs
- **Layer**: `Harness`
- **Module**: `workflow_state.cjs / plan.index.json / faq.md`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs, .agents/skills/ws-spec-to-pr/docs/faq.md, .agents/skills/ws-shared/setup.md`
- **Scenario / Context**: PR 239 review. 0.3.37 requires `{us-dir}/plan.index.json` before implement. In-flight workflows started on 0.3.36 never ran `plan_index.cjs build`.
- **DO NOT**: Add a hard pre-advance file gate whose only coverage is new-run dispatch. Resume/troubleshooting that still describes HS-5 as YAML-only leaves operators stuck after update.
- **INSTEAD DO**: Document the backfill command in `ws-spec-to-pr/docs/faq.md` and `setup.md` resume, and assert those recipes in `test-artifact-economy.js`.
