### [2026-09-06] Strip comments and string literals before evaluating static invariant rules
- **Layer**: harness
- **Module**: ws-shared / scan_stack_invariants.cjs
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-shared/scripts/scan_stack_invariants.cjs`
- **Scenario / Context**: Running static invariant scanners for forbidden synchronous calls, blocked symbols, or architectural constraints.
- **DO NOT**: Test raw code lines with regexes without stripping comments and string literals, which produces false-positive violations on documentation, explanatory comments, and log strings that mention forbidden constructs (e.g. `// Note: do not call .Wait() or .Result`).
- **INSTEAD DO**: Preprocess lines through language-aware comment and literal parsers (`cleanCSharpLine`, `cleanPhpComments`) to strip single-line (`//`, `#`), block (`/* ... */`), verbatim (`@""`), and interpolated string/char literals before testing AST/regex invariant rules.
