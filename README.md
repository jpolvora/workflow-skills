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
| **[`AGENTS.md`](AGENTS.md)** | Agents (upstream) | Full skill router, layers, verification, portability |
| **[`.agents/skills/shared/AGENTS.md`](.agents/skills/shared/AGENTS.md)** | Agents (after install) | Consumer hub: config, gates, external dependencies (installed with `shared/`) |
| **[`.agents/AGENTS.md`](.agents/AGENTS.md)** | Agents (upstream authoring) | Workflows-package index for dual-hub drift checks — **not** copied to consumers |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to `AGENTS.md` if your IDE needs one — not required by skills |

---

## Workflows

Two delivery workflows (install independently; both share `.agents/skills/shared/config.json`):

| Workflow | Best for | Summary |
|----------|----------|---------|
| **[`spec-to-pr`](.agents/skills/spec-to-pr/SKILL.md)** | Thorough delivery | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM steps 0–9) |
| **[`spec-to-pr-lite`](.agents/skills/spec-to-pr-lite/SKILL.md)** | Fast iteration | Spec → plan → implement → review → ship → fix-pr (steps 0–5) |

They run in **dual mode** in the same repo: shared config and pipeline skills, isolated state (`workflowType: standard` vs `lite`). User gates prefer a native structured choice UI when available; otherwise the same options as a markdown list ([`gates.md`](.agents/skills/shared/gates.md)). **Model:** workflows use the executing session model (`Current model` on every transition). To change model for the next step: Pause → switch in your IDE/agent host → resume (no `--model` / `--model-chain` flags). Skills stay **host-neutral** — artifact dirs come from `config.json` (`plans.dir` default `.agents/plans`; optional `reviews.dir` default `.agents/codereviews`). Agents also expand fixed **path tokens** (`pathTokens.skillsRoot` / `sharedDir`, defaults `.agents/skills` and `.agents/skills/shared`) per [`tools.md`](.agents/skills/shared/tools.md) § Path tokens. Details for agents: [`AGENTS.md`](AGENTS.md) § Portability. Standard orch step dispatch lives in [`STEP-DISPATCH.md`](.agents/skills/spec-to-pr/STEP-DISPATCH.md) (not used as lite step numbers). Human FAQ: [`spec-to-pr/docs/faq.md`](.agents/skills/spec-to-pr/docs/faq.md).

### Contribution policy

Pipeline and dependency skills are owned **here**. Consumer installs are managed copies — `update` overwrites skill files.

1. Change this repo → PR to `develop`
2. After merge, in the consumer: `npx --yes github:jpolvora/workflow-skills update`

**Always preserved** under `.agents/skills/shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` (when `rules.changelogFile` points there). The installer does **not** copy `.agents/AGENTS.md`; consumer agent contract is [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md). Do not treat in-place skill edits in a consumer as permanent.

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
| Audit installed digests | `npx --yes github:jpolvora/workflow-skills integrity` |
| Installed version | `npx --yes github:jpolvora/workflow-skills --version` |
| Help | `npx --yes github:jpolvora/workflow-skills --help` |

**After install/update:** ask your agent to run `check-harness` (load `.agents/skills/check-harness/SKILL.md`, Phases 0–5c). Optional: `/configure-project` to fill `shared/config.json`.

#### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Exit 128 / `ssh://git@github.com/null/latest.git` | Drop `@latest` / `@main`; use `npx --yes github:jpolvora/workflow-skills` |
| Interactive hang under a pipe | Use `install … --yes` |
| Uninstall on CI/agent | Pass `--yes` (required when stdin is not a TTY) |
| Integrity source/consumer mismatch | Fix the tree or regenerate `bin/skill-integrity.json` upstream; `--force-integrity` is an unsafe override only |

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
| `config.json` | Project identity, stack, verification, providers, optional `pathTokens` (`skillsRoot` / `sharedDir`). **Fresh install seeds** from `config.json.example`. Fill via `/configure-project` (also offered during workflow setup and suggested after install). Gitignored — never commit |
| `STACK.md` | Human stack notes (seeded from `STACK.md.example`) |
| `MEMORY.md` | Anti-regression index (`self-learning`) |
| `memory/*.md` | Individual memory entries |
| `installed-skills.json` | Managed skill list for `update` / `uninstall` |
| `skill-integrity-local.json` | Local digest record after install/update (gitignored; never overwritten from upstream) |
| `AGENTS.md` | Consumer hub: skill loading, config, gates, external dependencies (installed with `shared/`) |
| `CHANGELOG.md` | Append-only history (seeded empty; `rules.changelogFile` defaults here) |

### Optional root / host configuration

