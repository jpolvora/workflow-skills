### [2026-07-16] Promote Shared Installer Traps
- **Layer**: N/A
- **Module**: installer / test-install / self-learning
- **Severity**: High
- **Trap Avoided**: After promoting skills out of `shared/`, ignore patterns that only match `**/self-learning/memory` miss paths that *start* with `self-learning/memory` (Windows). `spawnSync` + `input: 'w\ny\n'` EOF after first interactive answer. Recreating `shared/self-learning/memory` after promotion breaks consumer memory preservation.
- **Solution**: Match ignore paths with optional leading separator so both nested and top-level memory dirs are skipped. Drive interactive installer tests with event-driven `spawn` writing on each "Select action" prompt. Keep memory at `.agents/skills/self-learning/memory/` via `copyDirPreservingConfig` / `migratePromotedSkills` — never mkdir the old nested path.
