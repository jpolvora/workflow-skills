---
id: null
slug: hybrid-global-local-config
title: "Hybrid global/local skills with project-local ws-shared config"
source: local
specDate: 2026-08-01
---

# Specification — Hybrid global/local skills with project-local ws-shared config

## Description

Enable a **hybrid install mode** so consumers can run workflow-skills from either a **global** skills tree or a **project-local** skills tree, while always reading **project-specific** configuration from the most specific `ws-shared` hub available for the current working repository.

### Target lifecycle (verified intent)

1. **Upstream** develops skills under `src/ws-*` (this repo), tests, updates assets, and publishes on GitHub.
2. A **consumer** installs skills onto their machine:
   - **Global:** `$HOME/.agents/skills/ws-*` (and hub templates under `$HOME/.agents/skills/ws-shared/` as install scaffolding only), **or**
   - **Project-local:** `$HOME/projects/myproject/.agents/skills/ws-*`.
3. The consumer opens a project directory that may have **no** local config yet. The agent can discover global `ws-*` skills, but project settings are missing.
4. The user runs **`ws-configure-project`**. Configuration is written to the **project** hub:
   - `$HOME/projects/myproject/.agents/skills/ws-shared/` (`config.json`, `STACK.md`, `MEMORY.md`, etc.).
5. After that, the agent uses **globally installed** skill bodies (`$HOME/.agents/skills/ws-*`) while applying **local project** config from that project’s `ws-shared`.
6. Another project may instead install skills **into** its own `.agents/skills/` tree. In that case `ws-configure-project` still writes to that project’s `.agents/skills/ws-shared/`, and skill bodies resolve from the project-local tree.

### Problem today

Path tokens and many managed scripts assume a **co-located** layout: `{skillsRoot}` and `{sharedDir}` live under the same tree, and scripts often derive “repo root” from `__file__` (`parents[4]`). When skill scripts run from `$HOME/.agents/skills/...`, they resolve config to the **global** hub (or the wrong root), not `cwd`’s project `.agents/skills/ws-shared/config.json`. Hybrid mode therefore fails for orch script recipes even when the host can load global `SKILL.md` files.

### Goal

Skills and scripts must be smart enough to:

1. Locate skill bodies from the active install (global **or** project-local).
2. Locate `ws-shared` / `config.json` with a **specificity ladder** (most specific wins), overridable by explicit config/env.
3. Keep consumer-owned data (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, optional `CHANGELOG.md`) project-local and never overwritten by global install/update of skill packages.

### Recommended approach

1. **Define hybrid resolution** in `ws-shared/tools.md` + `config-resolution.md` (and schema comments):
   - `{sharedDir}` / config resolve from the **project working tree first**.
   - `{skillsRoot}` may be global or project-local independently of `{sharedDir}` when hybrid is active.
2. **Canonical specificity order** for `ws-shared` (first existing wins unless overridden):
   1. Explicit override (`WORKFLOW_SKILLS_SHARED_DIR` or `pathTokens.sharedDir` when set to an absolute/override path — document precedence).
   2. `$PWD/.agents/skills/ws-shared` (project-local; **most specific** default for consumer data).
   3. `$HOME/.agents/skills/ws-shared` (global hub templates / fallback only when no project hub exists — bootstrap may create project hub via `ws-configure-project`).
3. **Skills root resolution** (for scripts and `{skillsRoot}` expansion):
   1. Explicit override (`WORKFLOW_SKILLS_GLOBAL_DIR` / `pathTokens.skillsRoot` when intentionally pointing at global or project).
   2. If `$PWD/.agents/skills/<skill-id>/SKILL.md` exists → use project-local `{skillsRoot}`.
   3. Else if `$HOME/.agents/skills/<skill-id>/SKILL.md` (or `WORKFLOW_SKILLS_GLOBAL_DIR`) exists → use global `{skillsRoot}`.
   4. Else fail with an actionable message (install global or project-local).
4. **Fix managed scripts** that use `__file__`-relative repo roots: resolve **project root from `cwd` (or git toplevel)**, always read config from the resolved project `{sharedDir}`, and invoke sibling skill scripts via the resolved `{skillsRoot}` (global or local). Fix legacy `.agents/skills/shared` paths to `ws-shared`.
5. **`ws-configure-project`**: always write consumer config into **`$PWD/.agents/skills/ws-shared/`** (create hub if missing), never into the global hub as the primary write target when cwd is a project repo.
6. **Docs** (README + hubs): document global install, project install, hybrid mode, override env vars, and migration notes for existing global-only users.
7. **Tests**: cover (a) project-local only, (b) global skills + project `ws-shared`, (c) override env, (d) script config path does not use global placeholders when project config exists.

