### [2026-08-21] Node port tests must migrate with runtime recipes
- **Layer**: Harness
- **Module**: Node helper ports and resolver tests
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-*/**, test/test-*.js`
- **Scenario / Context**: Porting orchestrator surfaces from Python to Node left existing tests asserting Python launcher text, used an invalid no-newline sabotage patch, and exposed an off-by-one script-root traversal in the shared Node resolver.
- **DO NOT**: Change a shipped runtime recipe without migrating its focused launcher/fixture assertions, or count parents from a script file without testing the project-local installed layout.
- **INSTEAD DO**: Update the runtime and its focused tests in the same batch, use syntactically valid invert patches, and prove resolver precedence from nested and project-local fixture roots.
