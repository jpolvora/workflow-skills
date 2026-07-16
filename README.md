# 🎯 Workflow Skills — Agent Guidelines & Skills Hub

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — Interactive catalog of all skills.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

This repository centralizes a collection of behavioral agent guidelines (**skills**) and **end-to-end workflows** for agentic coding assistants. It is the **single source of truth** for installing, updating, and synchronizing these instructions across consumer projects.

This hub is designed to host **multiple workflows** over time. Each workflow is a top-level skill consumers can install independently. The repository provides two delivery workflows: `spec-to-pr` (full multi-stage pipeline) and `spec-to-pr-lite` (fast, sequential plan-to-ship loop).

> 📖 **See [`AGENTS.md`](AGENTS.md)** for the complete routing of all skills, layers, task router, and auto-load instructions (skill loading).

---

## ⭐ Workflows — Canonical Source

**This repository is the canonical upstream for consumable workflows and their pipeline dependencies.**

---

## 🚀 spec-to-pr (Full Workflow)

`spec-to-pr` is an end-to-end multi-stage pipeline orchestrator driven by a Finite State Machine (FSM, Steps 0–13). It delegates each software development phase to a specialized sub-skill, ensuring a thorough, verified build loop.

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
| Spec protocol | [`spec-format`](.agents/skills/spec-format/SKILL.md) | Canonical spec format validation |
| Loop primitive | [`goal-loop`](.agents/skills/goal-loop/SKILL.md) | Generic convergence loop (used by `09-goal-fix-pr`) |
| Provider | [`github-provider`](.agents/skills/github-provider/SKILL.md) | GitHub issue→spec and PR create/threads/merge |
| Provider | [`azure-devops-provider`](.agents/skills/azure-devops-provider/SKILL.md) | Azure DevOps work item→spec and PR create/threads/merge |
| Provider | [`local-spec-provider`](.agents/skills/local-spec-provider/SKILL.md) | Local `*.spec.md` register/normalize (PR via `providers.scm`) |

For comprehensive FSM details, setup, and triggers, see [spec-to-pr/SKILL.md](.agents/skills/spec-to-pr/SKILL.md).

---

## ⚡ spec-to-pr-lite (Lite Workflow)

`spec-to-pr-lite` is a fast, sequential alternative designed for rapid iteration on projects that already possess a target specification (a pre-written markdown file, GitHub issue ID, or Azure DevOps work item ID). It skips brainstorming, interviews, and DAG decomposition to run planning, implementation, review, and shipping in a rapid, direct loop.

### `spec-to-pr-lite` Steps

- **Step 1: Planning and Brainstorm**: Drafts `step-01-{slug}.plan.md` using `01-write-plan`.
- **Step 2: Implementation**: Runs sequential coding using `04-implement-tasks` (build mode).
- **Step 3: Code Review & Fix**: Runs local code reviews via `06-code-review` and automatically fixes findings.
- **Step 4: Consolidation & Delivery**: Consolidates results and commits delivery plan.
- **Step 5: Ship & PR (Optional)**: Opens Pull Requests and merges via SCM provider.

For complete workflow instructions, resume flows, and tags, see [spec-to-pr-lite/SKILL.md](.agents/skills/spec-to-pr-lite/SKILL.md).

---

## 🔄 Dual-Mode Execution & Compatibility

Both workflows are designed to co-exist in **dual mode** within the same repository:
- **Shared Configuration**: They share `.agents/skills/shared/config.json` as their single source of truth. The `spec-to-pr-lite` FSM, SCM providers, and dependency scripts automatically fall back to the standard config if their local config is missing.
- **State Isolation**: State files are flagged with `workflowType: standard` or `workflowType: lite` in their frontmatter. Resume discovery automatically filters workflows by type, preventing cross-resuming between standard and lite modes.
- **Shared Skills**: Both workflows leverage the same underlying pipeline skills (`01-write-plan`, `04-implement-tasks`, `06-code-review`, and `11-ship-pr`), keeping execution highly efficient, modular, and lightweight.

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

You can install or update the agent guidelines (**skills**) directly into the `.agents/skills` folder of your local development project.

