# 🎯 Workflow Skills — Central de Diretrizes e Skills para Cursor

Este repositório centraliza uma coleção de diretrizes agênticas e comportamentais (**skills**) pré-configuradas para o Cursor Agent. O objetivo é servir como uma **fonte única de verdade** (source of truth) para instalar, atualizar e sincronizar essas instruções em múltiplos projetos locais de forma prática e consistente.

> 📖 **Consulte o [`AGENTS.md`](AGENTS.md)** para o roteamento completo de todas as skills, layers, task router e instruções de carregamento automático (skill loading).

---

## 🛠️ Como Instalar e Atualizar Skills

Você pode instalar ou atualizar as diretrizes agênticas (**skills**) diretamente na pasta `.agents/skills` do seu projeto de desenvolvimento local de duas maneiras:

### Opção A: Execução via NPX (Recomendado)
Se você possui Node.js instalado, você pode executar o CLI diretamente via `npx` de forma nativa e multiplataforma:

#### 1. Menu Interativo (Instalação/Seleção)
Para abrir o menu interativo e selecionar as skills a serem instaladas:
```bash
npx github:jpolvora/workflow-skills
```

#### 2. Auto-Update (Atualização Rápida)
Se você já possui skills instaladas e deseja apenas atualizá-las para as versões mais recentes, execute:
```bash
npx github:jpolvora/workflow-skills update
```
*(Este comando detecta automaticamente quais skills estão no diretório `.agents/skills/` do seu projeto e as atualiza de forma silenciosa, sem necessidade de menu interativo.)*

---

### Opção B: Execução via cURL (Bash Script)
Caso prefira rodar o instalador diretamente do repositório público usando o shell script:

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash
```

### Menu Interativo (cURL/NPX)
Ambas as opções interativas abrirão o menu visual no console:
```text
============================================================
  Workflow Skills - Skill Installer
============================================================
Source: /path/to/workflow-skills/.agents/skills
Target: /path/to/my-project/.agents/skills
------------------------------------------------------------
Toggle selection by entering the number.
Enter 'a' to select/deselect all.
Enter 'y' or 'i' to install the selected skills.
Enter 'q' to quit.
------------------------------------------------------------

  [ ]  1) code-review
  [ ]  2) fix-pr
  [ ]  3) karpathy-guidelines
  [ ]  4) plan-us
  [ ]  5) us-delivery-workflow
```

* **Toggle de Seleção:** Digite o número correspondente à skill e pressione `Enter` para marcar/desmarcar (`[ ]` ↔ `[x]`).
* **Selecionar Todas:** Digite `a` para alternar a seleção de todas as skills ao mesmo tempo.
* **Confirmar Instalação:** Digite `y` ou `i` e pressione `Enter`.
* **Sair:** Digite `q` para abortar a instalação.

---

## 🗂️ Catálogo de Skills Disponíveis

> ⚠️ Esta seção contém skills legadas. Para o **índice completo e atualizado** com todas as skills, layers, task router e auto-load, consulte o [`AGENTS.md`](AGENTS.md).

Abaixo está o índice simplificado das diretrizes agênticas inclusas neste repositório:

| Skill | Versão | Descrição |
| :--- | :--- | :--- |
| **`code-review`** | 1.0 | **Revisor Local de Code Review:** Realiza análises profundas comparando a branch atual com a principal. Segue uma abordagem rigorosa em duas fases (triagem ➔ investigação com provas estruturadas e descarte de hipóteses). |
| **`fix-pr`** | 1.0 | **Corretor Automático de PR:** Analisa criticamente comentários e threads de code review em PRs (ex: Azure DevOps), decide quais comentários fazem sentido e aplica correções cirúrgicas de forma segura. |
| **`karpathy-guidelines`** | 1.0 | **Diretrizes Karpathy:** Conjunto de guardrails de comportamento para reduzir falhas comuns de LLMs (alucinações, edições incompletas, atalhos de código), inspirado na filosofia de Andrej Karpathy. |
| **`plan-us`** | 2.0 | **Planejador de User Story:** Cria planos de implementação detalhados baseados em User Stories. Autodetecta e se adapta dinamicamente à arquitetura do ecossistema do projeto (ex: ABP/.NET/Angular, NextJS/React, etc.). |
| **`us-delivery-workflow`** | 8.0 | **Orquestrador de Delivery Ponta a Ponta:** Gerencia o fluxo completo de entrega de uma User Story em 7 fases (F0–F6). Oferece suporte a dry-run, modo automático, isolamento por passos (worktrees) e protocolo de higiene de estado. |

---

## 🏗️ Como Contribuir ou Adicionar Nova Skill

As novas skills devem ser criadas dentro do diretório `.agents/skills/` com a seguinte estrutura mínima:

```text
.agents/skills/
└── minha-nova-skill/
    ├── SKILL.md       # Arquivo de instruções com YAML frontmatter (obrigatório)
    ├── scripts/       # Scripts auxiliares e ferramentas de validação (opcional)
    └── README.md      # Instruções específicas para a skill (opcional)
```

### Estrutura do `SKILL.md`
O arquivo `SKILL.md` na raiz de cada skill deve conter o frontmatter YAML com o nome e a descrição corretos para detecção automatizada do Cursor:

```markdown
---
name: minha-nova-skill
description: Resumo conciso de uma linha sobre o que a skill faz.
version: 1.0
---

# Minha Nova Skill

Instruções operacionais detalhadas da skill...
```

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.
