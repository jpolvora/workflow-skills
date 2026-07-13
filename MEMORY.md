# Memory - Anti-Regression Knowledge

This file records learned traps, pitfalls, and constraints to prevent regression in future sessions.

### [2026-07-12] AskQuestion must be FORCE-invoked at gates
- **Trap Avoided**: Agents “decide” AskQuestion is unavailable and print markdown menus without calling the tool — gates become free-text and HS-1/cancel semantics break.
- **Solution**: Probe exposure, always invoke `AskQuestion` in normal mode, log `askquestion-exposed` / `askquestion-unavailable`, markdown fallback only after explicit invoke failure. Ship `.cursor/rules/ask-question-gates.mdc` (from `spec-to-pr/cursor-rules/`) for alwaysApply in consumers.

### [2026-07-12] validate_state REPO_ROOT depth
- **Trap Avoided**: `Path(__file__).resolve().parents[3]` from `spec-to-pr/scripts/` points at `.agents`, not the repo root — plans/artifacts resolve under the wrong tree.
- **Solution**: Use `parents[4]` (`scripts` → `spec-to-pr` → `skills` → `.agents` → repo root).

### [2026-07-12] Orchestrator rename `us-workflow` → `spec-to-pr`
- **Trap Avoided**: Leaving consumer installs on the old folder name `us-workflow` after upstream rename — `update` matches by identical folder name, so orchestrator would stop receiving updates.
- **Solution**: CLI `SKILL_RENAMES` migrates `us-workflow` → `spec-to-pr` and preserves `config.json`. Keep legacy invoke aliases and runtime tokens `uswf/` / `us-{id}` — do not rename those.

### [2026-07-12] Workflow Portability & Language Compliance
- **Trap Avoided**: Using Portuguese words, date patterns (like `AAAA-MM-DD`), or project-specific hardcoded values (like `Matrix` solution paths and namespaces) in core pipeline orchestrators and their dependencies (like `spec-to-pr` scripts and downstream skills). This violates the en-us repository mandate and breaks porting/consumption of the harness in other projects.
- **Solution**: All scripts, print outputs, markdown templates, and command structures must be in English. Project-specific variables (like solution names, namespace patterns, and test suites) must be abstracted dynamically from `config.json` or `stack.md` options rather than hardcoded in the scripts/skills.

### [2026-07-13] Provider skills need update --include-new
- **Trap Avoided**: Assuming plain `npx github:jpolvora/workflow-skills update` installs new top-level skill folders (`github-provider`, `azure-devops-provider`, `local-spec-provider`). CLI only refreshes skills already present locally.
- **Solution**: Consumers must run `update --include-new` (or interactive install) after upstream adds provider skills. Keep AC9 converter shims at `spec-to-pr/scripts/{github-issue,ado-workitem}-to-spec.py` so install canonicity asserts keep passing.
