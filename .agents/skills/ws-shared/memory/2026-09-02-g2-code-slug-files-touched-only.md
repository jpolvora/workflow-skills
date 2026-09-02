### [2026-09-02] G2-code must stage only this slug files_touched

- **Layer**: Harness
- **Module**: ws-spec-to-pr / G2-code staging
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-to-pr/**;.agents/skills/ws-shared/gates.md
- **Scenario / Context**: After Step 5 score 10, G2-code used `git diff --name-only HEAD -- .agents/skills` and committed dirty `ws-spec-memo` / memory-routing bodies that were leftover from a different prompt. CR-001 Warning: doctor JSON/ESM product rode in the same `feat({slug}): verified implementation` commit as an unrelated skill rewrite. Fable Scope Creep; verdict VERIFIED WITH CAVEATS.
- **DO NOT**: Stage every dirty path under `.agents/skills/` into a slug G2-code commit. Do not let leftover skill-body rewrites, catalog rows, or hub docs ride `files_touched` just because they were uncommitted.
- **INSTEAD DO**: Stage the union of this workflow `files_touched` still dirty, minus `{plansDir}`, secrets, gitignored, and `preExistingDirty`. Keep bump `version:` stamps and this slug’s product files only. Land unrelated dirty work in its own commit or leave it unstaged.
