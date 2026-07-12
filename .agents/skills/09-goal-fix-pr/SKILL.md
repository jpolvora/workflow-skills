---
name: 09-goal-fix-pr
description: Loop fix-pr until zero open threads — auto-approve gates, commit/push, re-check after 5 minutes.
version: 1.0
disable-model-invocation: true
---

# goal-fix-pr

Criterion-driven loop over [`fix-pr`](../08-fix-pr/SKILL.md). Stops on **convergence** — zero open threads on the PR — or user abort.

## Parse

```
/goal-fix-pr <PR-NUMBER> [dry-run] [max <n>]
```

| Token | Example | Effect |
|-------|---------|--------|
| `<PR-NUMBER>` | `15` | PR number on GitHub/Azure DevOps |
| `dry-run` | `/goal-fix-pr 15 dry-run` | No commit, push, or real `resolve_thread` |
| `max <n>` | `max 10` | Iteration ceiling (default **20**) |

Malformed → show usage above.

Restate antes de agir: **PR number**, **success criteria**, **mode** (Drive + post-push heartbeat), **max iterations**, **dry-run**.

## Success criteria

**Convergence:** after `collect`, `len(activeThreads) == 0`.

- **GitHub:** `gh pr view --json comments --jq '[.comments[] | select(.isResolved == false)] | length'` → count
- **Azure DevOps:** `fix_pr_azure_context.py collect` → `activeThreads` count

## Prerequisites

- Repository checked out; PR branch available.
- **GitHub:** `gh` available + token `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN`.
- **Azure DevOps:** `.agents/skills/azure-devops/azure-devops.config.json` + `AZURE_DEVOPS_PAT`.
- Local branch = PR head before each round ([`fix-pr` step 0](../08-fix-pr/SKILL.md)).

## Automation overrides (fix-pr)

This skill **overrides** human confirmations from the cooperative flow. When running under `goal-fix-pr`:

| fix-pr gate | Behavior |
|-------------|----------|
| Plan confirmation / "execute?" | **Auto-yes.** Save `plan-gate.md` and `plan-exec.md` in `runs/pr-<N>/`, proceed without `AskQuestion`. |
| Commit + resolve + push | **Auto** (unless `dry-run`). Order: validate → local commit → resolve threads → push. |
| **Escalate** threads | **Stop** iteration, report thread IDs and wait for human — do not auto-approve product ambiguity. |
| CI Auto-Fix `in_progress` | **Inform** the user; do not block automatically (same rule as fix-pr). |

Everything else remains: branch sync, per-thread analysis, surgical correction, guardrails [`senior-developer`](../../senior-developer/SKILL.md).

## Core loop

Copy and update each iteration:

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

Count `activeThreads`. If **0** → final report and **stop** (PR already converged).

Se `gh pr view` indicar PR **merged/closed**, pare e informe o usuário.

### 2. Act — rodada fix-pr

1. Load [`fix-pr/SKILL.md`](../08-fix-pr/SKILL.md) and execute **steps 0–7** for the current active threads, applying **Automation overrides** above.
2. One round = sync branch → investigate/fix → validate → commit → resolve threads → push (or simulation in dry-run).
3. Mensagem de commit: `fix(#<PR-NUMBER>): fix issues from review threads [<threadId>, ...]`.
4. Resolução de thread:

**GitHub:**

```bash
REPO=$(gh repo view --json name,owner --jq '"\(.owner.login)/\(.name)"')
gh api "repos/$REPO/pulls/$PR_NUMBER/comments/$THREAD_ID/replies" \
  -f body="<root cause + fix; LLM Model: <identifier>>"
```

**Azure DevOps:**

```bash
python .agents/skills/08-fix-pr/scripts/fix_pr_azure_context.py resolve-thread \
  --pr-id <PR-NUMBER> --thread-id <THREAD_ID> --model "<model-id>" \
  --comment "<root cause + fix>"
```

In **dry-run**, do not invoke resolve or `git push`; simulate in the log.

5. Se classificação resultar só em **Escalar** → pare o goal e liste threads bloqueadas.

### 3. Verify (obrigatório)

Sem claim de progresso sem evidência fresca:

| Check | Evidência |
|-------|-----------|
| Build/testes | Output from build/test commands (see `config.json.verification` or tools.md aliases) |
| Auto-revisão | Status **"No feedback"** da skill [`code-review`](../06-code-review/SKILL.md) |
| Publicação | Hash do commit + confirmação de push (ou log dry-run) |
| Threads resolvidas | resolve exit 0 (ou skip documentado em dry-run) |

3× identical failure on the same check → stop and escalate.

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
| Code review | [`code-review/SKILL.md`](../06-code-review/SKILL.md) |
| Goal/loop pattern | [`goal-loop`](../goal-loop/SKILL.md) (sentinel + converge) |

Walkthroughs: [`examples.md`](examples.md).
