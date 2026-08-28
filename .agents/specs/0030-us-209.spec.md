---
id: 209
slug: us-209
title: "ws-check-harness: PT-BR user-gate prompts in ws-patterns-* + autoload Always-applied vs task triggers"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/209"
specDate: 2026-08-15
---

# Specification — ws-check-harness: PT-BR user-gate prompts in ws-patterns-* + autoload Always-applied vs task triggers

**State:** open

## Description

## Summary

Consumer `ws-check-harness` run on 2026-08-15 (MarchanteERP, Install mode: consumer, hybrid `{skillsRoot}` + `{globalSkillsRoot}`, skills `0.3.18`) flagged **upstream-owned** debt. Consumer-only items (gitignore, product skills, stale local `skill-dependencies.json` at 0.3.17) are **not** in scope here — upstream `main` already has `packageVersion` 0.3.18.

No open duplicate found.

## 1. Language (en-us) — `ws-patterns-backend` / `ws-patterns-frontend` user-gate prompts

**Severity:** warning (Phase 5 language AC: skill bodies, prompts, and generated artifact structures must be en-us; no PT-BR).

**Evidence (upstream `main`):**

`ws-patterns-backend/SKILL.md` (~L27, L41):

```text
Deseja registrar esta preferência no padrão backend? ("<description>")
```

`ws-patterns-frontend/SKILL.md` (~L27, L45): same prompt with `frontend`.

Options on the same gate are already English (`Yes (Register preference)` / `No (Skip)`), so the question string is the only PT-BR leak.

**Proposed correction:**

Replace with en-us, e.g.:

- Backend: `Register this preference in backend.md? ("<short summary of preference>")`
- Frontend: `Register this preference in frontend.md? ("<short summary of preference>")`

Keep the Yes/No options. Do not localize skill instruction text to the consumer UI language; consumers can still write `backend.md` / `frontend.md` entries in their language.

## 2. `autoload.md` Always-applied membership vs Trigger column (`ws-patterns-*`)

**Severity:** suggestion (Phase 5c.1 — ambiguous auto-load).

**Evidence (upstream `{sharedDir}/autoload.md`):**

- Section header: load Always-applied skills **every prompt** (unless opted out).
- Table Trigger for `ws-patterns-backend` / `ws-patterns-frontend`: **Backend tasks** / **Frontend tasks** only.

Agents can either load the skill bodies every session (context cost) or consult `backend.md`/`frontend.md` only on matching tasks. The header and the Trigger column disagree.

**Proposed correction (pick one and make both places match):**

- **A (recommended):** Keep them in the Always-applied *set* (precedence table) but state explicitly: load SKILL.md every prompt when autoload is on; **consult** `{sharedDir}/backend.md` / `frontend.md` only when the current task is backend/frontend.
- **B:** Move `ws-patterns-*` out of Always-applied into on-demand / task-router only (shared hub already lists them in Promoted + Task router).

## Out of scope (considered, not requested as a fix)

- Retired opt-out phrase `sem ws-gabarito` in `ws-tdah` / hub `AGENTS.md` — user-typed alias; keep unless you want a purely en-us alias table with a LEGACY note.
- Hybrid Markdown `../ws-*/SKILL.md` from project `ws-shared/` when skills live only under `{globalSkillsRoot}` — check-harness treats existence via hybrid resolve as OK.
- Consumer `skill-dependencies.json` still at 0.3.17 while global skills are 0.3.18 — local `update`, not an upstream packaging bug (`main` is already 0.3.18).

## Acceptance

- [ ] Patterns user-gate question strings are en-us (no PT-BR in those SKILL.md files).
- [ ] `autoload.md` Always-applied header and `ws-patterns-*` Trigger/consult wording are consistent.
- [ ] `ws-check-harness` Phase 5 language scan on those files is clean.

**Source:** consumer harness audit 2026-08-15, Phase 5 / 5c.1, items recorded as Upstream debt.

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
