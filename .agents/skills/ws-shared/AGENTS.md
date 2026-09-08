# Shared — Workflow Config & Consumer Data Hub

This is the project-local entrypoint for the shared hub. The managed consumer hub contract is in [`runtime/AGENTS.md`](runtime/AGENTS.md).

Project-specific data stays at this directory root:

- `config.json`
- `STACK.md`
- `MEMORY.md` and `memory/*`
- `CHANGELOG.md`
- installer metadata and local caches

Managed runtime files are under [`runtime/`](runtime/), and setup-only seed files are under [`templates/`](templates/). A global-hybrid install may contain only this entrypoint and consumer-owned configuration; its managed runtime is resolved from `{globalSkillsRoot}/ws-shared/runtime/`.

Generated hub-root `autoload.md` uses root-relative links, while `ws-doctor` resolves the active local or global runtime before validating config and hub files.

Project-local configuration takes precedence over global configuration. Do not place credentials in `config.json`; use environment-variable references.

Source control: track non-secret `config.json` and a maintained `STACK.md`; ignore generated memory/history, managed `runtime/` and `templates/`, and installer metadata. The installed hub `.gitignore` reflects this default.
