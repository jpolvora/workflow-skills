# Workflow Skills

**Audience: humans** (install, overview, contribute).  
**Agents:** follow [`AGENTS.md`](AGENTS.md) for skill loading, task router, layers, and verification — not this file.

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — interactive skill catalog.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

Portable **agent skills** and **end-to-end workflows** for coding assistants. This repo is the upstream source: install into a consumer project, keep project config/memory local, and contribute lasting skill changes here via PR.

| Doc | Who reads it | What it covers |
|-----|--------------|----------------|
| **`README.md`** (this file) | Humans | Install, update, safety, contribute, high-level catalog |
| **[`AGENTS.md`](AGENTS.md)** | Agents | Routing, auto-load, task router, harness verification |
| **[`.agents/AGENTS.md`](.agents/AGENTS.md)** | Agents (after install) | Packaged skill index + portability rules shipped to consumers |

---

## Workflows

Two delivery workflows (install independently; both share `.agents/skills/shared/config.json`):

| Workflow | Best for | Summary |
|----------|----------|---------|
| **[`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md)** | Thorough delivery | Spec → plan → tasks → implement → verify → review → integrate → PR (FSM steps 0–13) |
| **[`spec-to-pr-lite`](.agents/skills/spec-to-pr-lite/SKILL.md)** | Fast iteration with an existing spec | Plan → implement → review → deliver → optional ship (steps 1–5) |

They run in **dual mode** in the same repo: shared config and pipeline skills, isolated state (`workflowType: standard` vs `lite`). Details for agents: [`AGENTS.md`](AGENTS.md).

### Contribution policy

Pipeline and dependency skills are owned **here**. Consumer installs are managed copies — `update` overwrites skill files.

1. Change this repo → PR to `develop`
2. After merge, in the consumer: `npx --yes github:jpolvora/workflow-skills update`

**Always preserved** under `.agents/skills/shared/`: `config.json`, `stack.md`, `MEMORY.md`, `memory/*`. Do not treat in-place skill edits in a consumer as permanent.

---

## Install and update

Skills land in your project’s `.agents/skills/`. Prefer **Node / npx**. A bash script exists only as a thin shim to the same CLI.

Packages in the interactive menu: `f` Full · `w` Workflows · `e` Extra (membership: [`bin/skill-dependencies.json`](./bin/skill-dependencies.json)).

### Option A — NPX (recommended)

```bash
# Interactive install
npx --yes github:jpolvora/workflow-skills

# Update existing skills (preserves shared/ consumer data)
npx --yes github:jpolvora/workflow-skills update

# Also install new top-level skills added upstream
npx --yes github:jpolvora/workflow-skills update --include-new
```

Non-interactive (CI / agents — still use human docs here for the commands):

```bash
npx --yes github:jpolvora/workflow-skills install --full --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills install --skills spec-to-pr,08-fix-pr --yes
```

Exactly one of `--full`, `--package <full|workflows|extra>`, or `--skills <csv>` is required. Non-TTY stdin requires `--yes`.

**Canonical form:** do **not** append `@latest` or `@main` to `github:jpolvora/workflow-skills`.

| Check | Command |
|-------|---------|
| Compare to latest | `npx --yes github:jpolvora/workflow-skills --check` |
| Installed version | `npx --yes github:jpolvora/workflow-skills --version` |

**After install/update:** ask your agent to run `check-harness` (load `.agents/skills/check-harness/SKILL.md`, Phases 0–5c).

#### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Exit 128 / `ssh://git@github.com/null/latest.git` | Drop `@latest` / `@main`; use `npx --yes github:jpolvora/workflow-skills` |
| Interactive hang under a pipe | Use `install … --yes` |

### Option B — cURL (shim → npx)

Requires Node/`npx`. Flags after `bash -s --` match Option A:

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s --
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- install --full --yes
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- update
```

From a **local clone** of this repo: `./install-skills.sh` → `node bin/cli.js` (includes uncommitted changes).

### Consumer-owned `shared/` data

Edit under `.agents/skills/shared/` — never overwritten by upstream:

| File | Role |
|------|------|
| `config.json` | Project identity, stack, verification, providers (from `config.json.example`) |
| `stack.md` | Human stack notes (seeded from `stack.md.example`) |
| `MEMORY.md` | Anti-regression index (`self-learning`) |
| `memory/*.md` | Individual memory entries |

### Optional root seeds (create-if-missing)

On Full / workflow installs (when the `shared/` hub is ensured), the CLI also seeds at the **project root** if missing — existing files are never overwritten:

| File | Role |
|------|------|
| `.cursorrules` | Minimal English pointer so agents follow `AGENTS.md` |
| `CHANGELOG.md` | Stub compatible with the `changelog` skill (append-only history) |

These are optional accompaniment only. They do **not** seed or overwrite consumer-owned `shared/` files (`config.json`, `stack.md`, `MEMORY.md`, `memory/*`).

---

## Safety and how it works

- **Local CLI:** [`bin/cli.js`](./bin/cli.js) — zero runtime npm dependencies; copies from the downloaded package.
- **No remote shell install path:** curl only downloads the shim; work is done by Node/`npx`.
- **Self-overwrite guard:** remote install into this source repo is blocked (allowed under `test/` only).
- **Overwrites:** interactive install confirms once; `update` / `install --yes` overwrite skills and always keep consumer `shared/` files (and never clobber existing root `.cursorrules` / `CHANGELOG.md`).
- **Cross-platform:** Node `fs` APIs (Windows / macOS / Linux).

### Verify the package

```bash
npm run tests              # remote-style install check
npm run tests -- --local   # pack current tree into test/
```

---

## Skill catalog (overview)

Full **routing and auto-load rules** live in [`AGENTS.md`](AGENTS.md). Browse the site: [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills).

### Harness

| Skill | Description |
|-------|-------------|
| [`check-harness`](.agents/skills/check-harness/SKILL.md) | Audit routing, links, portability |
| [`check-workflows`](.agents/skills/check-workflows/SKILL.md) | Validate workflow FSM / dual-mode |
| [`write-a-skill`](.agents/skills/write-a-skill/SKILL.md) | Author new skills |

### Engineering standards

| Skill | Description |
|-------|-------------|
| [`mobile-first-design`](.agents/skills/mobile-first-design/SKILL.md) | Mobile-first UI |
| [`design-taste-frontend`](.agents/skills/taste-skill/SKILL.md) | Anti-slop frontend |

### Pipeline & providers

| Skill | Role |
|-------|------|
| [`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md) / [`spec-to-pr-lite`](.agents/skills/spec-to-pr-lite/SKILL.md) | Orchestrators |
| [`00-write-spec`](.agents/skills/00-write-spec/SKILL.md) … [`11-ship-pr`](.agents/skills/11-ship-pr/SKILL.md) | Pipeline steps |
| [`github-provider`](.agents/skills/github-provider/SKILL.md) · [`azure-devops-provider`](.agents/skills/azure-devops-provider/SKILL.md) · [`local-spec-provider`](.agents/skills/local-spec-provider/SKILL.md) | Issue/WI → spec + PR ops |

### Review & audit

[`security-review`](.agents/skills/security-review/SKILL.md) · [`dotnet-security-performance-review`](.agents/skills/dotnet-security-performance-review/SKILL.md) · [`tdd-sdd-ddd-reviewer`](.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md) · [`domain-review`](.agents/skills/domain-review/SKILL.md) · [`multi-domain-review`](.agents/skills/multi-domain-review/SKILL.md) · [`secrets-leak-review`](.agents/skills/secrets-leak-review/SKILL.md)

---

## Contribute a skill

Minimum layout:

```text
.agents/skills/my-new-skill/
├── SKILL.md       # required — YAML frontmatter + instructions (en-us)
├── scripts/       # optional
└── README.md      # optional — human notes for that skill only
```

Frontmatter example:

```markdown
---
name: my-new-skill
description: Concise one-line summary of what the skill does.
version: 1.0
---
```

Agent obligations (portability, check-harness before `main`, dual indexes): see [`.agents/AGENTS.md`](.agents/AGENTS.md) and root [`AGENTS.md`](AGENTS.md).

After harness or catalog changes: regenerate the site with `node bin/build-site.js` when layers/routing change.

---

## License

MIT — see [LICENSE](LICENSE).
