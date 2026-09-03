---
name: ws-spec-update
description: Feature spec updater — updates feature specifications after prompt-driven code changes to prevent spec drift, with optional self-learning memory recording.
version: 0.3.57
invocation_names:
  - spec-update
  - ws-spec-update
---

# ws-spec-update

> When this skill is loaded, output "ws-spec-update loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Keep feature specifications (`*.spec.md`) continuously synchronized with real implemented code after prompts, adjustments, or task completions.

**Specs family:** Role = surgical **body** updates when code drifts from AC text. Resolve the spec of record with `node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug {slug}` (unprefixed or `NNNN-{slug}.spec.md`); if a workflow `step-00` copy exists and still matters, keep them aligned or re-register. **Not** `ws-spec-index sync` (index checkboxes vs delivery evidence). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

## Purpose

When code changes occur days or weeks after initial spec delivery (e.g. prompt: "adjust business logic in controller X"), existing feature specs become out-of-sync. This skill identifies affected specs, analyzes drift between spec requirements and implemented code, proposes surgical updates, and writes approved changes.

## Invocation

Standalone / Manual:
```text
/spec-update [target-spec-or-component]
/ws-spec-update [target-spec-or-component]
```

Completion Gate / Auto-run:
Run after task completion (alongside `ws-changelog` and `ws-self-learning`).

## Steps

1. **Identify Delta Scope**:
   - Inspect `git status` / `git diff HEAD` (or recent turn prompt context) to determine modified files, classes, routes, views, controllers, or business logic.
   - **Done when:** `git diff --name-status` (or equivalent) listed and mapped to symbols/components.

2. **Discover Target Spec(s)**:
   - Resolve `{specsDir}` ← `config.json` → `plans.specsDir` (default `.agents/specs`) and `{plansDir}` ← `plans.dir`.
   - Search `{specsDir}/**/*.spec.md`, `{specsDir}/index.PRD`, and `{plansDir}/**/step-00-*.spec.md` for candidate specs.
   - Match modified code filenames, component names, API endpoints, or domain concepts against spec text.
   - If no spec is found, report: `"No existing spec found for modified feature."` (optionally suggest `ws-spec-write`).
   - **Done when:** Target spec file path(s) are selected or confirmed.

3. **Analyze Spec Drift & Draft Updates**:
   - Compare original spec requirements and acceptance criteria against actual implemented code logic.
   - Formulate surgical in-place edits for updated sections (e.g., Business Logic, Acceptance Criteria, API / Parameters, Data Flow).
   - Prepare a **Revision History** entry to append at the bottom of the spec (`### [YYYY-MM-DD] Revision: {brief summary of change} (Prompt: "{summarized prompt}")`).
   - **Done when:** Surgical text diff and revision entry are generated.

4. **Propose & Confirm (User Gate)**:
   - Present the proposed spec modifications and diff summary to the user in chat.
   - Prompt the user for approval before writing changes to disk.
   - **Done when:** User approves the proposed spec updates.

5. **Apply Updates & Report**:
   - Apply surgical replacements to the target spec file(s) and append the revision history log.
   - Display a summary of updated files and sections to the user.
   - **Done when:** Spec file(s) on disk contain the approved edits and a new Revision History line dated today.

6. **Self-Learning Memory Hook (AC11)**:
   - Assess the root cause of the spec update:
     - **Correction / fix that ACs missed:** write a `ws-self-learning` memory entry documenting the missed requirement, formatted with explicit `DO NOT` and `INSTEAD DO` directives, append to `{sharedDir}/memory/`, and run memory compilation.
     - **Wording-only / alignment edit:** skip memory recording and explicitly report: `"Self-learning memory skipped: wording-only alignment."`
   - **Done when:** Memory entry recorded and compiled, or skip reason explicitly reported.

