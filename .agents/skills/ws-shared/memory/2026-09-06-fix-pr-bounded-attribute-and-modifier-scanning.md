### [2026-09-06] Bounded attribute and modifier matching in regex AST scanners
- **Layer**: harness
- **Module**: ws-shared / scan_stack_invariants.cjs
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/scripts/scan_stack_invariants.cjs`
- **Scenario / Context**: Scanning multi-class or multi-method source files (C#, PHP) for authorization attributes or method bodies using regex.
- **DO NOT**: Take fixed backward line slices (e.g. `idx - 6`) that cross class or block boundaries, or assume strict method modifier ordering without supporting `virtual`, `override`, `sealed`, `async`, or new keywords.
- **INSTEAD DO**: Scan backwards only through contiguous attribute/annotation lines stopping at non-attribute statements or block closers (`}`), allow optional modifier groups (`(?:(?:virtual|override|sealed|static|new|async)\s+)*`), and bound method body searches by stopping before subsequent method declarations.
