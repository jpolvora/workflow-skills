---
name: goal-fix-pr
description: Loop fix-pr até zerar threads abertas — auto-aprova gates, commit/push e re-checa após 5 minutos.
disable-model-invocation: true
---

# goal-fix-pr

Criterion-driven loop sobre [`fix-pr`](../08-fix-pr/SKILL.md). Para quando **convergence** — zero threads abertas na PR — ou o usuário parar.

## Parse

```
/goal-fix-pr <PR-NUMBER> [dry-run] [max <n>]
```

| Token | Exemplo | Efeito |
|-------|---------|--------|
| `<PR-NUMBER>` | `15` | Número da PR no GitHub/Azure DevOps |
| `dry-run` | `/goal-fix-pr 15 dry-run` | Sem commit, push nem `resolve_thread` real |
| `max <n>` | `max 10` | Teto de iterações (default **20**) |

Malformed → mostrar usage acima.

Restate antes de agir: **PR number**, **success criteria**, **mode** (Drive + post-push heartbeat), **max iterations**, **dry-run**.

## Success criteria

**Convergence:** após `collect`, `len(activeThreads) == 0`.

- **GitHub:** `gh pr view --json comments --jq '[.comments[] | select(.isResolved == false)] | length'` → count
- **Azure DevOps:** `fix_pr_azure_context.py collect` → `activeThreads` count

## Pré-requisitos

- Repositório checkoutado; PR branch disponível.
- **GitHub:** `gh` disponível + token `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN`.
- **Azure DevOps:** `.agents/skills/azure-devops/azure-devops.config.json` + `AZURE_DEVOPS_PAT`.
- Branch local = head da PR antes de cada rodada ([`fix-pr` passo 0](../08-fix-pr/SKILL.md)).

## Automation overrides (fix-pr)

Esta skill **substitui** confirmações humanas do fluxo cooperativo. Ao executar sob `goal-fix-pr`:

| Gate fix-pr | Comportamento |
|-------------|---------------|
| Confirmação de plano / "executar?" | **Auto-sim.** Grave `plan-gate.md` e `plan-exec.md` em `runs/pr-<N>/`, prossiga sem `AskQuestion`. |
| Commit + resolve + push | **Auto** (salvo `dry-run`). Ordem: validar → commit local → resolve threads → push. |
| Threads **Escalar** | **Pare** a iteração, reporte thread IDs e aguarde humano — não auto-aprovar ambiguidade de produto. |
| Auto-Fix CI `in_progress` | **Informe** o usuário; não bloqueie automaticamente (mesma regra do fix-pr). |

Todo o restante permanece: branch sync, análise por thread, correção cirúrgica, guardrails [`senior-developer`](../../senior-developer/SKILL.md).

## Core loop

Copie e atualize a cada iteração:

```
Goal: fix-pr PR-<N> until convergence
Success: activeThreads == 0
Iteration: <n>/<max>
- [ ] branch sync (PR head)
- [ ] collect + count
- [ ] fix-pr round (se > 0)
- [ ] verify build/tests + code-review
- [ ] commit + resolve + push (se código)
- [ ] wait 5m + re-collect
```

### 1. Baseline (iteração 1)

**GitHub:**

```bash
mkdir -p .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>

gh pr view <PR-NUMBER> --json headRefName,baseRefName,state,url

REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_NUMBER/comments?per_page=100" \
  > .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>/context.json
```

**Azure DevOps:**

```bash
mkdir -p .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>

python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py collect \
  --pr-id <PR-NUMBER> --output .agents/skills/08-fix-pr/runs/pr-<PR-NUMBER>/context.json
```

Conte `activeThreads`. Se **0** → relatório final e **pare** (PR já convergiu).

Se `gh pr view` indicar PR **merged/closed**, pare e informe o usuário.

### 2. Act — rodada fix-pr

1. Carregue [`fix-pr/SKILL.md`](../08-fix-pr/SKILL.md) e execute **passos 0–7** para as threads ativas atuais, aplicando **Automation overrides** acima.
2. Uma rodada = sync branch → investigar/corrigir → validar → commit → resolve threads → push (ou simulação em dry-run).
3. Mensagem de commit: `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`.
4. Resolução de thread:

