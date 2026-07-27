---
slug: us-134
execMode: sequential
totalTasks: 4
---

# Execution Plan — US 134

## Tasks

1. **Task 1: Create `ws-spec-index` skill files**
   - `.agents/skills/ws-spec-index/SKILL.md`
   - `.agents/skills/ws-spec-index/INDEX-TEMPLATE.md`
   - `.agents/skills/ws-spec-index/REFERENCE.md`
   - `.agents/skills/ws-spec-index/evals/evals.json`

2. **Task 2: Register skill in package graph**
   - `bin/skill-dependencies.json`

3. **Task 3: Update hub skill indexes and task routers**
   - `.agents/skills/ws-shared/AGENTS.md`
   - `AGENTS.md`

4. **Task 4: Wire orchestrator auto-sync call sites**
   - `.agents/skills/spec-to-pr/STEP-DISPATCH.md`
   - `.agents/skills/spec-to-pr-lite/SKILL.md`
   - `.agents/skills/ws-ship-pr/SKILL.md`
