---
name: plan-exec-dag
description: Quebra um plano de implementação (*.plan.md) em tarefas atômicas com arquivos, critério de aceite e coderPrompt, organizadas em um DAG de níveis topológicos para execução paralela segura. Detecta automaticamente planos pequenos e recomenda execução sequencial (skip DAG).
version: 2.0
disable-model-invocation: true
---

# plan-exec-dag

Transforma um `*.plan.md` (idealmente pós-`refine`, sem lacunas `blocking`) em um plano de execução operacional: tarefas atômicas + grafo de dependências (DAG) prontos para um agente de codificação (`implement-plan`) executar sem ambiguidade.

**Deteccao automatica de tamanho:** antes de gerar o DAG, avalia se o plano e pequeno o suficiente para execucao sequencial direta — se for, retorna `execMode: sequential` e pula a geracao do DAG (ver [Size Detection](#size-detection--sequential-mode)).

**Standalone** — util mesmo fora do `us-workflow` para quem so quer o checklist de execucao de um plano.

## Entrada

Caminho de um `*.plan.md` (formato `write-plan`, idealmente ja revisado por `refine`). Se nao for informado, pergunte.

## Size Detection & Sequential Mode

Antes de quebrar em tarefas atomicas, avalie o tamanho do plano lendo a secao "3. Plano de Implementacao Passo a Passo" e a matriz de arquivos. Se o plano atender a **todos** os criterios abaixo, ele e considerado **pequeno** — retorne `execMode: sequential` e pule a geracao do DAG:

| Criterio | Limite | Como medir |
|----------|--------|------------|
| Passos de implementacao | ≤ 3 | Contar sub-passos numerados na secao 3 |
| Arquivos esperados | ≤ 6 | Somar todos os arquivos listados em "Arquivos" nos passos |
| Camadas envolvidas | ≤ 2 | Core / Infrastructure / API / web — contar distintas |

**Limiares customizaveis:** o arquivo [`config.json`](../us-workflow/config.json) pode sobrescrever esses valores no campo `dagThresholds`. Se o campo existir, use os valores de la. Se ausente, use os defaults acima.

Se **algum** criterio exceder o limite → gere o DAG normalmente (`execMode: parallel`).

Se **todos** os criterios estiverem dentro do limite → `execMode: sequential`.

**Limite:** quando o plano nao tiver a secao 3 clara o suficiente para contar passos/arquivos, assuma `execMode: parallel` (nao arrisque pular o DAG em planos ambiguos).

## Sequential Mode Output

Quando `execMode: sequential`, a saida e minima — sem DAG, sem `tasks[]`, sem `levels[]`:

### `*.plan.exec.md`
```markdown
# {slug} — Execution Plan (Sequential)
**Mode:** sequential — plano pequeno, execucao direta sem DAG.
**Reason:** {n} passos, {m} arquivos, {k} camadas — abaixo dos limiares.

Executar via `implement-plan` modo `build` com o `*.plan.md` diretamente.
```

### `*.exec.dag.json`
```json
{
  "execMode": "sequential",
  "reason": "{n} passos, {m} arquivos, {k} camadas — execucao sequencial mais eficiente.",
  "planPath": "{slug}.plan.md",
  "tasks": [],
  "levels": []
}
```

## Parallel Mode (DAG — plano grande)

Quando `execMode: parallel`, siga o fluxo normal abaixo.

### O que fazer

1. Leia o plano inteiro, com foco na secao "3. Plano de Implementacao Passo a Passo" e na matriz de ACs.
2. Quebre cada passo em **tarefas atomicas** (`T1`, `T2`, ...), cada uma com:
   - `id`: `T{n}`
   - `title`: curto, imperativo (ex.: "Criar DTO `WithdrawalDto` com validacoes")
   - `files`: lista exata de caminhos a criar/alterar (sem wildcard)
   - `dependsOn`: ids de tarefas previas necessarias
   - `acceptance`: criterio objetivo e testavel (referencia o AC do plano quando aplicavel)
   - `coderPrompt`: instrucao literal e completa para quem for implementar — namespaces, classes, DTOs, permissoes; cite arquivo de referencia real do repo (ex.: servico ou controller nas camadas do projeto definidas em `config.json.stack`)
   - `parallelGroup`: preenchido no passo 3 abaixo
3. Monte **niveis topologicos** (`levels`): tarefas sem dependencias pendentes entram no mesmo nivel, **max. 3 tarefas concorrentes por nivel**, e **nenhuma sobreposicao de arquivos** dentro do mesmo nivel (duas tarefas do mesmo nivel nunca tocam o mesmo arquivo — se tocarem, force uma dependencia entre elas e mova para niveis diferentes).
4. **Nao** defina worktree por tarefa — a isolacao de execucao e responsabilidade de quem executa o DAG (`implement-plan`/orquestrador), nao do DAG em si.

### Saida

#### `*.plan.exec.md` (legivel)
Markdown com uma secao por tarefa (`id`, `title`, `files`, `dependsOn`, `acceptance`, resumo do `coderPrompt`) e uma tabela final com os niveis (`Nivel | Tarefas`).

#### `*.exec.dag.json` (maquina)
```json
{
  "execMode": "parallel",
  "targetModel": "coder",
  "tasks": [
    {
      "id": "T1",
      "parallelGroup": null,
      "dependsOn": [],
      "files": ["src/Core/Withdrawals/WithdrawalDto.cs"],
      "acceptance": "DTO expoe propriedades mapeadas com validacoes DataAnnotations",
      "coderPrompt": "Criar WithdrawalDto na camada Core seguindo o padrao de DTOs existentes (record OK, agnostico de persistencia).",
      "title": "Criar WithdrawalDto"
    }
  ],
  "levels": [["T1"], ["T2", "T3"]]
}
```

**Convencao de nomes de arquivo:** mesmos nomes usados pelo `us-workflow` (`us-{id}.plan.exec.md`, `us-{id}.exec.dag.json`) quando invocado pelo workflow, dentro de `.cursor/plans/us-{id}/`. Quando standalone sem US, use o mesmo basename do `*.plan.md` de entrada trocando a extensao (`meu-plano.plan.md` → `meu-plano.plan.exec.md` / `meu-plano.exec.dag.json`), na mesma pasta do plano.

## step-output (us-workflow)

```yaml
step-output:
  status: success
  step: 3
  execMode: sequential | parallel
  artifacts:
    planExecMd: "{path}"
    execDagJson: "{path}"
  files_touched:
    - "{path}/us-{id}.plan.exec.md"
    - "{path}/us-{id}.exec.dag.json"
  summary: "{execMode} — {n} passos, {m} files, {k} layers"
  decisions:
    - "Sequential: plano pequeno — execucao direta sem DAG"   # when sequential
    - "Parallel: {n} tasks in {k} levels"                     # when parallel
  needs_user: null
```

## Regras de conduta

- **Nao implemente codigo** — so decompoe o plano em tarefas (ou detecta modo sequencial).
- **Nao invente arquivos/simbolos** que o plano nao sustenta — se o plano for vago demais para gerar um `coderPrompt` preciso, isso e sinal de que faltou `refine`; reporte o gap em vez de adivinhar.
- Siga os guardrails em `config.json.invariants` + `config.json.rules` ao decidir onde cada arquivo deve ir. Camadas e paths definidos em `config.json.stack`.
- Referências: carregue docs apontados por `config.json.domain.architectureSpec` e skills de padrões do projeto (ex: view-patterns quando UI).

## Gatilhos

- `@[plan-exec-dag] caminho/do/plano.md`
- Dispatch por subagent do `us-workflow` (Step 3).