Installer **never** writes consumer repo-root files. Consumers may add a thin root `AGENTS.md` pointing at `.agents/skills/shared/AGENTS.md` so their IDE discovers the hub; check-harness may suggest this. Host pointers are **optional**. Workflow history defaults to `.agents/skills/shared/CHANGELOG.md` via `rules.changelogFile` (set to `CHANGELOG.md` only if you want a repo-root file). Prefer putting lasting guidance in skills / the shared hub, not host-private rule files.

| File | Role |
|------|------|
| Root `AGENTS.md` (optional) | Consumer-owned thin pointer to `shared/AGENTS.md`, or project-specific hub that links there |
| Host pointer (name varies by IDE) | Minimal pointer so agents follow project `AGENTS.md` or load skills from `.agents/skills/` |
| `rules.changelogFile` target | Append-only history (default under `shared/`; optional root `CHANGELOG.md` when configured) |

Set `plans.dir` / `plans.specsDir` / `reviews.dir` in `.agents/skills/shared/config.json` (defaults: `.agents/plans`, `.agents/specs`, `.agents/codereviews`). Existing repo-root `specs/` is kept when already present. Optional `pathTokens` documents fixed install roots for agents (`{skillsRoot}` / `{sharedDir}`); see [`tools.md`](.agents/skills/shared/tools.md) § Path tokens — not relocatable like `plans.dir`.

---

## Safety and how it works

- **Local CLI:** [`bin/cli.js`](./bin/cli.js) — zero runtime npm dependencies; copies from the downloaded package.
- **No remote shell install path:** curl only downloads the shim; work is done by Node/`npx`.
- **Self-overwrite guard:** remote install into this source repo is blocked (allowed under `test/` only).
- **Overwrites:** interactive install confirms once; `update` / `install --yes` overwrite skills and always keep consumer `shared/` files.
- **Integrity checksums:** `bin/skill-integrity.json` (SHA-256) covers every installable skill tree and managed `shared/` hub templates. `install` / `update` verify the **source** package before any copy and the **consumer** tree after; mismatch exits non-zero (fail-closed). Post-copy failure does **not** auto-rollback. Unsafe override: `--force-integrity` (still writes `shared/skill-integrity-local.json` from actual digests).
- **Upstream regenerate (authors):** any change to hashed skill/hub/install inputs must run `npm run generate-integrity` and commit `bin/skill-integrity.json` in the same change; `npm run verify-integrity` must pass before claim complete / PR (see root `AGENTS.md`). `check-harness` and install tests fail closed on a stale manifest.
- **Audit:** `integrity` recomputes digests for skills listed in `installed-skills.json` and compares to `skill-integrity-local.json` (selective installs only require their closure). `--check` compares semver **and** `fullPackageDigest` when the remote integrity manifest is reachable.
- **Consumer-owned exclusions:** `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `CHANGELOG.md`, and `skill-integrity-local.json` are never hashed and never fail integrity when edited.
- **Trust limit:** the integrity manifest is **unsigned**. Fetching it shares the same trust boundary as today’s remote `package.json` / raw GitHub fetch (no publisher signing in this release).
- **Latest layout only:** no folder renames or older-layout migration on update — install/update always copies the current skill tree.
- **Pack hygiene:** published tarball and install copies skip `__pycache__` / `*.pyc` and consumer-owned `shared/` data.
- **Cross-platform:** Node `fs` APIs (Windows / macOS / Linux). Bash shim sets `PYTHONIOENCODING=utf-8` for nested Python tools.
- **Script runtimes:** **Node** is required for install/CLI. **New** managed skill scripts are Node `.cjs` only. Existing `.py` helpers stay until a tracked migration; consumers still need Python to run those leftovers. See [`tools.md`](.agents/skills/shared/tools.md) § Script launchers.

### Verify the package

```bash
npm run generate-integrity      # rebuild bin/skill-integrity.json
npm run verify-integrity        # fail if stale vs tree / package.json (required before PR)
node bin/generate-skill-integrity.js --check   # same as verify-integrity
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
| [`check-workflows`](.agents/skills/check-workflows/SKILL.md) | Deep workflow simulation & validation (Full/Lite) |
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

Agent obligations (portability, check-harness before `main`): see [`.agents/skills/shared/AGENTS.md`](.agents/skills/shared/AGENTS.md) after install and root [`AGENTS.md`](AGENTS.md) when contributing upstream.

After harness or catalog changes: regenerate the site with `node bin/build-site.js` when layers/routing change. That stamps the footer from `package.json` (no auto-bump). For an intentional release bump + site rebuild: `npm run build-site:bump` (or `node bin/build-site.js --bump`), then sync `test/package.json`’s `file:../workflow-skills-<version>.tgz` reference. CI site deploy never bumps — install/`--version`/`--check` stay aligned with the footer.

---

## License

MIT — see [LICENSE](LICENSE).
