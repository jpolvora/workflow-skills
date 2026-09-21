### [2026-09-21] A deferred behavior change must not leave the changed skill and canonical docs advertising the old contract

- **Layer**: `Domain`
- **Module**: `ws-patterns-generator` (SKILL.md), `ws-shared/runtime` (`tools.md`, `config-resolution.md`)
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-patterns-generator/SKILL.md, .agents/skills/ws-shared/runtime/tools.md, .agents/skills/ws-shared/runtime/config-resolution.md`
- **Scenario / Context**: PR #384 review (score 6) found the generator skill told agents to "Expand `{skillsRoot}` / `{sharedDir}` / ... from project config" while its Rules pinned the generated body to the fixed `.ws` hub — a contradiction inside the changed file after review round 7 deferred hub relocation to a follow-up spec. `tools.md` and `config-resolution.md` still presented an explicit `pathTokens.sharedDir` as generally effective for hub content, so a consumer configuring it would split configured project data from the generated skill.
- **DO NOT**: Fix one code path to a fixed value (or new contract) and leave the skill's own instructions and the canonical path-token docs still describing the old configurable behavior; defer behavior to a later spec without making the interim contract explicit where the token is defined.
- **INSTEAD DO**: When a change narrows or defers a contract, update the changed skill's instruction step, the shared runtime docs that define the token, and add a regression asserting the docs/instruction no longer advertise the deferred behavior (e.g. the resolve step must not list the overridable token). Keep the caveat portable (no spec-file paths) and regenerate integrity when hashed runtime docs change.
