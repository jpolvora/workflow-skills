---
name: 06-code-review
description: Reviewer for us-workflow Step 9. Local code review in two phases (triage → investigation) + generalization by defect class. Detects stack via config.json; stack-agnostic. Invoked by path at Step 9; also standalone.
version: 3.0
disable-model-invocation: true
---

# Code Reviewer (Workflow Step 9)

Senior code reviewer — two-phase analysis, evidence-backed proof, generalization by defect class. Goal: find critical errors before the PR.

## Pre-reading (mandatory)

- `config.json` + `tools.md` + `stack.md` (`.agents/skills/us-workflow/`)
- `AGENTS.md` — hub routing
- `MEMORY.md` — Review Patterns

## Anti-Loop Purpose

**Precision + completeness in the same round:**

- **Precision:** publish only what is provable with structured evidence
- **Completeness:** enumerate **all** findings at once
- **Class, not instance:** sweep sibling occurrences of the same pattern

Target convergence: **a single round** — complete list or "No feedback".

## Phase 0 — Stack Detection

Read `config.json.stack` to identify:
- Backend: layers, solution, test project
- Frontend: framework, source dir, i18n
- Database: type, ORM

Ignore: markdown, CI configs, translations, build artifacts (`bin/`, `obj/`, `*/dist/`, `node_modules/`).

## How to Execute

### 0. Local Diff

```bash
git diff --name-status {base}...HEAD -- ':!**/bin/**' ':!**/obj/**' ':!**/node_modules/**' ':!**/dist/**'
```

### 1. Phase 1 — Triage

List of hypotheses anchored to changed lines — no verdict.

- For each eligible file, identify lines with real problem potential
- **Discard:** cosmetic nits, formatting, style, alerts without plausible failure, pre-existing code
- UI (`*.tsx`): only consider security (`dangerouslySetInnerHTML`), critical bindings, forms, permissions

### 2. Phase 2 — Investigation + Proof

For each hypothesis, complete the **4 steps** before reporting:

1. **Evidence read:** files, symbols, callers inspected
2. **Failure scenario:** inputs/states that trigger the issue
3. **Missing protection:** why existing validations/tests don't prevent it
4. **Discards:** rejected alternative hypotheses

If unable to complete the 4 steps → **discard**.

### 2.5 Generalization by Class

For each proven finding, search for sibling occurrences in the diff and report all together.

### 2.6 Review Patterns (MEMORY.md)

Run grep for each ID in `MEMORY.md → ## Review Patterns` whose scope matches the changed files. Report violations.

### 2.7 Checklists grep (completeness)

Execute all applicable checklists based on `config.json.invariants` and `config.json.rules`. Generic examples:

| Checklist | What to look for |
|-----------|-------------|
| Tenancy | `config.json.domain.tenancyField` — filters, documented exceptions |
| EF migrations | `config.json.invariants.migrationsCliOnly` — no manual editing |
| Domain rules | Rules in `config.json.domain.model` |
| React hooks | `useEffect` — cleanup, dependencies |
| i18n | New keys in all locales from `config.json.stack.frontend.i18n.locales[]` |

## Common Gaps by Stack

### General
- Secrets hardcoded or in logs
- Authorization failures, injection, cross-tenant leakage
- Resource leaks (`IDisposable`)

### C# / .NET (when detected)
- Dangerous defaults (`DateTime.MinValue`, `Guid.Empty` accepted as valid)
- N+1 queries, premature materialization, async blocking
- Project invariant violations

### TypeScript / React (when detected)
- `dangerouslySetInnerHTML` without sanitization
- `useEffect` without cleanup / unstable dependencies
- `any` in props/DTOs; incomplete i18n; API calls outside existing hooks

## Report Format

If nothing to report: **No feedback**

If findings:

```markdown
## Code Review

**Branch:** `…`
**Stack:** `{detected via config.json}`
**Files:** N

### Critical
- **`path:L42`**: CRITICAL — description (Score: 9/10)
  Analysis: (4 steps)
  Sibling occurrences: `path:L88`
  Suggestion: ```suggestion … ```

### Warning
- **`path:L80`**: WARNING — description (Score: 7/10)

### Suggestion
- **`path:L150`**: SUGGESTION — description (Score: 6/10)

---
**Apply fixes?** (YES → `build-backend`, `test-backend`, `build-frontend`)
```

## Automatic Fix (after YES)

1. Apply fixes surgically
2. Run `build-backend`, `test-backend`, `build-frontend` (+ `test-frontend` if applicable)
3. Present summary
