# goal-fix-pr — exemplos

## 1. PR com threads ativas até convergence

```
/goal-fix-pr 15
```

**Setup**
- PR number: `15` (GitHub)
- Success: `activeThreads == 0`
- Mode: Drive + heartbeat 5m pós-push
- Max: 20

**Iteração 1**
1. `gh pr view 15 --json comments` → 3 threads ativas
2. fix-pr com auto-gates → corrige 2, resolve 1 sem código
3. `dotnet test` + code-review → "No feedback"
4. Commit `fix(#15): fix issues from review threads [PRRT_..., ...]` + push
5. Armar `sleep 300` → `AGENT_GOAL_WAKE_fixpr_15`

**Iteração 2** (após wake)
1. `collect` → 1 thread nova (reviewer CI)
2. fix-pr rodada 2 → corrige, push
3. Heartbeat 5m

**Iteração 3**
1. `collect` → `activeThreads: []`
2. **Done** — convergence

---

## 2. Dry-run (sem publicar)

```
/goal-fix-pr 15 dry-run
```

- Gates auto-aprovados; sem resolve nem `git push`
- Sem commit real (ou commit local descartável, conforme política da sessão)
- Re-coleta **imediata** (sem sleep 5m) entre iterações
- Para quando simulação mostra 0 threads ou `max` atingido

---

## 3. PR grande com teto

```
/goal-fix-pr 15 max 5
```

- Para na 5ª iteração se ainda houver threads
- Reporta IDs restantes para continuação manual ou `max 15`

---

## 4. Bloqueio por escalação

**Iteração 1**
- Thread `PRRT_...`: conflito spec vs comentário → classificada **Escalar**
- Goal **para** sem auto-aprovar
- Usuário decide → retoma com `/goal-fix-pr 15` após alinhamento

---

## Contar threads ativas (verificação rápida)

```bash
gh pr view 15 --json comments --jq '[.comments[] | select(.isResolved == false)] | length'
```

Exit `0` = convergence; `1` = ainda há trabalho.
