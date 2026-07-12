# AGENTS.md — Central de Skills para Cursor Agent

Este arquivo é o **hub** do harness de agentes. Contém o roteamento e indexação de todas as skills disponíveis neste repositório. Consulte a tabela apropriada para encontrar a skill correta para sua tarefa.

---

## Skill loading (mandatory)

Skills carregadas automaticamente por tipo de tarefa:

| Skill | Path | Disparo |
|-------|------|---------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Every prompt — compressão de resposta |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Every prompt — diretrizes operacionais |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Every prompt — behavioral guardrails |
| `using-superpowers` | `.agents/skills/using-superpowers/SKILL.md` | Session start — descoberta de skills |

---

## Catálogo de Skills

### Layer 0 — Harness & Agent Infrastructure

| Skill | Path | Descrição |
|-------|------|-----------|
| `check-harness` | `.agents/skills/check-harness.md` | Auditoria e manutenção do harness (AGENTS.md, skills, rules) |
| `write-a-skill` | `.agents/skills/write-a-skill/SKILL.md` | Criação de novas skills com estrutura e progressive disclosure |
| `handoff` | `.agents/skills/handoff/SKILL.md` | Compressão de conversa em documento de handoff |
| `using-superpowers` | `.agents/skills/using-superpowers/SKILL.md` | Onboarding do agente: descoberta de skills via Skill tool |

### Layer 1 — Engineering Standards (Auto-load por tarefa)

| Skill | Path | Descrição |
|-------|------|-----------|
| `senior-developer` | `.agents/skills/senior-developer/SKILL.md` | Padrões .NET 10 / C# — Clean Code, SOLID, EF Core, testes |
| `matrix-view-patterns` | `.agents/skills/matrix-view-patterns/SKILL.md` | Padrões de UI CRUD (hash routing, cursor lists, filters) |
| `mobile-first-design` | `.agents/skills/mobile-first-design/SKILL.md` | Design responsivo mobile-first |
| `taste-skill` | `.agents/skills/taste-skill/SKILL.md` | Anti-slop frontend — landing pages, portfolios, redesigns |

### Layer 2 — Workflow Pipeline (numerated, 00-11)

| Step | Skill | Path | Descrição |
|------|-------|------|-----------|
| 00 | `00-write-spec` | `.agents/skills/00-write-spec/SKILL.md` | Gera spec.md a partir de descrição de feature |
| 01 | `write-plan` | `.agents/skills/01-write-plan/SKILL.md` | Gera plano de implementação de GH issue / spec.md |
| 02 | `refine` | `.agents/skills/02-refine/SKILL.md` | Audita e interroga plano até entendimento compartilhado |
| 03 | `plan-exec-dag` | `.agents/skills/03-plan-exec-dag/SKILL.md` | Quebra plano em DAG de tarefas atômicas paralelizáveis |
| 04 | `implement-plan` | `.agents/skills/04-implement-plan/SKILL.md` | Executa ou corrige código seguindo plano/DAG |
| 05 | `verify-sync-write-plan` | `.agents/skills/05-verify-sync-plan-us/SKILL.md` | Confronta critérios/plano com código atual |
| 06 | `us-code-review` | `.agents/skills/06-code-review/SKILL.md` | Code review local em duas fases (triagem → investigação) |
| 07 | `integration-validation` | `.agents/skills/07-integration-validation/SKILL.md` | Bateria de testes de integração pré-PR |
| 08 | `fix-pr` | `.agents/skills/08-fix-pr/SKILL.md` | Corretor automático de threads de code review em PRs |
| 09 | `goal-fix-pr` | `.agents/skills/09-goal-fix-pr/SKILL.md` | Loop de fix-pr até zerar threads abertas |
| 10 | `step-10-update-plan-implementation` | `.agents/skills/10-update-plan-implementation/SKILL.md` | Pós-workflow: captura QA findings e aplica deltas |
| 11 | `11-ship-pr` | `.agents/skills/11-ship-pr/SKILL.md` | End-to-end delivery: PR develop→master/main, merge |

### Layer 3 — Discovery & Library Integration