**Preferred (Node / npx):** interactive install with package shortcuts (`f` Full · `w` Workflows · `e` Extra), individual skill toggles with transitive dependency auto-select, `update`, `update --include-new`, `config.json` / `self-learning/memory/` preservation, and packaged `.agents/AGENTS.md`. Dependency membership lives in [`bin/skill-dependencies.json`](./bin/skill-dependencies.json).

**Legacy (bash):** [`install-skills.sh`](./install-skills.sh) remains available for curl-based flat installs, but prefer the Node CLI for packages, dependency selection, and updates. The bash script preserves `config.json` on overwrite and installs `.agents/AGENTS.md`, but does not implement package shortcuts or `update --include-new`.

### Option A: Via NPX (Recommended)
If you have Node.js installed, you can run the CLI directly via `npx` natively and cross-platform:

#### 1. Interactive Menu (Installation/Selection)
To open the interactive menu and select skills (or packages) to install:
```bash
npx github:jpolvora/workflow-skills
```

Package shortcuts in the menu:
- `f` — **Full** (all installable skills + `shared/` config hub)
- `w` — **Workflows** (orchestrators + pipeline/provider/harness deps + hub)
- `e` — **Extra** (standalone review/design/meta skills; no orchestrators)
- number — toggle one skill (also selects its install dependencies)
- `a` — select/deselect all · `y` — install · `q` — quit

See the site catalog section **Installation packages** for membership details.
#### 2. Auto-Update (Quick Update)
If you already have skills installed and just want to update them to the latest versions, run:
```bash
npx github:jpolvora/workflow-skills update
```
*(Updates skills that already exist locally and preserves each skill's `config.json`.)*

To also install **new** top-level skills added upstream (for example `github-provider`, `azure-devops-provider`, `local-spec-provider`), run:
```bash
npx github:jpolvora/workflow-skills update --include-new
```
*(Plain `update` does not create folders that are not already present in the consumer project.)*

#### 3. Always Get the Latest Version
By default, `npx` caches package resolutions for up to 7 days. To force `npx` to fetch the latest from GitHub every time, use `@latest` or `@main`:
```bash
npx github:jpolvora/workflow-skills@latest update
npx github:jpolvora/workflow-skills@main update
```
This bypasses the npx cache and always resolves the current HEAD of the main branch.

#### 4. Version Check
To see your installed version and compare it against the latest online release:
```bash
npx github:jpolvora/workflow-skills --check
```
Or just print the installed version:
```bash
npx github:jpolvora/workflow-skills --version
```

#### 5. Post-Install: Validate the Harness
After installing or updating skills, load the `check-harness` skill to scan for integrity issues:
```text
Load `.agents/skills/check-harness/SKILL.md` and execute Phases 0–5c.
```
The audit detects phantom skills, broken links, stale references, and fixes routing tables and indexes.

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
Packages: 'f' Full · 'w' Workflows · 'e' Extra
Toggle: number · 'a' all · Selecting a skill also selects its deps.
Deselect does not cascade (deps stay selected).
Enter 'y' or 'i' to install · 'q' to quit.
------------------------------------------------------------

  [ ]  1) 00-write-spec
  ...
  [ ] 14) caveman
  ...
  [ ] 35) write-a-skill

