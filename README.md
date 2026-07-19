# Workflow Skills

**Audience: humans** (install, overview, contribute).  
**Agents:** follow [`AGENTS.md`](AGENTS.md) for skill loading, task router, layers, and verification — not this file.

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — interactive skill catalog.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

Portable **agent skills** and **end-to-end workflows** for coding assistants. This repo is the upstream source: install into a consumer project, keep project config/memory local, and contribute lasting skill changes here via PR.

| Doc | Who reads it | What it covers |
|-----|--------------|----------------|
| **`README.md`** (this file) | Humans | Install, update, uninstall, safety, contribute, high-level catalog |
| **[`AGENTS.md`](AGENTS.md)** | Agents | Routing, auto-load, task router, harness verification, portability |
| **[`.agents/AGENTS.md`](.agents/AGENTS.md)** | Agents (after install) | Packaged skill index + portability rules shipped to consumers |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to `AGENTS.md` if your IDE needs one — not required by skills |

---

## Workflows

Two delivery workflows (install independently; both share `.agents/skills/shared/config.json`):

| Workflow | Best for | Summary |
|----------|----------|---------|
| **[`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md)** | Thorough delivery | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM steps 0–9) |
| **[`spec-to-pr-lite`](.agents/skills/spec-to-pr-lite/SKILL.md)** | Fast iteration | Spec → plan → implement → review → ship → fix-pr (steps 0–5) |

They run in **dual mode** in the same repo: shared config and pipeline skills, isolated state (`workflowType: standard` vs `lite`). User gates prefer a native structured choice UI when available; otherwise the same options as a markdown list ([`gates.md`](.agents/skills/shared/gates.md)). **Model:** workflows use the executing session model (`Current model` on every transition). To change model for the next step: Pause → switch in your IDE/agent host → resume (no `--model` / `--model-chain` flags). Skills stay **host-neutral** — artifact dirs come from `config.json` (`plans.dir` default `.agents/plans`; optional `reviews.dir` default `.agents/codereviews`). Details for agents: [`AGENTS.md`](AGENTS.md) § Portability. Standard orch step dispatch lives in [`STEP-DISPATCH.md`](.agents/skills/spec-to-pr/STEP-DISPATCH.md) (not used as lite step numbers). Human FAQ: [`spec-to-pr/docs/faq.md`](.agents/skills/spec-to-pr/docs/faq.md).

### Contribution policy

Pipeline and dependency skills are owned **here**. Consumer installs are managed copies — `update` overwrites skill files.

1. Change this repo → PR to `develop`
2. After merge, in the consumer: `npx --yes github:jpolvora/workflow-skills update`

**Always preserved** under `.agents/skills/shared/`: `config.json`, `stack.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`. Do not treat in-place skill edits in a consumer as permanent.

---

## Install, update, and uninstall

Skills land in your project’s `.agents/skills/`. Prefer **Node / npx**. A bash script exists only as a thin shim to the same CLI.

The CLI tracks managed skills in `.agents/skills/shared/installed-skills.json` (`skills` = all folders; `selected` = install roots). `update` refreshes tracked skills; `uninstall` removes named skills and cascades unused deps. Consumer data under `shared/` is never deleted by uninstall.

Packages in the interactive menu: `f` Full · `w` Workflows · `e` Extra (membership: [`bin/skill-dependencies.json`](./bin/skill-dependencies.json)).

### Option A — NPX (recommended)

```bash
# Interactive install
npx --yes github:jpolvora/workflow-skills

# Non-interactive install (exactly one mode; Non-TTY requires --yes)
npx --yes github:jpolvora/workflow-skills install --full --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills install --skills spec-to-pr,goal-fix-pr --yes

# Update tracked skills (bootstraps installed-skills.json from disk if missing)
npx --yes github:jpolvora/workflow-skills update

# Also install new top-level skills added upstream
npx --yes github:jpolvora/workflow-skills update --include-new

# Uninstall (cascades dependents + unused deps; preserves shared/ consumer data)
npx --yes github:jpolvora/workflow-skills uninstall --skills goal-fix-pr --yes
```

**Canonical form:** do **not** append `@latest` or `@main` to `github:jpolvora/workflow-skills`.

| Check | Command |
|-------|---------|
| Compare to latest | `npx --yes github:jpolvora/workflow-skills --check` |
| Installed version | `npx --yes github:jpolvora/workflow-skills --version` |
| Help | `npx --yes github:jpolvora/workflow-skills --help` |

**After install/update:** ask your agent to run `check-harness` (load `.agents/skills/check-harness/SKILL.md`, Phases 0–5c). Optional: `/configure-project` to fill `shared/config.json`.

#### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Exit 128 / `ssh://git@github.com/null/latest.git` | Drop `@latest` / `@main`; use `npx --yes github:jpolvora/workflow-skills` |
| Interactive hang under a pipe | Use `install … --yes` |
| Uninstall on CI/agent | Pass `--yes` (required when stdin is not a TTY) |

### Option B — cURL (shim → npx)

Requires Node/`npx`. Flags after `bash -s --` match Option A:

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s --
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- install --full --yes
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- update
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- uninstall --skills goal-fix-pr --yes
```

From a **local clone** of this repo: `./install-skills.sh` → `node bin/cli.js` (includes uncommitted changes).

### Consumer-owned `shared/` data

Edit under `.agents/skills/shared/` — never overwritten by upstream:

| File | Role |
|------|------|
| `config.json` | Project identity, stack, verification, providers (from `config.json.example`). Fill anytime via `/configure-project` (also offered during workflow setup and suggested after install) |
| `stack.md` | Human stack notes (seeded from `stack.md.example`) |
| `MEMORY.md` | Anti-regression index (`self-learning`) |
| `memory/*.md` | Individual memory entries |
| `installed-skills.json` | Managed skill list for `update` / `uninstall` |

### Optional root configuration

Consumers may add a thin root pointer so their IDE loads `AGENTS.md`, plus a `CHANGELOG.md` stub for the `changelog` skill. These are **optional** and host-specific — skills do not require them. Prefer putting lasting guidance in skills / `AGENTS.md`, not host-private rule files.

| File | Role |
|------|------|
| Host pointer (name varies by IDE) | Minimal pointer so agents follow `AGENTS.md` / `.agents/AGENTS.md` |
| `CHANGELOG.md` | Header compatible with the `changelog` skill (append-only history) |

Set `plans.dir` / `reviews.dir` in `.agents/skills/shared/config.json` to wherever your project wants workflow artifacts (defaults: `.agents/plans`, `.agents/codereviews`).

---

## Safety and how it works

- **Local CLI:** [`bin/cli.js`](./bin/cli.js) — zero runtime npm dependencies; copies from the downloaded package.
- **No remote shell install path:** curl only downloads the shim; work is done by Node/`npx`.
- **Self-overwrite guard:** remote install into this source repo is blocked (allowed under `test/` only).
- **Overwrites:** interactive install confirms once; `update` / `install --yes` overwrite skills and always keep consumer `shared/` files.
- **Latest layout only:** no folder renames or older-layout migration on update — install/update always copies the current skill tree.
- **Pack hygiene:** published tarball and install copies skip `__pycache__` / `*.pyc` and consumer-owned `shared/` data.
- **Cross-platform:** Node `fs` APIs (Windows / macOS / Linux). Bash shim sets `PYTHONIOENCODING=utf-8` for nested Python tools.

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
| [`write-a-skill`](.agents/skills/write-a-skill/SKILL.md) | Create/edit/optimize skills (Extra) |
| [`show-harness`](.agents/skills/show-harness/SKILL.md) | Snapshot active session harness (Extra) |

### Pipeline & providers

| Skill | Role |
|-------|------|
| [`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md) / [`spec-to-pr-lite`](.agents/skills/spec-to-pr-lite/SKILL.md) | Orchestrators |
| [`00-write-spec`](.agents/skills/00-write-spec/SKILL.md) … [`update-plan-implementation`](.agents/skills/update-plan-implementation/SKILL.md) | Pipeline `00`–`09` + `goal-fix-pr` / `update-plan-implementation` (`ws-*`; FSM steps 0–9 + post) |
| [`github-provider`](.agents/skills/github-provider/SKILL.md) · [`azure-devops-provider`](.agents/skills/azure-devops-provider/SKILL.md) · [`local-spec-provider`](.agents/skills/local-spec-provider/SKILL.md) | Issue/WI → spec + PR ops |

### Review & audit (Extra)

[`secrets-leak-review`](.agents/skills/secrets-leak-review/SKILL.md)

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
