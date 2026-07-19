# Stack Definition — workflow-skills

Human-readable companion to `.agents/skills/shared/config.json`.

> **Source of truth:** `.agents/skills/shared/config.json` — project identity, stack, verification commands, invariants. `tools.md` — canonical tool aliases.

## Project Stack (from config.json)

- **Backend:** Node 22 (JavaScript) — CLI + agent skills packaging
- **Frontend:** none (static catalog site under `docs/` via `bin/build-site.js`)
- **Database:** none
- **Domain:** Agent workflow skills hub (`spec-to-pr` and related pipeline skills)

## Code Paths (mutating steps)

| Layer | Path | Role |
|-------|------|------|
| **skills** | `.agents/skills` | Workflow and pipeline skill definitions (SKILL.md, scripts, docs) |
| **cli** | `bin` | Install/update CLI and site build |
| **tests** | `test` | Install and packaging verification |
| **docs site** | `docs` | Generated catalog (`index.html`) |
| **hub** | `AGENTS.md`, `README.md` | Skill routing and human docs |

**Note:** This repo has no traditional `src/` / `web/` app. Mutating steps stage skill paths under `.agents/skills/`, `bin/`, `test/`, `docs/`, and hub markdown as needed. This upstream may keep local authoring plans under `.cursor/plans/`; shipped skill defaults use `config.plans.dir` (`.agents/plans`) and do not require host-private folders.

**Dry-run / isolation:** Steps **4**, **6-fix**, and **7-fix** mutate skill/source paths only when implementing. Step **7** Testing is validation (read/execute checks).

## Validation Commands (from config.json)

| Layer | Tool alias | Config key | Command |
|-------|-----------|------------|---------|
| **Build** | `build-backend` | `verification.backendBuild` | `node bin/build-site.js` |
| **Test** | `test-backend` | `verification.backendTest` | `npm run tests -- --local` |

## Conventions

- All skill content and user-facing pipeline output: **English (en-us)**.
- `config.json` is gitignored; commit `config.json.example` only.
- Consumers install via `npx github:jpolvora/workflow-skills`; this repo is the canonical upstream.
- Runtime tokens: git tags/worktrees use prefix `uswf/`; plan slugs use `us-{id}` or feature slug.

## Issue trackers

- **GitHub:** enabled — `jpolvora/workflow-skills` via `gh`
- **Azure DevOps:** disabled by default

## STACK.md created

Auto-detected 2026-07-13 from `package.json` (Node 22), `bin/`, `.agents/skills/`, `test/`, `docs/`.