Selected: 0 / 35
```

* **Packages:** `f` Full · `w` Workflows · `e` Extra (see [`bin/skill-dependencies.json`](./bin/skill-dependencies.json)).
* **Selection Toggle:** Type the skill number and press `Enter` to toggle on/off. Turning a skill **on** also selects its transitive install dependencies. Turning **off** does not cascade-deselect dependencies.
* **Select All:** Type `a` to toggle all skills.
* **Confirm Installation:** Type `y` or `i` and press `Enter`.
* **Exit:** Type `q` to abort.

`shared/` is a config/docs hub (not a selectable skill). It is installed/updated automatically with Full or Workflows (and when workflow skills are selected).
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

> 📖 For the **complete routing index** with layers, task router, auto-load rules, and skill loading precedence, see [`AGENTS.md`](AGENTS.md). The interactive catalog website is at [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills).

### Harness & Infrastructure

| Skill | Description |
| :--- | :--- |
| [`check-harness`](.agents/skills/check-harness/SKILL.md) | Audit harness integrity — routing, broken links, orphan skills, portability |
| [`check-workflows`](.agents/skills/check-workflows/SKILL.md) | Validate workflow FSM paths, step continuity, config sharing, and state isolation |
| [`write-a-skill`](.agents/skills/write-a-skill/SKILL.md) | Create new skills with proper structure and progressive disclosure |

### Engineering Standards

| Skill | Description |
| :--- | :--- |
| [`mobile-first-design`](.agents/skills/mobile-first-design/SKILL.md) | Responsive mobile-first design guidelines |
| [`design-taste-frontend`](.agents/skills/taste-skill/SKILL.md) | Anti-slop frontend — landing pages, portfolios, redesigns |

### `spec-to-pr` Pipeline (Steps 00–11)

| Skill | Step(s) | Description |
| :--- | :--- | :--- |
| [`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md) | Orchestrator | Full Spec → PR FSM (F0–F6, Steps 0–13) |
| [`00-write-spec`](.agents/skills/00-write-spec/SKILL.md) | 0 | Draft canonical spec from feature description |
| [`01-write-plan`](.agents/skills/01-write-plan/SKILL.md) | 1 | Generate implementation plan from spec |
| [`02-interview`](.agents/skills/02-interview/SKILL.md) | 2 | Audit and refine plan until shared understanding |
| [`03-plan-to-tasks`](.agents/skills/03-plan-to-tasks/SKILL.md) | 3 | Break plan into atomic DAG tasks |
| [`04-implement-tasks`](.agents/skills/04-implement-tasks/SKILL.md) | 5, 10 | Execute or fix code following plan/DAG |
| [`05-verify-plan`](.agents/skills/05-verify-plan/SKILL.md) | 6 | Verify deliverables against acceptance criteria |
| [`06-code-review`](.agents/skills/06-code-review/SKILL.md) | 9 | Two-phase code review (triage → investigation) |
| [`07-integration-validation`](.agents/skills/07-integration-validation/SKILL.md) | 11 | Pre-PR integration test battery |
| [`08-fix-pr`](.agents/skills/08-fix-pr/SKILL.md) | 13 (via ship-pr) | Resolve active PR review threads |
| [`09-goal-fix-pr`](.agents/skills/09-goal-fix-pr/SKILL.md) | 13 (via ship-pr) | Loop fix-pr until zero open threads |
| [`10-update-plan-implementation`](.agents/skills/10-update-plan-implementation/SKILL.md) | Post-workflow | Capture QA findings and apply plan deltas |
| [`11-ship-pr`](.agents/skills/11-ship-pr/SKILL.md) | 13 | End-to-end PR delivery and merge |

### Providers

| Skill | Description |
| :--- | :--- |
| [`github-provider`](.agents/skills/github-provider/SKILL.md) | GitHub issue→spec; auth; PR create/threads/merge |
| [`azure-devops-provider`](.agents/skills/azure-devops-provider/SKILL.md) | Azure DevOps work item→spec; PAT auth; PR create/threads/merge |
| [`local-spec-provider`](.agents/skills/local-spec-provider/SKILL.md) | Local `*.spec.md` detect/register; PR via configured SCM |

### Review & Audit

| Skill | Description |
| :--- | :--- |
| [`security-review`](.agents/skills/security-review/SKILL.md) | Security review (OWASP, injection, XSS, auth, crypto) |
| [`dotnet-security-performance-review`](.agents/skills/dotnet-security-performance-review/SKILL.md) | C# security and performance review (login, auth, EF) |
| [`tdd-sdd-ddd-reviewer`](.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md) | Architectural audit (Clean Architecture, TDD, DDD) |
| [`domain-review`](.agents/skills/domain-review/SKILL.md) | Domain/bounded-context review |
| [`multi-domain-review`](.agents/skills/multi-domain-review/SKILL.md) | Batch review of multiple domains |
| [`secrets-leak-review`](.agents/skills/secrets-leak-review/SKILL.md) | Secrets / PII / credential leak scan |

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

This project is licensed under the MIT license — see the LICENSE file for details.
