### [2026-09-06] Scope static scanner authorization checks to enclosing classes

- **Layer**: harness
- **Module**: ws-shared / scan_stack_invariants.cjs
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/scripts/scan_stack_invariants.cjs`, `test/test-reviewer-aligned-gates.js`
- **Scenario / Context:** Review threads on PR #285 showed file-wide authorization checks (`hasClassAuth = content.includes('[Authorize]')` or `content.includes("middleware('can:")`) bypassed method authorization enforcement across sibling controller classes in the same file.
- **DO NOT:** Check class-level authorization or middleware attributes at whole-file scope when analyzing class methods.
- **INSTEAD DO:** Search upward from each method to find its nearest enclosing class declaration and verify class-level attributes within that specific class's block; also allow `void` prefix and detect floating async calls for Promise rules.