## Acceptance Criteria

- AC1: Documented hybrid mode states that skill bodies may live under `$HOME/.agents/skills/ws-*` while project consumer data lives under `$PWD/.agents/skills/ws-shared/`.
- AC2: `ws-configure-project` run from a project directory with no local hub creates and writes `config.json` (and companion files as today) under `$PWD/.agents/skills/ws-shared/`, not under `$HOME/.agents/skills/ws-shared/` as the primary target.
- AC3: With skills installed only globally and a filled project `.agents/skills/ws-shared/config.json`, orch/script recipes that need config read the **project** `config.json` (project name, `plans.dir`, `providers`, verification commands), not the global hub’s placeholder/example values.
- AC4: With skills installed only under the project `.agents/skills/ws-*`, the same workflows resolve skill scripts and `ws-shared` from that project tree (non-hybrid local install still works).
- AC5: Shared path resolution follows a documented specificity ladder (explicit override → project `.agents/skills/ws-shared` → global `ws-shared` fallback), and the ladder is described in `tools.md` and/or `config-resolution.md`.
- AC6: Skills-root resolution follows a documented ladder (explicit override → project skills if present → global skills), so `{skillsRoot}` expansion and script launchers find `ws-*` skill folders in hybrid mode.
- AC7: Managed scripts that previously derived repo root from `__file__` (`parents[N]`) no longer bind config to the global install path when cwd is a consumer project; they use cwd/git-toplevel + resolved `{sharedDir}`.
- AC8: Legacy config path `.agents/skills/shared/config.json` in provider/local-spec scripts is corrected to `.agents/skills/ws-shared/config.json` (or to the resolved `{sharedDir}`).
- AC9: Environment (or config) overrides exist for shared hub and/or skills root (at minimum documenting `WORKFLOW_SKILLS_GLOBAL_DIR` and a shared-dir override, or equivalent `pathTokens` absolute override) and tests prove override wins over defaults.
- AC10: Global install/update of skill packages does not overwrite consumer-owned files under a **project** `.agents/skills/ws-shared/` (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, optional `CHANGELOG.md`).
- AC11: README (and hub install notes as needed) document both install scopes (global vs project) and the hybrid “global skills + local config” workflow, including the `ws-configure-project` step after first clone/open of a project.
- AC12: Automated tests cover at least: project-local install; hybrid (global skills + project config); missing project config prompts/configure path; and one script entrypoint proving project config is loaded when cwd is the project.
- AC13: Out-of-scope items in Notes are not implemented by this feature (no requirement to finish `npx skills`-only migration or `src/ws-*` rename in this spec unless already landed).

## Notes

### In scope

- Hybrid resolution contract for `{skillsRoot}` vs `{sharedDir}`.
- Script and skill path fixes so global skill bodies + project `ws-shared` work.
- `ws-configure-project` write target = project hub.
- Docs + tests for global, project-local, and hybrid layouts.
- Specificity / override rules for the most specific `ws-shared`.

### Out of scope (explicit)

- Completing the separate “npx skills installer only” / `src/ws-*` SoT migration (tracked elsewhere); this spec assumes published skills are installable globally or locally by whatever installer is current.
- Requiring every consumer to use hybrid mode (project-local-only remains valid).
- Storing per-project secrets in the global hub.
- Host-product-specific skill discovery APIs (stay harness-neutral; document portable paths/env only).

### Design constraints

- Prefer **most specific wins**: project `ws-shared` always beats global `ws-shared` for consumer data when both exist.
- Global `ws-shared` may hold install templates only; it is not the source of truth for a project’s `config.json` after configure.
- Do not hardcode host IDE names in skill bodies; use path tokens and env overrides.
- Keep dual install scopes (global | project) without a long-lived dual-config shim that reads both files and merges silently — resolve one active `{sharedDir}` per rules above.
- Upstream authoring SoT remains under this repo’s `src/` skill tree; consumer runtime paths remain `.agents/skills` (project) or `$HOME/.agents/skills` (global).

### Related

- Prior investigation: hybrid global skills + local config fails today because scripts/`{skillsRoot}` assume co-location.
- Orthogonal spec: `npx-skills-installer-only` (installer surface / SoT layout) — do not conflate AC sets.
