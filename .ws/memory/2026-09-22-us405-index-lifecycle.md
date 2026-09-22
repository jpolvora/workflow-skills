### [2026-09-22] index.PRD auto-track lifecycle (us-405 import session)

- **Layer**: specs
- **Module**: ws-spec-from-provider, ws-spec-index, AGENTS.md
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-spec-from-provider/SKILL.md`
- **Scenario / Context**: Bulk-importing tracker backlog left specs registered but untracked, and workflow start/end had no stated index.PRD rule, so Feature map rows drifted behind delivery reality.
- **DO NOT**: Leave a newly imported or workflow-opened spec untracked, or hand-edit `index.PRD` checkboxes to fake status.
- **INSTEAD DO**: Auto-track every successful import via `track_index.cjs --specs-dir {specsDir} --slug us-{id}` (missing/already-tracked index is advisory, never a failure); at workflow start ensure pending `- [ ]` via the same track call; at close/ship run `ws-spec-index sync {slug}` for `[x]` + Done log on delivery evidence. AGENTS.md §6 states the lifecycle; `ws-spec-index/REFERENCE.md` § Orchestrator Call Contract owns the call sites.
