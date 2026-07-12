---
name: us-code-review
description: Reviewer do Step 9 do us-workflow. Code review local em duas fases (triagem → investigação) + generalização por classe de defeito. Detecta stack via config.json; projeto-agnóstico. Invocado por path no Step 9; também standalone.
version: 3.0
disable-model-invocation: true
---

# Code Reviewer (Workflow Step 9)

Revisor de código sênior — análise em duas fases, prova por evidência, generalização por classe de defeito. Objetivo: encontrar erros críticos antes da PR.

## Pré-leitura obrigatória

- `config.json` + `tools.md` + `stack.md` (`.agents/skills/us-workflow/`)
- `AGENTS.md` — hub routing
- `MEMORY.md` — Review Patterns

## Propósito Anti-Loop

**Precisão + completude na mesma rodada:**

- **Precisão:** publique apenas o comprovável com evidência estruturada
- **Completude:** enumere **todos** os achados de uma só vez
- **Classe, não instância:** varra ocorrências irmãs do mesmo padrão

Convergência alvo: **uma única rodada** — lista completa ou "Sem feedback".

## Fase 0 — Detecção de Stack

Leia `config.json.stack` para identificar:
- Backend: layers, solution, test project
- Frontend: framework, source dir, i18n
- Database: tipo, ORM

Ignore: markdown, CI configs, traduções, artefatos de build (`bin/`, `obj/`, `*/dist/`, `node_modules/`).

## Como Executar

### 0. Diff Local

```bash
git diff --name-status master...HEAD -- 'src/**' 'web/src/**' 'tests/**' ':!**/bin/**' ':!**/obj/**' ':!web/node_modules/**' ':!web/dist/**'
```

### 1. Fase 1 — Triagem

Lista de hipóteses ancoradas em linhas alteradas — sem veredito.

- Para cada arquivo elegível, identifique linhas com potencial problema real
- **Descarte:** nits estéticos, formatação, estilo, alertas sem falha plausível, código pré-existente
- UI (`*.tsx`): candidate apenas segurança (`dangerouslySetInnerHTML`), bindings críticos, forms, permissões

### 2. Fase 2 — Investigação + Prova

Para cada hipótese, preencha os **4 passos** antes de reportar:

1. **Evidência lida:** arquivos, símbolos, chamadores inspecionados
2. **Cenário de falha:** entradas/estados que disparam o problema
3. **Proteção ausente:** por que validações/testes existentes não impedem
4. **Descartes:** hipóteses alternativas rejeitadas

Se não preencher os 4 passos → **descarte**.

### 2.5 Generalização por Classe

Para cada achado comprovado, busque ocorrências irmãs no diff e reporte todas juntas.

### 2.6 Review Patterns (MEMORY.md)

Execute grep de cada ID em `MEMORY.md → ## Review Patterns` cujo escopo bata com os arquivos alterados. Reporte violações.

### 2.7 Checklists grep (completude)

Execute todos os checklists aplicáveis baseados em `config.json.invariants` e `config.json.rules`. Exemplos genéricos:

| Checklist | O que buscar |
|-----------|-------------|
| Tenancy | `config.json.domain.tenancyField` — filtros, exceções documentadas |
| EF migrations | `config.json.invariants.migrationsCliOnly` — sem edição manual |
| Domain rules | Regras em `config.json.domain.model` |
| React hooks | `useEffect` — cleanup, dependências |
| i18n | Keys novas em todas as locales de `config.json.stack.frontend.i18n.locales[]` |

## Gaps Comuns por Stack

### Geral
- Secrets hardcoded ou em logs
- Falhas de autorização, injeção, vazamento cross-tenant
- Vazamento de recursos (`IDisposable`)

### C# / .NET (quando detectado)
- Defaults perigosos (`DateTime.MinValue`, `Guid.Empty` aceitos como válidos)
- N+1 queries, materialização precoce, bloqueio async
- Violações de invariants do projeto

### TypeScript / React (quando detectado)
- `dangerouslySetInnerHTML` sem sanitização
- `useEffect` sem cleanup / dependências instáveis
- `any` em props/DTOs; i18n incompleto; API calls fora dos hooks existentes

## Formato do Relatório

Se nada a reportar: **Sem feedback**

Se achados:

```markdown
## Code Review

**Branch:** `…`
**Stack:** `{detectada via config.json}`
**Arquivos:** N

### Critical
- **`path:L42`**: CRITICAL — descrição (Score: 9/10)
  Análise: (4 passos)
  Ocorrências irmãs: `path:L88`
  Sugestão: ```suggestion … ```

### Warning
- **`path:L80`**: WARNING — descrição (Score: 7/10)

### Suggestion
- **`path:L150`**: SUGGESTION — descrição (Score: 6/10)

---
**Aplicar correções?** (SIM → `build-backend`, `test-backend`, `build-frontend`)
```

## Correção Automática (após SIM)

1. Aplicar correções cirurgicamente
2. Rodar `build-backend`, `test-backend`, `build-frontend` (+ `test-frontend` se aplicável)
3. Apresentar resumo
