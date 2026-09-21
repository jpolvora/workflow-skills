# Shared - Workflow Config & Consumer Data Hub

This is the project-local entrypoint for the shared hub (`.ws/`). The managed consumer hub contract lives in the skills install: [`{skillsRoot}/ws-shared/runtime/AGENTS.md`](../.agents/skills/ws-shared/runtime/AGENTS.md) (global fallback `{globalSkillsRoot}/ws-shared/runtime/AGENTS.md`).

Project-specific data stays at this directory root:

- `config.json`
- `STACK.md`
- installer metadata and local caches

`MEMORY.md` + `memory/*` and `CHANGELOG.md` live at their configured locations (`rules.memoryDir` / `rules.changelogFile`, both defaulting to the repo root); legacy copies under this directory remain as fallback when they hold entries.

Managed hub content (runtime contracts, schemas, scripts, stack packs, and setup seed templates) resolves from the project skills install (`{skillsRoot}/ws-shared/runtime/` and `{skillsRoot}/ws-shared/templates/`); a global/hybrid install falls back to `{globalSkillsRoot}/ws-shared/`. This hub never carries `runtime/` or `templates/` copies.

Generated hub-root `autoload.md` uses project-relative links into the skills install, while `ws-doctor` resolves the active local or global runtime before validating config and hub files.

Project-local configuration takes precedence over global configuration. Do not place credentials in `config.json`; use environment-variable references.

Source control: track non-secret `config.json` and a maintained `STACK.md`; ignore generated memory/history and installer metadata. The installed hub `.gitignore` reflects this default.
