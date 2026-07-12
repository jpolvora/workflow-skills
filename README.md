# 🎯 Workflow Skills — Agent Guidelines & Skills Hub

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — Interactive catalog of all skills.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

This repository centralizes a collection of behavioral agent guidelines (**skills**) pre-configured for AGENTic coding assistants. The goal is to serve as a **single source of truth** for installing, updating, and synchronizing these instructions across multiple local projects in a practical and consistent way.

> 📖 **See [`AGENTS.md`](AGENTS.md)** for the complete routing of all skills, layers, task router, and auto-load instructions (skill loading).

---

## 🛠️ How to Install and Update Skills

You can install or update the agent guidelines (**skills**) directly into the `.agents/skills` folder of your local development project in two ways:

### Option A: Via NPX (Recommended)
If you have Node.js installed, you can run the CLI directly via `npx` natively and cross-platform:

#### 1. Interactive Menu (Installation/Selection)
To open the interactive menu and select skills to install:
```bash
npx github:jpolvora/workflow-skills
```

#### 2. Auto-Update (Quick Update)
If you already have skills installed and just want to update them to the latest versions, run:
```bash
npx github:jpolvora/workflow-skills update
```
*(This command automatically detects which skills are in your project's `.agents/skills/` directory and updates them silently, without requiring an interactive menu.)*

---

### Option B: Via cURL (Bash Script)
If you prefer to run the installer directly from the public repository using the shell script:

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash
```

### Interactive Menu (cURL/NPX)
Both interactive options will open the visual console menu:
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

* **Selection Toggle:** Type the number corresponding to the skill and press `Enter` to toggle on/off (`[ ]` ↔ `[x]`).
* **Select All:** Type `a` to toggle the selection of all skills at once.
* **Confirm Installation:** Type `y` or `i` and press `Enter`.
* **Exit:** Type `q` to abort the installation.

---

## 🗂️ Available Skills Catalog

> ⚠️ This section contains legacy skills. For the **complete and updated index** with all skills, layers, task router, and auto-load, see [`AGENTS.md`](AGENTS.md).

Below is the simplified index of agent guidelines included in this repository:

| Skill | Version | Description |
| :--- | :--- | :--- |
| **`code-review`** | 1.0 | **Local Code Review:** Performs deep analysis comparing the current branch with the main one. Follows a rigorous two-phase approach (triage ➔ investigation with structured evidence and hypothesis elimination). |
| **`fix-pr`** | 1.0 | **Automatic PR Fixer:** Critically analyzes code review comments and threads on PRs (e.g., Azure DevOps), decides which comments make sense, and applies surgical corrections safely. |
| **`karpathy-guidelines`** | 1.0 | **Karpathy Guidelines:** Set of behavioral guardrails to reduce common LLM failures (hallucinations, incomplete edits, code shortcuts), inspired by Andrej Karpathy's philosophy. |
| **`plan-us`** | 2.0 | **User Story Planner:** Creates detailed implementation plans based on User Stories. Auto-detects and dynamically adapts to the project ecosystem architecture (e.g., ABP/.NET/Angular, NextJS/React, etc.). |
| **`us-delivery-workflow`** | 8.0 | **End-to-End Delivery Orchestrator:** Manages the complete delivery flow of a User Story across 7 phases (F0–F6). Supports dry-run, automatic mode, step isolation (worktrees), and state hygiene protocol. |

---

## 🏗️ How to Contribute or Add a New Skill

New skills should be created inside the `.agents/skills/` directory with the following minimum structure:

```text
.agents/skills/
└── my-new-skill/
    ├── SKILL.md       # Instructions file with YAML frontmatter (required)
    ├── scripts/       # Helper scripts and validation tools (optional)
    └── README.md      # Skill-specific instructions (optional)
```

### `SKILL.md` Structure
The `SKILL.md` file at the root of each skill must contain YAML frontmatter with the correct name and description for automated detection:

```markdown
---
name: my-new-skill
description: Concise one-line summary of what the skill does.
version: 1.0
---

# My New Skill

Detailed operational instructions for the skill...
```

---

## 📄 License

This project is licensed under the MIT license — see the [LICENSE](LICENSE) file for details.
