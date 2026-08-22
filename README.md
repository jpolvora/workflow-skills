# Workflow Skills

**Audience: humans** (install, overview, contribute).  
**Agents:** follow [`AGENTS.md`](AGENTS.md) for skill loading, task router, layers, and verification — not this file.

> **Site:** [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills) — interactive skill catalog.

[![npx](https://img.shields.io/badge/npx-github:jpolvora/workflow--skills-blue?logo=npm)](https://github.com/jpolvora/workflow-skills)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-site-success?logo=github)](https://jpolvora.github.io/workflow-skills)

Portable **agent skills** that take a feature spec to a reviewed pull request. Install into a project, keep config and memory local, contribute lasting skill changes here via PR.

| Doc | Who reads it | What it covers |
|-----|--------------|----------------|
| **`README.md`** (this file) | Humans | Install, update, uninstall, safety, contribute, high-level catalog |
| **[`AGENTS.md`](AGENTS.md)** | Agents (upstream) | Full skill router, layers, verification, portability |
| **[`CATALOG.md`](CATALOG.md)** | Agents + site generator | On-demand skill inventory, task router, and upstream maintenance commands |
| **[`.agents/skills/ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)** | Agents (after install) | Consumer hub: config, gates, external dependencies (installed with `ws-shared/`) |
| **[`.agents/skills/ws-shared/autoload.md`](.agents/skills/ws-shared/autoload.md)** | Agents (every session) | Always-applied skill set + specs progressive-disclosure router + hub contracts (SCM parity, verify score) |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to `AGENTS.md` if your IDE needs one — not required by skills |

---

## Features

| You get | How it works |
|---------|--------------|
| **Spec to reviewed PR** | Standard pipeline: spec, plan, interview, implement, verify, commit, review, test, ship, fix threads with a proactive same-class sweep before resolve (steps 0–9). |
| **A faster path** | Lite pipeline: spec, plan, implement, commit, review, ship (steps 0–5). Same GitHub or Azure PR ops. |
| **A derived 9/10 verify bar** | Standard Step 5 advances only at a ledger-derived score **≥ 9**. Evidence links, configured checks, findings, and sabotage outcomes determine the score; agents cannot author or override it. Optional `scoreAndRefine` second pass then reviews the full diff for overengineering and unused workflow-introduced artifacts. |
| **Verifiable runtime artifacts** | Atomic Node state updates publish deterministic `run.json` / `run.md`, a repo plans index, per-step JSONL telemetry, and a machine-readable AC ledger. |
| **Smaller dispatch context** | Bounded subagent contracts and indexed plan slices replace repeated full-document payloads. Context and MEMORY budgets fail closed when exceeded. |
| **GitHub and Azure, same ops** | Both providers implement the same intents ([`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md)). Extra intent on one side fails `npm run test`. |
| **Hermes delivery disciplines** | Prior-work sweep before plan/code; design-intent git history; repo-wide defect-class fixes; regression sabotage when mutation is unset; CI triage via extended `check-pr-status`; tracker close-loop via `comment-issue`. |
| **Safe shell recipes** | Phase 5a blocks nested-quote `python -c` / `node -e` one-liners; `ws-audit` classifies those SyntaxErrors and offers a draft-remediation user-gate. |
| **Commit, then review** | Product files commit after verify (standard) or after implement (lite). Review diffs `{base}...HEAD`. Review fixes get a second commit. Plan files wait until ship. |
| **Any agent, your repo** | Skills are markdown plus scripts. Paths come from `config.json`. Config, memory, and changelog stay local on update. |
| **Two speeds, one config** | Standard and lite share `config.json`. Isolated state (`workflowType`); no cross-resume. New runs ask stay-on-branch or `feat/{slug}`. |
| **One task at a time** | `defaults.enableDag` is `false`. Set `true` for parallel DAG. To change the orchestrator model: Pause, switch it in the session host, then Resume. |

---

## Workflows

Two delivery workflows (install independently; both share `.agents/skills/ws-shared/config.json`):

| Workflow | Best for | Summary |
|----------|----------|---------|
| **[`ws-spec-to-pr`](.agents/skills/ws-spec-to-pr/SKILL.md)** | Thorough delivery | Spec → plan → interview → implement → check → **product commit** → review → **review-fix commit** → test → ship → fix-pr (FSM steps 0–9) |
| **[`ws-spec-to-pr-lite`](.agents/skills/ws-spec-to-pr-lite/SKILL.md)** | Fast iteration | Spec → plan → implement → **product commit** → review → **review-fix commit** → ship → fix-pr (steps 0–5) |
| **[`ws-multi-spec`](.agents/skills/ws-multi-spec/SKILL.md)** | Smart batch delivery | Sequential multi-spec queue execution with smart flow auto-detection (`ws-spec-to-pr` vs `ws-spec-to-pr-lite` per spec complexity) |
| **[`ws-fable-method`](.agents/skills/ws-fable-method/SKILL.md)** | Direct problem solving | 7-step loop with Triviality & Fit gates (classify → define done → evidence → decide → act → verify → report) |

See **Features** above for the operating model. Gates: [`gates.md`](.agents/skills/ws-shared/gates.md). Agent contract: [`AGENTS.md`](AGENTS.md) § Dual-mode. Human FAQ: [`ws-spec-to-pr/docs/faq.md`](.agents/skills/ws-spec-to-pr/docs/faq.md). Site FAQ: [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills#faq).

### Contribution policy

Pipeline and dependency skills are owned **here**. Consumer installs are managed copies — `update` overwrites skill files.

1. Change this repo → PR to `develop`
2. After merge, in the consumer: `npx --yes github:jpolvora/workflow-skills update`

**Always preserved** under `.agents/skills/ws-shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` (when `rules.changelogFile` points there). The consumer agent contract is [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — the installer ships no separate packaged index and never writes repo-root files. Do not treat in-place skill edits in a consumer as permanent.

---

## Install, update, and uninstall

Skills land in your project’s `.agents/skills/`. Prefer **Node / npx**. A bash script exists only as a thin shim to the same CLI.

The CLI tracks managed skills in `.agents/skills/ws-shared/installed-skills.json` (`skills` = all folders; `selected` = install roots). `update` refreshes tracked skills; `uninstall` removes named skills and cascades unused deps. Consumer data under `ws-shared/` is never deleted by uninstall.

Packages in the interactive menu: `f` Full · `w` Workflows · `e` Extra (membership: [`bin/skill-dependencies.json`](./bin/skill-dependencies.json)).

### Option A — NPX (recommended)

```bash
# Interactive install (prompts for Global vs Project scope)
npx --yes github:jpolvora/workflow-skills

# Non-interactive install (project scope by default; when cwd is user home (~), defaults to Global scope)
npx --yes github:jpolvora/workflow-skills install --full --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --global --yes
npx --yes github:jpolvora/workflow-skills install --skills ws-spec-to-pr,ws-goal-fix-pr --project --yes

# Update tracked skills (project or global scope)
npx --yes github:jpolvora/workflow-skills update
npx --yes github:jpolvora/workflow-skills update --global

# Also install new top-level skills added upstream
npx --yes github:jpolvora/workflow-skills update --include-new

# Uninstall (cascades dependents + unused deps; preserves ws-shared/ consumer data)
npx --yes github:jpolvora/workflow-skills uninstall --skills ws-goal-fix-pr --yes
npx --yes github:jpolvora/workflow-skills uninstall --skills ws-tdah --global --yes
```

**Canonical form:** do **not** append `@latest` or `@main` to `github:jpolvora/workflow-skills`.

| Check | Command |
|-------|---------|
| Compare to latest | `npx --yes github:jpolvora/workflow-skills --check` |
| Audit installed digests | `npx --yes github:jpolvora/workflow-skills integrity` |
| Rebuild telemetry aggregate | `npx --yes github:jpolvora/workflow-skills telemetry aggregate` |
| Render telemetry report | `npx --yes github:jpolvora/workflow-skills telemetry report` |
| Installed version | `npx --yes github:jpolvora/workflow-skills --version` |
| Help | `npx --yes github:jpolvora/workflow-skills --help` |

**After install/update:** ask your agent to run `ws-check-harness` (load `.agents/skills/ws-check-harness/SKILL.md`, Phases 0–5c). Optional: `/ws-configure-project` to fill `ws-shared/config.json`.

#### Hybrid / global installs

When skills live under `$HOME/.agents/skills` (global) or a mix of global + project-local trees, managed scripts still read and write **consumer** data from the open project — not from the global hub beside the script on disk.

- **Consumer root:** `$PWD/.agents/skills/ws-shared/config.json` (or `config.json.example`) when present; otherwise pass `--repo-root <dir>` to target the project explicitly.
- **Skill scripts:** recipes expand `{skillsRoot}/ws-<id>/scripts/...` when that path exists in the project, then fall back to `{globalSkillsRoot}` (see [`tools.md`](.agents/skills/ws-shared/tools.md) rule 10).
- **Project-local scripts** (installed under the consumer `.agents/skills/`, not under the global root) resolve the consumer via `parents[4]` from the script path when cwd has no hub.

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
curl -fsSL https://raw.githubusercontent.com/jpolvora/workflow-skills/main/install-skills.sh | bash -s -- uninstall --skills ws-goal-fix-pr --yes
```

From a **local clone** of this repo: `./install-skills.sh` → `node bin/cli.js` (includes uncommitted changes).

### Consumer-owned `shared/` data

Edit under `.agents/skills/ws-shared/` — never overwritten by upstream:

| File | Role |
|------|------|
| `config.json` | Project identity, stack, verification, providers, and optional path tokens. **Fresh install seeds** from `config.json.example`; fill via `/ws-configure-project`. New runtime controls include test globs, context budget, optional parallel verify/review, step or phase gates, adaptive convergence, diagnostics storage, and portable phase-model identifiers. `fable.auditVerdictsBlockShip` defaults to `"refuted"`; `"caveats"` is an explicit stricter policy. Gitignored and never committed. |
| `STACK.md` | Human stack notes (seeded from `STACK.md.example`) |
| `MEMORY.md` | Anti-regression index (`ws-self-learning`) |
| `memory/*.md` | Individual memory entries |
| `installed-skills.json` | Managed skill list for `update` / `uninstall` |
| `skill-integrity-local.json` | Local digest record after install/update (gitignored; never overwritten from upstream) |
| `AGENTS.md` | Consumer hub: skill loading, config, gates, external dependencies (installed with `shared/`) |
| `CHANGELOG.md` | Append-only history (seeded empty; `rules.changelogFile` defaults here) |

### Optional root / host configuration

Installer **never** writes consumer repo-root files. Consumers may add a thin root `AGENTS.md` pointing at `.agents/skills/ws-shared/AGENTS.md` so their IDE discovers the hub; ws-check-harness may suggest this. Host pointers are **optional**. Workflow history defaults to `.agents/skills/ws-shared/CHANGELOG.md` via `rules.changelogFile` (set to `CHANGELOG.md` only if you want a repo-root file). Prefer putting lasting guidance in skills / the shared hub, not host-private rule files.

| File | Role |
|------|------|
| Root `AGENTS.md` (optional) | Consumer-owned thin pointer to `ws-shared/AGENTS.md`, or project-specific hub that links there |
| Host pointer (name varies by IDE) | Minimal pointer so agents follow project `AGENTS.md` or load skills from `.agents/skills/` |
| `rules.changelogFile` target | Append-only history (default under `ws-shared/`; optional root `CHANGELOG.md` when configured) |

Set `plans.dir` / `plans.specsDir` / `reviews.dir` in `.agents/skills/ws-shared/config.json` (defaults: `.agents/plans`, `.agents/specs`, `.agents/codereviews`). Skill tokens: `{plansDir}` ← `plans.dir`, `{specsDir}` ← `plans.specsDir`, `{reviewsDir}` ← `reviews.dir`. Existing repo-root `specs/` is kept when already present and `plans.specsDir` is omitted. Optional `pathTokens` documents fixed install roots for agents (`{skillsRoot}` / `{sharedDir}`); see [`tools.md`](.agents/skills/ws-shared/tools.md) § Path tokens — not relocatable like `plans.dir`.

### Optional engineering delivery gate

The Workflows package includes [`ws-senior-developer`](.agents/skills/ws-senior-developer/SKILL.md). Fresh installs seed `rules.seniorDeveloper` to `.agents/skills/ws-senior-developer/SKILL.md` in consumer-owned `.agents/skills/ws-shared/config.json` (set `""` to disable or point at another guardrail). The installer does not create or modify a root `AGENTS.md`.

---

## Safety and how it works

- **Local CLI:** [`bin/cli.js`](./bin/cli.js) — zero runtime npm dependencies; copies from the downloaded package.
- **No remote shell install path:** curl only downloads the shim; work is done by Node/`npx`.
- **Self-overwrite guard:** remote install into this source repo is blocked (allowed under `test/` only).
- **This clone vs a global install:** you may have `ws-*` both here (`.agents/skills/`) and under `~/.agents/skills` (`WORKFLOW_SKILLS_GLOBAL_DIR` if set). Edit only this clone. Do not edit, uninstall, or “sync” the global copies from a session in this repo. Details: [This clone vs a global install](#this-clone-vs-a-global-install).
- **Overwrites:** interactive install confirms once; `update` / `install --yes` overwrite skills and always keep consumer `shared/` files.
- **Integrity checksums:** `bin/skill-integrity.json` (SHA-256) covers every installable skill tree and managed `ws-shared/` hub templates. `install` / `update` verify the **source** package before any copy and the **consumer** tree after; mismatch exits non-zero (fail-closed). Post-copy failure does **not** auto-rollback. Unsafe override: `--force-integrity` (still writes `ws-shared/skill-integrity-local.json` from actual digests).
- **Upstream regenerate (authors):** any change to hashed skill/hub/install inputs must run `npm run generate-integrity` and commit `bin/skill-integrity.json` in the same change; `npm run verify-integrity` must pass before claim complete / PR (see root `AGENTS.md`). `ws-check-harness` and install tests fail closed on a stale manifest.
- **Audit:** `integrity` recomputes digests for skills listed in `installed-skills.json` and compares to `skill-integrity-local.json` (selective installs only require their closure). `--check` compares semver **and** `fullPackageDigest` when the remote integrity manifest is reachable.
- **Consumer-owned exclusions:** `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `CHANGELOG.md`, and `skill-integrity-local.json` are never hashed and never fail integrity when edited.
- **Trust limit:** the integrity manifest is **unsigned**. Fetching it shares the same trust boundary as today’s remote `package.json` / raw GitHub fetch (no publisher signing in this release).
- **Latest layout only:** no folder renames or older-layout migration on update — install/update always copies the current skill tree.
- **Pack hygiene:** published tarball and install copies skip `__pycache__` / `*.pyc` and consumer-owned `shared/` data.
- **Cross-platform:** Node `fs` APIs (Windows / macOS / Linux). Bash shim sets `PYTHONIOENCODING=utf-8` for nested Python tools.
- **Script runtimes:** **Node** is required for install/CLI. **New** managed skill scripts are Node `.cjs` only. Existing `.py` helpers stay until a tracked migration; consumers still need Python to run those leftovers. See [`tools.md`](.agents/skills/ws-shared/tools.md) § Script launchers.

### Verify the package

```bash
npm run generate-integrity      # rebuild bin/skill-integrity.json
npm run verify-integrity        # fail if stale vs tree / package.json (required before PR)
node bin/generate-skill-integrity.js --check   # same as verify-integrity
npm run tests              # remote-style install check
npm run tests              # pack current tree into test/ (local mode)
```

---

## Skill catalog (overview)

Full **routing and auto-load rules** live in [`AGENTS.md`](AGENTS.md). Browse the site: [jpolvora.github.io/workflow-skills](https://jpolvora.github.io/workflow-skills).

### Harness

| Skill | Description |
|-------|-------------|
| [`ws-check-harness`](.agents/skills/ws-check-harness/SKILL.md) | Audit routing, links, portability |
| [`ws-check-workflows`](.agents/skills/ws-check-workflows/SKILL.md) | Deep workflow simulation & validation (Full/Lite) |
| [`ws-doctor`](.agents/skills/ws-doctor/SKILL.md) | Read-only install/runtime diagnose (paths, recipes, config, missing refs) |
| [`ws-audit`](.agents/skills/ws-audit/SKILL.md) | Runtime orch observer when `defaults.enableAuditing` is true; logs anomalies/performance/correctness/disposable scripts and drafts upstream issues / reusable tooling |
| [`ws-write-a-skill`](.agents/skills/ws-write-a-skill/SKILL.md) | Create/edit/optimize skills (Extra) |
| [`ws-show-harness`](.agents/skills/ws-show-harness/SKILL.md) | Snapshot active session harness (Extra) |
| [`ws-preview`](.agents/skills/ws-preview/SKILL.md) | Pipeline review dry-run via external reviewer (Extra) |

### Pipeline & providers

| Skill | Role |
|-------|------|
| [`ws-spec-to-pr`](.agents/skills/ws-spec-to-pr/SKILL.md) / [`ws-spec-to-pr-lite`](.agents/skills/ws-spec-to-pr-lite/SKILL.md) | Orchestrators |
| [`ws-write-spec`](.agents/skills/ws-write-spec/SKILL.md) … [`ws-update-plan-implementation`](.agents/skills/ws-update-plan-implementation/SKILL.md) | Pipeline `00`–`09` + `ws-goal-fix-pr` / `ws-update-plan-implementation` (`ws-*`; FSM steps 0–9 + post) |
| [`ws-github-provider`](.agents/skills/ws-github-provider/SKILL.md) · [`ws-azure-devops-provider`](.agents/skills/ws-azure-devops-provider/SKILL.md) · [`ws-local-spec-provider`](.agents/skills/ws-local-spec-provider/SKILL.md) | Issue/WI → **spec of record** under `{specsDir}` then workflow `step-00` under `{plansDir}` + PR ops. Shared SCM intents: [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md) |

### Review & audit

| Skill | Role |
|-------|------|
| [`ws-secrets-leak-review`](.agents/skills/ws-secrets-leak-review/SKILL.md) | Secrets / PII / credential leak scan; optional pre-commit hook (`install-hook.sh`) is **user-requested only** — not required by configure-project or install |
| [`ws-fable-judge`](.agents/skills/ws-fable-judge/SKILL.md) | Adversarial audit, fraud detection & diff-grounded verification |

### Utility, meta & domain

| Skill | Role |
|-------|------|
| [`ws-fable-method`](.agents/skills/ws-fable-method/SKILL.md) | 7-step problem-solving loop with gates |
| [`ws-fable-domain`](.agents/skills/ws-fable-domain/SKILL.md) | Domain adapter generator & schemas (DevOps, Data, Research) |
| [`ws-senior-developer`](.agents/skills/ws-senior-developer/SKILL.md) | Engineering-delivery gate and Code review proof source (default in `rules.seniorDeveloper`) |
| [`ws-tdah`](.agents/skills/ws-tdah/SKILL.md) · [`ws-karpathy-guidelines`](.agents/skills/ws-karpathy-guidelines/SKILL.md) | Operational guidelines & response style |
| [`ws-self-learning`](.agents/skills/ws-self-learning/SKILL.md) · [`ws-changelog`](.agents/skills/ws-changelog/SKILL.md) · [`ws-configure-project`](.agents/skills/ws-configure-project/SKILL.md) | Memory, history & project configuration |
| [`ws-patterns-backend`](.agents/skills/ws-patterns-backend/SKILL.md) · [`ws-patterns-frontend`](.agents/skills/ws-patterns-frontend/SKILL.md) | Backend & Frontend persistent patterns memory engines |
| [`ws-spec-index`](.agents/skills/ws-spec-index/SKILL.md) · [`ws-spec-list`](.agents/skills/ws-spec-list/SKILL.md) · [`ws-spec-archive`](.agents/skills/ws-spec-archive/SKILL.md) · [`ws-sync-spec`](.agents/skills/ws-sync-spec/SKILL.md) · [`ws-spec-format`](.agents/skills/ws-spec-format/SKILL.md) · [`ws-goal-loop`](.agents/skills/ws-goal-loop/SKILL.md) | Spec index, dual specs/plans board, plan-history archive, feature spec sync, format & goal loop |
| [`ws-activity-report`](.agents/skills/ws-activity-report/SKILL.md) | Timesheet / activity hours for a delivery day (plan bootstrap start → latest PR thread comment or delivery commit; human vs agent duration split) |
| [`ws-pre-daily`](.agents/skills/ws-pre-daily/SKILL.md) | Standup briefing of the last 36 hours |
| [`ws-spec-explain`](.agents/skills/ws-spec-explain/SKILL.md) | Spec/US status panorama — what it does, what it delivered, how to check & test |
| [`ws-spec-archive`](.agents/skills/ws-spec-archive/SKILL.md) | Archive `{plansDir}` delivery facts into `index.PRD`, then propose cleanup of shipped plan folders |
| [`ws-cleanup`](.agents/skills/ws-cleanup/SKILL.md) | Confirm-gated cleanup of workflow leftovers (telemetry, `.runtime`, shipped plans) + `.gitignore` suggestions |

### Spec → plan path (v0.3+)

Standalone `/write-spec` and provider `fetch-to-spec` write the **spec of record** to `{specsDir}/{slug}.spec.md` first (`plans.specsDir`, default `.agents/specs`). After a **manual** `/write-spec`, the agent asks whether to add that slug to `{specsDir}/index.PRD` (`ws-spec-index track`). Orchestrators then register a workflow copy as `{plansDir}/{slug}/step-00-{slug}.spec.md`. Re-fetch refuses to clobber a differing spec of record or `step-00` unless `--force` is passed (converter first, then register).

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

### This clone vs a global install

This package’s skill source of truth is `.agents/skills/ws-*`. A machine-wide install may also exist at `~/.agents/skills` (or `WORKFLOW_SKILLS_GLOBAL_DIR`). Agent hosts often list **both** copies of the same `ws-*` id.

- **Edit** only this clone’s `.agents/skills/ws-*`. Never edit or uninstall global `ws-*` from a session here (`update` overwrites that tree; other projects use it).
- **Do not** run `npx … install` / `update` against this package root (blocked except under `test/`).
- There is **no IDE setting** that hides the duplicate. Agents follow root [`AGENTS.md`](AGENTS.md) § Global vs local `ws-*`: invoke the global copy when it exists; author, test, or review a skill against the local tree only.

Consumer projects are unchanged: project-local skills override global; project `ws-shared/config.json` always wins.

Agent obligations (portability, ws-check-harness before `main`): see [`.agents/skills/ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) after install and root [`AGENTS.md`](AGENTS.md) when contributing upstream. Session operating rules for agents in this clone are inlined in root `AGENTS.md` § Upstream session contract (not a separate skill file).

After harness or catalog changes: regenerate the site with `node bin/build-site.js` when layers/routing change. That stamps the footer from `package.json` (no auto-bump). For an intentional release bump + site rebuild: `npm run build-site:bump` (or `node bin/build-site.js --bump`), then sync `test/package.json`’s `file:../workflow-skills-<version>.tgz` reference. CI site deploy never bumps — install/`--version`/`--check` stay aligned with the footer.

---

## License

MIT — see [LICENSE](LICENSE).
