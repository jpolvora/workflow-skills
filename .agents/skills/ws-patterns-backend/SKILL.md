---



name: ws-patterns-backend
version: 0.3.11
description: Backend patterns & architectural preferences engine — consults backend.md before backend tasks and records learned backend conventions after implementation or user corrections.
invocation_names:
  - ws-patterns-backend
  - patterns-backend
---

# Backend Patterns (`ws-patterns-backend`)

> When this skill is loaded, output "ws-patterns-backend loaded."

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md).

**Bidirectional pattern engine** — `{sharedDir}/backend.md` is both input (consult before backend tasks) and output (record learned preferences after work or user corrections).

Expand path tokens first ([`tools.md`](../ws-shared/tools.md) § Path tokens): `{sharedDir}` → `.agents/skills/ws-shared`.

Consumer-owned backend patterns live in `{sharedDir}/backend.md` (never overwritten by install/update).

## When to run

| Moment | Action |
|--------|--------|
| **Before backend code / feature / review** | **Consult:** Read `{sharedDir}/backend.md` for backend rules, entity validations, DTO conventions, query standards, and response formats. Enforce matching patterns strictly. |
| **After implementation or user correction** | **Record:** If a new backend pattern, architectural preference, or user correction was identified, prompt the user via `user-gate`: `Deseja registrar esta preferência no padrão backend? ("<description>")`. On approval, append the entry to `{sharedDir}/backend.md`. |
| **No new pattern identified** | Proof line: `Backend Patterns: Consulted ({sharedDir}/backend.md)` |

## Consult protocol (Mandatory before backend code)

1. Read `{sharedDir}/backend.md` (if missing, seed from `{sharedDir}/backend.md.template` or create header).
2. Check for matching categories: API response wrappers, DTO structures, database foreign-key queries, ORM usage, entity validation rules, global query filters.
3. Apply active rules directly to the backend implementation.

## Record protocol (Post-implementation / User correction)

When completing backend tasks or receiving backend corrections from the user:
1. Identify if a new backend preference/rule was established (e.g. "Always validate DTOs with FluentValidation", "Prefer paginated autocomplete for FK selects", "Use global query filters for tenancy").
2. Prompt the user via `user-gate`:
   - **Question**: `Deseja registrar esta preferência no padrão backend? ("<short summary of preference>")`
   - **Options**: `Yes (Register preference)` / `No (Skip)`
3. If approved, append to `{sharedDir}/backend.md`:
   ```markdown
   #### [YYYY-MM-DD] <Category / Rule Title>
   - **Rule**: <Short summary of requirement>
   - **Context/Rationale**: <Why this preference was established>
   - **Example / Code Pattern**: <Code snippet or standard pattern>
   ```

## Done when

- Pre-work: `{sharedDir}/backend.md` read and applied to backend edits.
- Completion: User prompted via `user-gate` if new preference identified, and entry appended to `{sharedDir}/backend.md` if approved; or proof line `Backend Patterns: Consulted`.
