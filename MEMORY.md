# Memory - Anti-Regression Knowledge

This file records learned traps, pitfalls, and constraints to prevent regression in future sessions.

### [2026-07-12] Workflow Portability & Language Compliance
- **Trap Avoided**: Using Portuguese words, date patterns (like `AAAA-MM-DD`), or project-specific hardcoded values (like `Matrix` solution paths and namespaces) in core pipeline orchestrators and their dependencies (like `us-workflow` scripts and downstream skills). This violates the en-us repository mandate and breaks porting/consumption of the harness in other projects.
- **Solution**: All scripts, print outputs, markdown templates, and command structures must be in English. Project-specific variables (like solution names, namespace patterns, and test suites) must be abstracted dynamically from `config.json` or `stack.md` options rather than hardcoded in the scripts/skills.
