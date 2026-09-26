### [2026-09-25] Memory trap files hold exactly one trap entry; the compiler merges multi-entry files

- **Layer**: tests
- **Module**: ws-self-learning (self_learning.cjs), memory authoring
- **Severity**: High
- **PathPattern**: .ws/memory/*.md
- **Scenario / Context**: `parseEntry` takes the FIRST `### [date]` heading as the title while `parseFields` walks the whole file with later labels overwriting earlier ones, and `compile` emits one block per file. A file with two traps compiles to title-of-first + body-of-last; the first trap's DO NOT/INSTEAD DO is silently dropped and the second is mislabeled (shipped once in PR #428 round 1, caught by review).
- **DO NOT**: Append a second `### [date]` trap to an existing memory file, or assume one file can carry a batch of traps.
- **INSTEAD DO**: Write one file per trap (one `###` heading each), then recompile and grep the compiled `MEMORY.md` for every new title plus its body before committing.
