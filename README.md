# 🎯 Workflow Skills — Agent Guidelines & Skills Hub

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — Interactive catalog of all skills.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

This repository centralizes a collection of behavioral agent guidelines (**skills**) and **end-to-end workflows** for agentic coding assistants. It is the **single source of truth** for installing, updating, and synchronizing these instructions across consumer projects.

This hub is designed to host **multiple workflows** over time. Each workflow is a top-level skill consumers can install independently. Today the primary delivery workflow is `spec-to-pr`.

> 📖 **See [`AGENTS.md`](AGENTS.md)** for the complete routing of all skills, layers, task router, and auto-load instructions (skill loading).

---

## ⭐ Workflows — Canonical Source

**This repository is the canonical upstream for consumable workflows and their pipeline dependencies.**

### `spec-to-pr` (current)

`spec-to-pr` is a full Spec → PR delivery orchestrator (FSM, Steps 0–13) that delegates each phase of the software lifecycle to a dedicated sub-skill. Every skill listed below is an **integral part of the `spec-to-pr` pipeline** — designed, versioned, and tested together as a cohesive system.

### `spec-to-pr` Dependency Graph

| Step(s) | Skill | Role in pipeline |
|---------|-------|-----------------|
| Step 0 | [`00-write-spec`](.agents/skills/00-write-spec/SKILL.md) | Draft canonical spec from free-text description |
| Step 1 | [`01-write-plan`](.agents/skills/01-write-plan/SKILL.md) | Generate implementation plan from spec |
| Step 2 | [`02-interview`](.agents/skills/02-interview/SKILL.md) | Refine and audit plan — resolve ambiguities |
| Step 3 | [`03-plan-to-tasks`](.agents/skills/03-plan-to-tasks/SKILL.md) | Break plan into atomic DAG tasks |
| Steps 5, 10 | [`04-implement-tasks`](.agents/skills/04-implement-tasks/SKILL.md) | Execute code changes (build + fix modes) |
| Step 6 | [`05-verify-plan`](.agents/skills/05-verify-plan/SKILL.md) | Verify deliverables against acceptance criteria |
| Step 9 | [`06-code-review`](.agents/skills/06-code-review/SKILL.md) | Two-phase code review (triage → investigation) |
| Step 11 | [`07-integration-validation`](.agents/skills/07-integration-validation/SKILL.md) | Pre-PR integration test battery |
| Step 13 (via ship-pr) | [`08-fix-pr`](.agents/skills/08-fix-pr/SKILL.md) | Resolve active PR review threads |
| Step 13 (via ship-pr) | [`09-goal-fix-pr`](.agents/skills/09-goal-fix-pr/SKILL.md) | Convergence loop — fix-pr until zero open threads |
| Post-workflow | [`10-update-plan-implementation`](.agents/skills/10-update-plan-implementation/SKILL.md) | Delta adjustments from QA findings |
| Step 13 | [`11-ship-pr`](.agents/skills/11-ship-pr/SKILL.md) | End-to-end PR delivery and merge |
| Spec protocol | [`spec-format`](.agents/skills/spec-to-pr/extra-skills/spec-format/SKILL.md) | Canonical spec format validation |
| Loop primitive | [`goal-loop`](.agents/skills/spec-to-pr/extra-skills/goal-loop/SKILL.md) | Generic convergence loop (used by `09-goal-fix-pr`) |

### ⚠️ Contribution Policy for `spec-to-pr` Dependencies

> **All changes to `spec-to-pr` and its dependency skills MUST originate from this repository.**
>
> Consumer projects that install these skills via `npx github:jpolvora/workflow-skills` receive **read-only copies** of the pipeline. If you find a bug, want to improve a skill, or need to extend its behavior:
>
> 1. **Fork or clone this repository** — `https://github.com/jpolvora/workflow-skills`
> 2. **Make your changes here** (the upstream source)
> 3. **Open a PR** against the `develop` branch
> 4. Once merged, **run `npx github:jpolvora/workflow-skills update`** in your consumer project to pull in the changes
>
> **Do not edit skill files directly inside a consumer project** — they will be overwritten on the next `update` run (except for your `config.json`, which is always preserved).

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
*(Updates skills that already exist locally and preserves each skill's `config.json`. Use `update --include-new` to also install skills added upstream that are not yet in the consumer project.)*

---

### Interactive Menu (NPX)
The installer opens the visual console menu:
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
  [ ]  5) spec-to-pr
```

* **Selection Toggle:** Type the number corresponding to the skill and press `Enter` to toggle on/off (`[ ]` ↔ `[x]`).
* **Select All:** Type `a` to toggle the selection of all skills at once.
* **Confirm Installation:** Type `y` or `i` and press `Enter`.
* **Exit:** Type `q` to abort the installation.

---

## 🔒 Safety, Reliability & How it Works

The workflow-skills installation engine is designed to be lightweight, secure, and cross-platform.

### 🛡️ Safety & Security
* **Zero Remote Shell Execution:** The NPX script runs completely locally using package files downloaded directly from Git/npm. It does not execute arbitrary scripts from remote hosts behind the scenes.
* **No External Dependencies:** The CLI installer ([bin/cli.js](./bin/cli.js)) has **zero runtime dependencies** outside of native Node.js core modules. This minimizes the risk of dependency confusion or supply chain vulnerabilities.
* **Accidental Self-Overwrite Protection:** The installer checks if the target installation directory matches the source repository. Running remote installation commands inside the core `workflow-skills` source repository itself is blocked to prevent developers from accidentally overwriting local guideline changes (except inside the `test/` folder).
* **Conservative Overwrites:** If a skill directory already exists in the target project, the installer prompts for explicit confirmation (`Overwrite? (y/n)`) before removing the old folder.

### ⚙️ Reliability & Portability
* **Native Node.js API:** The CLI tool uses built-in filesystem APIs (`fs.copyFileSync`, `fs.mkdirSync`, `fs.rmSync`) instead of spawning OS shell commands (`cp`, `mkdir`, `rm`). This makes the installer **100% cross-platform compatible**, working seamlessly on Windows (PowerShell/CMD), macOS, and Linux.
* **Offline-Friendly Local Execution:** You can pack the repository locally (`npm pack`) and run the test consumer directly on the resulting package file.

### 🧪 Automated Test Runner
The repository features an automated test runner ([test/test-install.js](./test/test-install.js)) that automatically packs the current state, installs it into a clean test project environment (`test/`), runs the interactive selection, and performs a recursive diff/verification of the installed files against the source. You can trigger it with:
```bash
# Run remote installation verification
npm run tests

# Run local installation verification (using your uncommitted changes)
npm run tests -- --local
```

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
| **`spec-to-pr`** | 8.0 | **End-to-End Delivery Orchestrator:** Manages the complete delivery flow of a User Story across 7 phases (F0–F6). Supports dry-run, automatic mode, step isolation (worktrees), and state hygiene protocol. |

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
