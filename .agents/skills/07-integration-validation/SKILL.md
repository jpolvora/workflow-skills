---
name: integration-validation
description: Planeja e executa bateria de testes de integração pré-PR. Detecta stack via config.json; gera relatório pass/fail por AC. Projeto-agnóstico.
version: 2.0
disable-model-invocation: true
---

# integration-validation

Validação de integração final antes de abrir PR — última rede de segurança determinística antes da entrega.

## Pré-leitura obrigatória

- `config.json` + `tools.md` + `stack.md` (`.agents/skills/us-workflow/`)
- `AGENTS.md` — hub routing

## Entrada

- `*.plan.md` obrigatório
- `specPath` ou `*.spec.md` — fonte canônica de ACs
- Número da US (opcional; para resolver spec via GitHub)

## Etapa 1 — Plano de teste

Leia plano, ACs do `*.spec.md`, relatórios de verificação/entrega. Gere `*.integration-test.plan.md` com 8 seções:

1. **Pré-requisitos** — URLs (de `config.json.stack.backend.apiHost` + `config.json.stack.frontend.devHost`), credenciais, migrations (`migrations-apply`), seed (`seed-db`)
2. **Seed de dados** — entidades, estratégia de seed, dataset mínimo por AC, limpeza entre iterações
3. **Build & testes** — `build-backend`, `test-backend`, `build-frontend` (+ `test-frontend` se i18n/UI)
4. **API / backend** — endpoints REST, auth headers (Bearer JWT), status codes, ProblemDetails
5. **Permissões & segurança** — matriz RBAC × resultado esperado; tenancy (`config.json.domain.tenancyField`)
6. **UI / browser** — rotas, navegação, forms, i18n visível (todas as locales de `config.json.stack.frontend.i18n.locales[]`)
7. **Evidências** — screenshots, respostas de rede, saídas de comando
8. **Critério de saída** — todos ACs passam; defeitos logados com severidade

## Etapa 2 — Executar

1. Garantir working tree limpo (avise quem invoca)
2. Rodar build + testes automatizados (§3)
3. Popular seed (§2); confirmar pré-requisitos (§1)
4. Executar checagens de API (§4) e permissões (§5)
5. **UI/browser (§6):** apenas quando autorizado (usuário confirma, ou orquestrador normal/não-auto/não-dry-run). Senão, pule e anote.
6. Escrever `*.integration-test.report.md`: pass/fail por AC

## Saída

- `*.integration-test.plan.md`
- `*.integration-test.report.md`

## Referências

- Formato de ACs: `spec-format`
- Guardrails: `config.json.rules` + projeto
- Architecture spec: `config.json.domain.architectureSpec`

## Regras de conduta

- **Não decide browser sozinha** — autorização explícita
- **Não corrige código** — reporte gaps; correção é `implement-plan` (fix)
- Máximo **3 iterações** de validação

## Gatilhos

- `@[integration-validation] us-{id}.plan.md`
- Dispatch workflow — Step 11
