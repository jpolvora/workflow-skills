---
name: ws-patterns
version: 0.3.33
description: Project patterns engine — consults backend.md or frontend.md by task layer and records learned conventions after implementation or user corrections.
invocation_names:
  - ws-patterns
  - patterns
---

# Project Patterns (`ws-patterns`)

> When this skill is loaded, output "ws-patterns loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

**Bidirectional pattern engine** — `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` are both input (consult before matching-layer tasks) and output (record learned preferences after work or user corrections).

Expand path tokens first ([`tools.md`](../ws-shared/tools.md) § Path tokens): `{sharedDir}` → `.agents/skills/ws-shared`.

Consumer-owned files stay at `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` (never overwritten by install/update). Choose the file by **task layer**, not by skill id.

## When to run

| Moment | Action |
|--------|--------|
| **Before backend code / feature / review** | **Consult:** Read `{sharedDir}/backend.md` for backend rules, entity validations, DTO conventions, query standards, and response formats. Enforce matching patterns strictly. |
| **Before frontend code / UI component / review** | **Consult:** Read `{sharedDir}/frontend.md` for UI/UX rules, validation styling, i18n requirements, form components, and dropdown behavior. Enforce matching patterns strictly. |
| **After implementation or user correction** | **Record:** If a new pattern or user correction was identified for that layer, prompt via `user-gate`: `Register this preference in the {backend\|frontend} patterns file? ("<summary>")`. On approval, append the entry to the matching file. |
| **No new pattern identified** | Proof line: `Patterns: Consulted ({sharedDir}/backend.md)` and/or `Patterns: Consulted ({sharedDir}/frontend.md)` for layers actually read |

A mixed task consults **both** files. Do not consult the other layer's file on a single-layer task.

## Consult protocol (Mandatory before matching-layer code)

1. Read `{sharedDir}/backend.md` and/or `{sharedDir}/frontend.md` for the layers in play (if missing, seed from the matching `.template` or create a header).
2. Check matching categories:
   - **Backend:** API response wrappers, DTO structures, database foreign-key queries, ORM usage, entity validation rules, global query filters.
   - **Frontend:** form validation (messages in red below the component), localization (i18n keys, not hardcoded strings), dropdowns / FK selects (searchable auto-complete with backend pagination), styling / layout (tokens, dark mode).
3. Apply active rules directly to the implementation.

## Record protocol (Post-implementation / User correction)

When completing a matching-layer task or receiving a user correction:

1. Identify whether a new preference/rule was established.
2. Prompt via `user-gate`:
   - **Question**: `Register this preference in the {backend|frontend} patterns file? ("<short summary of preference>")`
   - **Options**: `Yes (Register preference)` / `No (Skip)`
3. If approved, append to `{sharedDir}/backend.md` or `{sharedDir}/frontend.md`:
   ```markdown
   #### [YYYY-MM-DD] <Category / Rule Title>
   - **Rule**: <Short summary of requirement>
   - **Context/Rationale**: <Why this preference was established>
   - **Example / Pattern**: <Code snippet, UI pattern, or standard shape>
   ```

## Done when

- Pre-work: matching pattern file(s) read and applied to the edits for that layer.
- Completion: User prompted via `user-gate` if a new preference was identified, and the entry appended if approved; or proof line `Patterns: Consulted`.

## Subagent contract

- Read the configured pattern file for the layer before changing matching paths.
- Enforce only rules whose path or component context matches the assignment.
- Do not invent a project preference when the pattern file is silent.
- Ask before persisting a newly inferred convention.
- Return `pattern_consult` with the source path(s) and matched rules.
