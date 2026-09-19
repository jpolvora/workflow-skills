### [2026-09-06] Accurate fixed-column slicing for git porcelain status parsing
- **Layer**: harness
- **Module**: ws-shared / scan_stack_invariants.cjs
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-shared/scripts/scan_stack_invariants.cjs`
- **Scenario / Context**: Parsing `git status --porcelain` output to find modified/untracked files.
- **DO NOT**: Trim each line before slicing or use fixed string offsets on trimmed porcelain lines (`line.trim().slice(2)`), which corrupts paths for unstaged changes (e.g. `' M file.ts'` trimmed becomes `'M file.ts'` where offset 2 cuts into the filename).
- **INSTEAD DO**: Inspect fixed status columns directly on untrimmed lines (`line.slice(0, 2)`), slice from column 3 onwards (`line.slice(3).trim()`), and resolve rename/copy destination paths by splitting on `' -> '`.
