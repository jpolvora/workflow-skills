### [2026-09-06] Comprehensive argument parsing for raw SQL injection scanners
- **Layer**: harness
- **Module**: ws-shared / scan_stack_invariants.cjs
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/scripts/scan_stack_invariants.cjs`
- **Scenario / Context**: Scanning PHP/Laravel raw database queries (`DB::raw`, `DB::select`, `whereRaw`, `selectRaw`) for SQL injection vulnerabilities.
- **DO NOT**: Match raw SQL calls with single-quote or superficial regexes that only test `DB::raw` with leading variables, missing concatenation (`. $var`, `$var .`), double-quote variable interpolation (`"SELECT ... $var"`), and method variants (`whereRaw`, `selectRaw`, `orderByRaw`).
- **INSTEAD DO**: Extract the first argument cleanly using a balanced parenthesis/quote parser (`extractFirstArgument`), check for unescaped variable interpolation, concatenation, and bare variables across all raw query methods, and ignore parameterized bindings in subsequent arguments (`['%' . $var . '%']`).
