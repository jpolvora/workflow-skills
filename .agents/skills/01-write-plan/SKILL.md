---
name: 01-write-plan
description: "Generates implementation plan from GH {n}, US {n}, or {slug}.spec.md. Reads project stack from config.json — stack-agnostic."
version: 3.1
disable-model-invocation: true
---

# Write Plan

Generates implementation blueprint from `GH {n}` (GitHub), `US {n}` (Azure DevOps), or `{slug}.spec.md` (local). Detects project ecosystem via `config.json` — no hardcoded stack.

## Pre-read

- `config.json` — stack, layers, commands, invariants
- `tools.md`, `stack.md` — tool aliases, stack overview
- `AGENTS.md` — routing hub
- `MEMORY.md` — learned patterns

## Execution

### 1. Load spec

Detect platform from git remote (`dev.azure.com` → Azure DevOps, `github.com` → GitHub).

- **`GH {n}`** → GitHub issue: `gh issue view {n}` → `github-issue-to-spec.py` → `*.spec.md`
- **`US {n}`** or **`{org}/{project}#{id}`** → Azure DevOps work item: REST API → `*.spec.md`  
- **`{slug}.spec.md`** → local spec: read directly
- Cross-reference with glossary (`config.json.domain.glossaryFile`)

### 2. Load context

- `config.json.stack` — backend layers, test project, frontend framework, db/ORM
- `config.json.rules` — engineering guardrails
- `config.json.domain.architectureSpec` — architecture spec
- `MEMORY.md` — anti-regression patterns

Scan existing code in `{backend.layers[].path}` and `{frontend.sourceDir}` for similar patterns.

### 3. Produce plan

Write structured plan to `{us-dir}/step-01-{slug}.plan.md` with sections:

```markdown
---
slug: {slug}
title: "{title}"
status: "plan to be refined"
---

## 0. Summary & Business Rules
- US title/number, objective, business rules, security mitigations

## 1. Definition of Ready & Scope
- Resolved ambiguities, measurable ACs, in/out scope

## 2. Technical Design & Architecture
- Per layer (from config.json): {layer.name} ({layer.path}): changes
- Frontend: pages, routes, API calls, i18n
- Apply config.json.invariants

## 3. Step-by-Step Plan
Steps ordered by dependency:
- Step 1: Domain/Database (entities, migrations, mappings)
- Step 2: Application/Business (services, controllers, DTOs, validations)
- Step 3: Backend Tests (AC coverage)
- Step 4: Frontend/UI (components, routes, API calls, forms)
- Step 5: Frontend Tests (if applicable)

Each step: Action · Files · Guardrails · Security

## 4. Permissions, Tenancy & i18n
- New permissions, multi-tenancy impact, i18n keys

## 5. Test Coverage
- Map each AC → test cases with descriptive methods

## 6. Invariants (Do Not Violate)
- From config.json.invariants

## 7. Pre-PR Checklist
- [ ] Layer separation respected · [ ] Entity encapsulation + validations
- [ ] Migrations applied · [ ] Permissions on endpoints/screens
- [ ] i18n added · [ ] Tests passing · [ ] No layout breaks

## 8. Open Questions
- Ambiguities, dependencies, blockers
```

## Rules

- Plan must be detailed enough for direct implementation.
- **Do not implement code** — deliver blueprint only.
- If stack undetectable from config.json, ask.