**GitHub:**

```bash
REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_NUMBER/comments/$THREAD_ID/replies" \
  -f body="<causa raiz + fix; Modelo LLM: <identificador>>"
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py resolve-thread \
  --pr-id <PR-NUMBER> --thread-id <THREAD_ID> --model "<model-id>" \
  --comment "<causa raiz + fix>"
```

Em **dry-run**, não invoque resolve nem `git push`; simule no log.

5. Se classificação resultar só em **Escalar** → pare o goal e liste threads bloqueadas.

### 3. Verify (obrigatório)

Sem claim de progresso sem evidência fresca:

| Check | Evidência |
|-------|-----------|
| Build/testes | Saída de `dotnet test` / `dotnet build`; se diff tocar `web/` → `npm test` e `npm run build` |
| Auto-revisão | Status **"No feedback"** da skill [`code-review`](../code-review/SKILL.md) |
| Publicação | Hash do commit + confirmação de push (ou log dry-run) |
| Threads resolvidas | resolve exit 0 (ou skip documentado em dry-run) |

Falha 3× idêntica na mesma verificação → pare e escale.

### 4. Post-push heartbeat (5 minutos)

Após commit/push **ou** rodada só com resolve sem código, arme **um** sleeper de 300s (5 min) antes da próxima coleta — novos comentários de CI/reviewer podem chegar após o push.

Sentinel único por sessão: `AGENT_GOAL_WAKE_fixpr_<PR-NUMBER>`.

```bash
sleep 300
echo 'AGENT_GOAL_WAKE_fixpr_<PR-NUMBER> {"reason":"post-push","prompt":"Re-collect PR-<PR-NUMBER> and continue goal-fix-pr loop"}'
```

- `notify_on_output` com regex `^AGENT_GOAL_WAKE_fixpr_<PR-NUMBER>`.
- Rastreie PID; mate ao concluir ou ao usuário pedir stop.
- **Não** duplique sleepers — um por vez.

### 5. Re-collect e re-arm

No wake (ou imediatamente se dry-run sem push):

1. Re-collect threads (plataforma apropriada) → conte `activeThreads`.
2. **0** → **done** (convergence).
3. **> 0** e `n < max` → iteração `n+1` (volte ao passo 2; inclua branch sync).
4. **n ≥ max** → pare, reporte threads restantes, peça `max` maior ou intervenção humana.

## Modo

| Fase | Modo |
|------|------|
| Análise + correção + push | **Drive** |
| Espera pós-push | **Watch** (timer 5m) |

Iteração 1 roda **agora** após armar o primeiro sleeper (só após push real; em dry-run, re-coleta imediata sem espera).

## Stop

| Condição | Ação |
|----------|------|
| `activeThreads == 0` | Relatório final + mate sleeper |
| Usuário diz stop | Mate sleeper, resuma progresso |
| Thread **Escalar** | Pare, liste bloqueios |
| `n >= max` | Pare, liste threads ativas |
| Coleta falha | Pare — não improvise API |

## Relatório final

1. Iterações executadas e critério de parada.
2. Threads tratadas por rodada (corrigida / resolvida / escalada).
3. Links dos relatórios `.cursor/codereviews/PR-<N>-rodada-*.md` (se gerados).
4. Commits (hash + mensagem) e confirmação de push.
5. Contagem final `activeThreads` com evidência do último `collect`.
6. Modelo LLM usado nas resoluções.
7. URL da PR.

## Dependências

| Recurso | Path |
|---------|------|
| Fluxo de correção | [`fix-pr/SKILL.md`](../08-fix-pr/SKILL.md) |
| Coleta threads (GitHub) | `gh api "repos/.../pulls/.../comments"` |
| Resolver thread (GitHub) | `gh api "repos/.../pulls/.../comments/.../replies"` |
| Coleta/resolve (Azure DevOps) | `.agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py` |
| Code review | [`code-review/SKILL.md`](../code-review/SKILL.md) |
| Padrão goal/loop | Skill `goal` (sentinel + verify) |

Walkthroughs: [`examples.md`](examples.md).
