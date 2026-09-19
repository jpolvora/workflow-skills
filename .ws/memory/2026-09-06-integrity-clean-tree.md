### [2026-09-06] Regenerate integrity from a clean tree only

- **Layer**: harness
- **Module**: skill-integrity / ship checklist
- **Severity**: High
- **PathPattern**: `bin/skill-integrity.json`, `.agents/skills/ws-*/**`
- **Scenario / Context:** `verify-integrity` passed locally but failed on CI with a stale manifest after a refocus that removed skill-tree files.
- **DO NOT:** Trust a local `verify-integrity OK` when untracked files sit under `.agents/skills/` — the walker hashes on-disk bytes (not git state), so local-only files pollute the manifest and CI fails.
- **INSTEAD DO:** Move untracked skill-tree files aside, regenerate, verify, commit, then restore them; confirm the digest actually changed in the commit.
