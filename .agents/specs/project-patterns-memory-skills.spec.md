---
id: null
slug: project-patterns-memory-skills
title: "Project Patterns Memory Skills (ws-patterns-backend & ws-patterns-frontend)"
source: local
specDate: 2026-08-11
status: completed
---

# Specification — Project Patterns Memory Skills (ws-patterns-backend & ws-patterns-frontend)

## Description

Modern development teams and repositories enforce specific design, architectural, UI/UX, and coding conventions across frontend and backend layers. Examples include:
- **Frontend**: Validation error messages must always be displayed in red below the input component; all user-facing UI labels must use i18n localization keys instead of hardcoded strings; dropdown fields bound to foreign-key backend models must use searchable auto-complete with backend pagination and filtering.
- **Backend**: Entity validation rules, response wrappers, DTO mapping structures, global query filters for tenancy, and error response formatting must follow project-specific patterns.

To prevent agent drift, avoid repeating past mistakes, and continuously capture project preferences as work progresses, this feature introduces two autoloadable, persistent memory skills: `ws-patterns-backend` and `ws-patterns-frontend`.

### Solution Overview

1. **New Skills (`ws-patterns-backend` & `ws-patterns-frontend`)**:
   - `ws-patterns-backend` (`.agents/skills/ws-patterns-backend/SKILL.md`): Consults `{sharedDir}/backend.md` prior to backend implementations and reviews. Prompts the user after implementations or user corrections to register newly observed backend preferences/learnings.
   - `ws-patterns-frontend` (`.agents/skills/ws-patterns-frontend/SKILL.md`): Consults `{sharedDir}/frontend.md` prior to frontend UI implementations and reviews. Prompts the user after implementations or user corrections to register newly observed frontend UI/UX preferences/learnings.

2. **Consumer-Owned Storage (`backend.md` & `frontend.md`)**:
   - Stored in `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` (project-local `.agents/skills/ws-shared/`).
   - Consumer-owned files: seeded from hub templates (`backend.md.template` and `frontend.md.template`) on fresh install, never overwritten during updates.

3. **Autoload & Configuration (`ws-configure-project` & `autoload.md`)**:
   - Integrated into `{sharedDir}/autoload.md` § Always-applied skills table (configurable for backend, frontend, or both).
   - `ws-configure-project` extended with `--section patterns` (and via `--section autoload`) to interview the user and configure active pattern tracking in `config.json` (`defaults.patternsBackend`, `defaults.patternsFrontend`) and sync `autoload.md` / root `AGENTS.md`.

4. **Workflow Execution & Feedback Loop**:
   - During implementation (`ws-implement-tasks`, `ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-code-review`), agents must load and consult `backend.md` / `frontend.md` before generating code.
   - Following task execution—especially when the user submits UI or backend corrections—the agent initiates a `user-gate` prompt:
     `Deseja registrar esta preferência no padrão [backend|frontend]? ("<descrição da preferência>")`
   - Confirmed preferences are formatted and appended to `{sharedDir}/backend.md` or `{sharedDir}/frontend.md`.

## Acceptance Criteria

- **AC1**: `ws-patterns-backend` skill created at `.agents/skills/ws-patterns-backend/SKILL.md` with trigger conditions, entry gates, consultation rules, and post-implementation learning recording rules.
- **AC2**: `ws-patterns-frontend` skill created at `.agents/skills/ws-patterns-frontend/SKILL.md` with trigger conditions, entry gates, consultation rules, and post-implementation learning recording rules.
- **AC3**: Hub templates `backend.md.template` and `frontend.md.template` created under `.agents/skills/ws-shared/`, registered in `bin/install-rules.js` (`HUB_WHITELIST` and `CONSUMER_OWNED_HUB_FILES`) so fresh installs seed empty consumer files.
- **AC4**: `ws-shared/autoload.md` updated to list `ws-patterns-backend` and `ws-patterns-frontend` in the Always-applied table, pointing to respective memory files.
- **AC5**: `ws-configure-project` (and helper `configure_autoload.py`) updated to support pattern configuration (`defaults.patternsBackend` & `defaults.patternsFrontend`), allowing selection of active pattern skills and updating `autoload.md` and root `AGENTS.md`.
- **AC6**: Interactive user feedback loop defined: after code generation or when user makes UI/backend corrections, the agent prompts via `user-gate` to record learned preferences into `{sharedDir}/backend.md` or `{sharedDir}/frontend.md`.
- **AC7**: `bin/skill-dependencies.json` updated to register both skills in `workflows` and `full` packages, along with orchestrator dependency links.
- **AC8**: Integrity checksums updated (`npm run generate-integrity`) and verified via `ws-check-harness` with zero critical errors.

## Notes & Design Constraints

- Files `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` must be consumer-owned, plain Markdown, human-readable, and append-only.
- All skill prompts and user-gate texts must follow en-us language rules for harness neutrality while allowing localized user interaction in responses when requested by user.
