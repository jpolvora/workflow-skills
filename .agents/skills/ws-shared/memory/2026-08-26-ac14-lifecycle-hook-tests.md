### [2026-08-26] AC14 lifecycle routing needs automated assertions

- **Layer**: Tests
- **Module**: test-configurable-memory-backends
- **Severity**: Medium
- **PathPattern**: `test/test-configurable-memory-backends.js`, `.agents/skills/ws-self-learning/SKILL.md`, `.agents/skills/ws-shared/tools.md`
- **Scenario / Context:** Spec AC14 requires tests for lifecycle hook translation (failure reflection, fix-pr traps, changelog append) when `enableSpecMemoIntegration` is true. Routing/configure E2E stayed green without asserting `update-memory`/`upsert`/`append` in skill + alias docs.
- **DO NOT:** Treat `resolveMemoryRouting` + configure E2E as full AC14 coverage.
- **INSTEAD DO:** Assert `ws-self-learning` `update-memory` + `upsert --kind trap`, `tools.md` vault upsert/append, and hub `read-memory`/`update-memory` routing.
