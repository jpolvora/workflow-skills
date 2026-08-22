### [2026-08-22] MEMORY compile must keep heading separators and scenario backticks
- **Layer**: `Harness`
- **Module**: `ws-self-learning / self_learning.cjs`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-self-learning/scripts/self_learning.cjs, .agents/skills/ws-shared/MEMORY.md, test/test-memory-formatting.js`
- **Scenario / Context**: Compiling `{sharedDir}/memory/*` with `self_learning.cjs --compile` after a Node port
- **DO NOT**: `.filter(Boolean)` away empty spacers before `###`, join header `---` directly onto the first heading, or strip wrapping backticks from Scenario / DO NOT / INSTEAD DO values
- **INSTEAD DO**: Write `${header}\n\n${blocks.join('\n\n')}\n`; unwrap ticks only on Layer/Module/Severity/PathPattern; assert `---\n\n###` and scenario backtick fidelity in `test-memory-formatting.js`
