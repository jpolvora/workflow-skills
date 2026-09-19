### [2026-08-27] Fix-PR resolution comments must describe the correction

- **Layer**: Harness
- **Module**: ws-fix-pr / resolve-thread
- **Severity**: High
- **PathPattern**: .agents/skills/ws-github-provider/scripts/resolve_thread.cjs, .agents/skills/ws-azure-devops-provider/scripts/fix_pr_azure_context.py, .agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md
- **Scenario / Context**: After the LLM model footer was added to thread-close comments, agents posted hash-only bodies (`Corrigido em {sha}` / `Fixed in {sha}` plus `LLM model: {id}`) with no description of the code change. Reviewers cannot tell what was actually fixed.
- **DO NOT**: Close a GitHub or Azure thread with only a commit hash and/or model footer. Do not treat `--model` as the comment body.
- **INSTEAD DO**: Pass a `--comment` / resolution note that states what changed (files + behavior) and why it resolves the thread, plus the commit when code changed. Both providers reject hash-only bodies before any remote mutation.
