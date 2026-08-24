### [2026-08-23] Memory compile must fail closed and stay on the Node SoT
- **Layer**: Harness
- **Module**: ws-self-learning / self_learning.cjs
- **Severity**: High
- **PathPattern**: .agents/skills/ws-self-learning/scripts/self_learning.cjs, .agents/skills/ws-self-learning/scripts/self_learning.py, test/test-memory-formatting.js
- **Scenario / Context**: Compiling `{sharedDir}/memory/*` after writing a new trap, or spawning the leftover Python path
- **DO NOT**: Keep a second Python parser; silently drop or stub entries that lack `### [YYYY-MM-DD]` / DO NOT / INSTEAD DO; compile in the same parallel tool batch as the Write of the memory file; compile the live hub from `test-memory-formatting.js`
- **INSTEAD DO**: Parse labels as both `**Name**:` and `**Name:**`; refuse to rewrite MEMORY.md when any file is invalid; exec the Node SoT from `self_learning.py`; Write then compile sequentially; isolate compiler tests with `--repo-root`