| Skill | Path | Descrição |
|-------|------|-----------|
| `context7-mcp` | `.agents/skills/context7-mcp/SKILL.md` | Documentação de libs/frameworks via Context7 MCP |
| `supabase` | `.agents/skills/supabase/SKILL.md` | Supabase (Database, Auth, Edge Functions, Realtime, Storage) |
| `supabase-postgres-best-practices` | `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Otimização de Postgres e boas práticas |

### Layer 4 — Review & Audit

| Skill | Path | Descrição |
|-------|------|-----------|
| `code-review` | `.agents/skills/code-review/SKILL.md` | Revisão rigorosa de PR/branch local |
| `security-review` | `.agents/skills/security-review/SKILL.md` | Revisão de segurança (OWASP, injection, XSS, auth, crypto) |
| `dotnet-security-performance-review` | `.agents/skills/dotnet-security-performance-review/SKILL.md` | Revisão C# de segurança e performance (login, auth, EF) |
| `tdd-sdd-ddd-reviewer` | `.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md` | Auditoria arquitetural (Clean Architecture, TDD, DDD) |
| `domain-review` | `.agents/skills/domain-review/SKILL.md` | Revisão de domínio/bounded context (smells, SOLID, security) |
| `multi-domain-review` | `.agents/skills/multi-domain-review/SKILL.md` | Revisão em lote de múltiplos domínios |

### Layer 5 — Utility & Meta

| Skill | Path | Descrição |
|-------|------|-----------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Compressão ultra de resposta (~75% menos tokens) |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Dez diretrizes operacionais de resposta (accountability, anti-sycophancy, chain-of-verification) |
| `us-workflow` | `.agents/skills/us-workflow/SKILL.md` | Orquestrador E2E de User Story (FSM F0-F6, steps 0-12) |
| `modular-orchestrator` | `.agents/skills/modular-orchestrator/SKILL.md` | Orquestrador stateful por steps com FSM e memória compartilhada |
| `spec-format` | `.agents/skills/spec-format/SKILL.md` | Cria, revisa ou formata artefatos *.spec.md |
| `verify-plan` | `.agents/skills/verify-plan/SKILL.md` | Verifica e avalia execução do plano de implementação |
| `learning` | `.agents/skills/learning/SKILL.md` | Registro de conhecimento anti-regressão em MEMORY.md |
| `changelog` | `.agents/skills/changelog/SKILL.md` | Registro histórico resumido em CHANGELOG.md |
| `grill-with-docs` | `.agents/skills/grill-with-docs/SKILL.md` | Sessão de questionamento contra domínio existente + docs |
| `find-skills` | `using-superpowers` (skill global) | Descoberta e instalação de novas skills |

---

## Task Router

| Quando usar | Skill a carregar |
|-------------|------------------|
| Quero escrever uma spec | `00-write-spec` |
| Quero planejar implementação | `write-plan` → `refine` → `plan-exec-dag` |
| Quero implementar | `implement-plan` |
| Quero verificar o que foi feito | `verify-sync-write-plan` ou `verify-plan` |
| Quero revisar código local | `code-review` ou `us-code-review` |
| Quero revisar segurança | `security-review` ou `dotnet-security-performance-review` |
| Quero revisar arquitetura (DDD) | `tdd-sdd-ddd-reviewer` |
| Quero revisar domínio | `domain-review` ou `multi-domain-review` |
| Quero testar integração pré-PR | `integration-validation` |
| Quero corrigir PR | `fix-pr` |
| Quero entregar (ship PR) | `11-ship-pr` |
| Quero workflow E2E completo | `us-workflow` |
| Quero orquestrador stateful por steps | `modular-orchestrator` |
| Quero formatar/revisar spec | `spec-format` |
| Quero criar skill nova | `write-a-skill` |
| Quero auditar o harness | `check-harness` |
| Quero questionar plano contra docs | `grill-with-docs` |
| Quero documentação de lib | `context7-mcp` |
| Quero trabalhar com Supabase | `supabase` |
| Quero otimizar Postgres | `supabase-postgres-best-practices` |
| Quero fazer design frontend | `taste-skill` ou `matrix-view-patterns` ou `mobile-first-design` |
| Quero registrar aprendizado | `learning` |
| Quero registrar changelog | `changelog` |
| Quero passar bastão | `handoff` |
| Quero descobrir/instalar skills | `find-skills` ou `using-superpowers` |

---

## Verification

Before closing a task or committing, run:

```bash
# Check harness integrity (paths, routing, redundancy)
npx github:jpolvora/workflow-skills check-harness --dry-run

# Or via gh API if installed globally
gh api repos/jpolvora/workflow-skills/pages   # verify site is building
```

---

## Custom Commands

| Command | File | Descrição |
|---------|------|-----------|
| `/check-harness` | `commands/check-harness.md` | Audit harness integrity (paths, links, routing, redundancy) |
