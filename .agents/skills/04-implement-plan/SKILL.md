---
name: implement-plan
description: Executa ou corrige código seguindo plano/DAG ou achados de review. Detecta stack via config.json; projeto-agnóstico. Modos build e fix.
version: 2.0
disable-model-invocation: true
---

# implement-plan

Implementa ou corrige código seguindo um plano de execução. Duas modalidades — declare o modo explicitamente.

## Pré-leitura obrigatória

Antes de iniciar, leia:
- `config.json` — stack, commands, invariants (`.agents/skills/us-workflow/config.json`)
- `tools.md` — tool aliases (`.agents/skills/us-workflow/tools.md`)
- `stack.md` — código e paths (`.agents/skills/us-workflow/stack.md`)
- Hub: `AGENTS.md` (raiz)

## Modos

| Modo | Quando | Entrada |
|------|--------|---------|
| **build** | Implementação nova | `*.plan.exec.md` + `*.exec.dag.json` ou `*.plan.md` direto |
| **fix** | Corrigir achados de review/testes | Lista de achados |

Se o modo não for explícito, pergunte.

## Modo build

1. Leia a tarefa do DAG (`files[]`, `acceptance`, `coderPrompt`, `dependsOn`) ou a seção "3. Plano Passo a Passo" do `*.plan.md`.
2. **Procure feature equivalente** no repositório (mesmo padrão estrutural, camadas de `config.json.stack`).
3. Implemente **apenas** o que está no `coderPrompt`/`files[]` — não expanda escopo.
4. Prioridade de regras:
   - `AGENTS.md` — roteamento; carregue skills sob demanda
   - `config.json.rules` — guardrails do projeto
   - Architecture spec: `config.json.domain.architectureSpec`
   - Skills de padrões (ex: view-patterns se UI)
   - `karpathy-guidelines` — simplicidade, mudanças cirúrgicas
5. Validação local antes de reportar sucesso:
   - Backend tocado: `build-backend` + `test-backend` (tools.md)
   - Frontend tocado: `build-frontend` (+ `test-frontend` se i18n/lógica UI)
6. Reporte `files_touched` (created/modified/deleted).

## Modo fix

1. Leia `karpathy-guidelines` — correções cirúrgicas, sem refatorar além do achado.
2. Receba lista de achados (formato: Arquivo:Linha, severidade, análise).
3. Para cada achado confirmado, varra **ocorrências irmãs** do mesmo padrão — corrija a **classe**, não só a instância.
4. Cubra cada classe com **teste anti-regressão**.
5. Rode mesma validação do modo build.
6. Documente: problema, correção, ocorrências irmãs, teste anti-regressão.

## Saída (ambos os modos)

- Código + testes no working tree (não commita).
- Resumo: arquivos tocados, testes (pass/fail), achados corrigidos (fix) ou passos implementados (build).

### Formato `step-output` (dispatch workflow)

```yaml
status: success | partial | failed | needs_user
files_touched:
  created: []
  modified: []
  deleted: []
verification:
  files_on_disk: pass | fail
  build: pass | fail | skipped
  tests: pass | fail | skipped
summary: |
  <texto>
```

## Regras de conduta

- **Nunca commite ou faça push** — decisão de quem invoca.
- **Escopo estrito** — não expanda além do `coderPrompt`/achados.
- **Diff mínimo** — sem refatorações não solicitadas.
- **Nunca escreva migrations à mão** — use `migrations-add` (tools.md).
- Se ambíguo, **pare e pergunte** (ou `needs_user` quando subagent).

## Gatilhos

- `@[implement-plan] us-{id}.plan.md` (build standalone)
- `@[implement-plan] "corrigir achados: ..."` (fix standalone)
- Dispatch workflow — Step 5 (build), Step 10 (fix)
