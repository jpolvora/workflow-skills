# Implementation Plan — us-209

**Slug:** us-209  
**Workflow:** lite · autoMode · fullMode  
**Branch:** feature/us-209 → main

## Goal

Fix en-us language leaks in `ws-patterns-*` user-gate prompts and align `autoload.md` Always-applied header with ws-patterns Trigger/consult wording (option A).

## Tasks

### 1. `ws-patterns-backend/SKILL.md`

Replace PT-BR user-gate strings (table row ~L27, Record protocol ~L41):

- `Register this preference in backend.md? ("<short summary of preference>")`
- Keep `Yes (Register preference)` / `No (Skip)` options unchanged.

Grep file for remaining PT-BR / Portuguese.

### 2. `ws-patterns-frontend/SKILL.md`

Same replacement with `frontend.md`.

### 3. `ws-shared/autoload.md` (option A)

- Clarify Always-applied header: load listed SKILL.md every prompt when autoload is on.
- Update `ws-patterns-backend` / `ws-patterns-frontend` Trigger column: load SKILL.md every prompt; **consult** `{sharedDir}/backend.md` / `frontend.md` only on backend/frontend tasks.
- Align precedence note (§ Precedence among Always-applied) if Trigger wording referenced there.

### 4. Hub drift check

Update root `AGENTS.md` / `ws-shared/AGENTS.md` only if duplicate Trigger wording would drift (catalog rows are task-router, not autoload — likely no change).

## Verification

- `npm run test` (exit 0)
- `npm run generate-integrity && npm run verify-integrity` (hashed skill content changed)
- `npm run build-site:bump` (package ship)
- Grep patterns skills + autoload for PT-BR
- Harness Phase 5 language scan if runnable

## Out of scope

`sem ws-gabarito` alias, hybrid markdown existence, consumer skill-dependencies.json 0.3.17.
