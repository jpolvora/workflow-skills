---
name: code-review
description: >
  Rigorous local PR/branch review. Diff against master/main; detects project stack
  via config.json. Tenancy, project patterns, tests, clean code.
  Include markdown when reviewing docs, harness files.
---

# Code review

Branch vs **`master`** (or `main`). Catch bugs, tenancy leaks, pattern drift, CI failures before push.

## Pré-leitura

- `config.json` + `tools.md` + `stack.md` (`.agents/skills/us-workflow/`)
- `AGENTS.md` — hub routing
- Project guardrails: `config.json` → `rules` + `invariants`
- `karpathy-guidelines` — surgical fixes

## Scope

### Review unit (not diff hunks only)

1. Every **file changed in branch diff** → read entire file at branch tip.
2. **Referenced files** (one hop): direct imports/`using`, injected interfaces, EF configs for touched entities, paired tests, list/form siblings, nav config, both locale files when strings change, locked spec when behavior changes.
3. Do **not** expand to unrelated modules.

**Exclude:** `bin/`, `obj/`, `*/dist/`, `node_modules/`, lockfile noise unless intentional.

**Fixes after SIM:** still **surgical** ([karpathy-guidelines](../karpathy-guidelines/SKILL.md)).

**Include:** `*.cs`, `*.csproj`, `*.ts`, `*.tsx`, app `*.json`, EF migrations, harness `*.md`.

## Project guardrails (from config)

Carregue invariants de `config.json` → `invariants` e regras de `config.json` → `rules`. Aplique ao diff:

- **Tenancy** (se configurado): filtro de tenant, exceções documentadas
- **Domain rules**: regras de negócio do `config.json.domain.model`
- **EF/DB**: migrations CLI-only; entidades com padrão do projeto
- **API**: formato de erro, secrets via env
- **Tests**: nova funcionalidade + bug fixes exigem testes
- **Docs**: routing no hub, glossary

## Project pattern conformance

Compare com o **peer mais próximo** (mesma camada / página irmã).

| Area | Expect |
|------|--------|
| **Backend layers** | Respeitar separação de `config.json.stack.backend.layers[]` |
| **Backend logic** | Services implementam interfaces; sem regras de negócio em controllers |
| **EF / API** | `IEntityTypeConfiguration<>`; UTC; tenant filters; CancellationToken |
| **Tests** | Integration para HTTP/EF; patterns em `config.json.stack.backend.testProject` |
| **Frontend layout** | Padrões de list/form/navigation do projeto |
| **Frontend UI** | Tokens de design; invariantes visuais |
| **Frontend i18n/types** | Keys nos locales de `config.json.stack.frontend.i18n.locales[]`; TS alinhado com DTOs |
| **Frontend fetch** | Hooks/auth context existentes — sem novas libs sem necessidade |

## Process

```bash
BASE_BRANCH=$(git rev-parse --verify master >/dev/null 2>&1 && echo master || echo main)
git branch --show-current
git diff --name-status "$BASE_BRANCH"...HEAD
git diff "$BASE_BRANCH"...HEAD -- path/to/file   # intent; read full file at HEAD
```

## Response format

Default: **Portuguese (Brazil)** unless user asks English.

Nothing to fix → **Sem feedback**

```markdown
## Code review (branch vs ${BASE_BRANCH})

**Branch:** `…`
**Files reviewed:** N (changed + referenced)

### Critical (security, tenancy, bugs)
- **path:** issue → suggested fix

### Project patterns (backend / frontend)
- **path:** deviation → align with peer / skill

### Clean code / maintainability
- **path:** issue → suggestion

### Tests / verification
- Missing tests or commands not run → what to add/run

---
**Apply fixes?** (Reply SIM — then `build-backend`, `test-backend`, `build-frontend` + `test-frontend` when relevant.)
```

## After SIM

Agreed fixes → `build-backend` → `test-backend` → `build-frontend` (+ `test-frontend` if i18n). Cite fresh output.

## Do not

Whole-repo refactors; contradict specs/project rules; ABP, Angular, Azure DevOps assumptions; `yarn` unless project uses it.
