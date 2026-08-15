# AGENTS.md — Agent harness hub

**Audience: agents (and tools that load agent instructions).**  
Humans: use [`README.md`](README.md) for install, overview, and contribution narrative.

This file is the **routing and operating contract** for the agent harness in this repository. Load skills from the tables below. Do not treat `README.md` as the skill router. Session start in **this repo:** apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Do not `Read` a separate harness skill.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

---

## Portability & harness neutrality (mandatory)

Shipped skills are **agent- and IDE-neutral**. They must run in any consumer host that can load `SKILL.md` from an installed skills root (project-local or global).

| Rule | Detail |
|------|--------|
| **No host product names** | Skill bodies, gates, banners, templates, and scripts must **not** name or require specific IDEs/agents (examples of forbidden coupling: product-branded UIs, host-only tool IDs as the contract, host-only folder layouts as required defaults). |
| **Capability vocabulary** | Use portable aliases from [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md): `user-gate`, `dispatch-agent`, path tokens `{skillsRoot}` / `{sharedDir}` / `{plansDir}` (← `plans.dir`), etc. Load `config.json` + `tools.md` Path tokens before tool calls; expand braces first. Prefer a host structured-choice UI when available; markdown fallback when not. |
| **Consumer-owned asset paths** | Workflow artifacts, reviews, and optional project rules live where **the consumer configures** them (`config.json` → `plans.dir`, `reviews.dir`, `rules.*`). Skill prose uses `{plansDir}/{slug}/` — never hardcode the default path. Shipped default for `plans.dir` is `.agents/plans`. |
| **No compatibility maintenance** | Do **not** keep legacy path aliases, migration shims, or dual defaults for old host-specific folders. Latest layout only on install/update. |
| **Host adapters stay out of skills** | Optional host pointer files, marketplace manifests, and this upstream repo’s local `.cursor/` tree are **not** part of the portable skill contract. Put lasting guidance in skills / `AGENTS.md`, not host-private rule files. |
| **Upstream dogfood exception** | This source repo may keep a local `.cursor/` for authoring/plans. That layout must **not** leak into shipped skill defaults or required consumer paths. |

Consumer mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — the hub shipped by the installer. This file is the only upstream-authoring hub; there is no separate packaged index.

---

## Skill SoT, install scopes & config override (mandatory)

Always apply this layout and resolution order. **`.agents/skills/ws-*` is the ONLY canonical source of truth for skills in this upstream package.** Author, package, hash, audit, catalog, and install from that tree. Whenever reviewing, updating, enhancing, or creating skills (`ws-*`), agents **MUST edit the authoritative files under `.agents/skills/`**. The installation source shipped by the installer is always `.agents/skills/`.

| Layer | Path | Role |
|-------|------|------|
| **Upstream development SoT** | `.agents/skills/ws-*` | Author, test, and publish skill bodies here. Packaging, integrity, catalog, and harness audits treat **`.agents/skills/`** as the only skill-content SoT. |
| **Project config hub** | `$PWD/.agents/skills/ws-shared/` | Consumer-owned (and upstream dogfood) project settings: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, optional `CHANGELOG.md`, `installed-skills.json`. Created/filled by `ws-configure-project`. **Not** published as skill SoT templates (hub templates are the non-consumer-owned files beside them). |
| **Project-local install** | `$PWD/.agents/skills/ws-*` | Optional: install skill packages into a consumer project. Skill bodies live beside the project hub. |
| **Global install** | `$HOME/.agents/skills/ws-*` (override via `WORKFLOW_SKILLS_GLOBAL_DIR`) | Optional: install skill packages once per machine. Agents may load global `ws-*` while the open project keeps its own `ws-shared` config. |

**Hybrid mode (supported):** skill bodies from **global** `$HOME/.agents/skills/ws-*` (or project-local `.agents/skills/ws-*`) + **project** config from `$PWD/.agents/skills/ws-shared/`.

**Authoring in this upstream package:** Edit skill folders directly under **`.agents/skills/ws-<skill-id>/`** (keep `SKILL.md` + scripts/refs). Do **not** treat consumer-owned hub data (`config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `skill-integrity-local.json`, optional `CHANGELOG.md`, hub `.gitignore`) as publishable SoT — templates/examples only (`*.example`, `*.template`, `hub.gitignore`, `AGENTS.md`, `tools.md`, etc.). Register new skills in `bin/skill-dependencies.json`, update hubs, regenerate integrity (`npm run generate-integrity`), and verify with `ws-check-harness` before ship.

### Global vs local `ws-*` (this repo only — mandatory)

Agent hosts often list the **same** `ws-*` id twice: this package’s SoT and a machine-wide install. They are different trees. **Do not merge, sync, or edit them as one.**

| Tree | Path | Use in this package root |
|------|------|--------------------------|
| **Stable install** | `{globalSkillsRoot}/ws-*` (`$HOME/.agents/skills` or `WORKFLOW_SKILLS_GLOBAL_DIR`) | **Default load / invoke** when that folder exists — follow this copy for skill *behavior* so in-progress local bodies do not replace the published skill mid-session |
| **Development SoT** | `$PWD/.agents/skills/ws-*` | **Only edit / hash / test / ship** target. `Read` this copy when the task is to **author, review, or test that skill id** |

**Rules:**

1. **Default invoke:** If `{globalSkillsRoot}/ws-<id>/SKILL.md` exists, `Read` **that** path (not the in-tree duplicate) unless rule 2 applies. Do not `Read` both copies.
2. **Author / test / review `ws-<id>`:** `Read` and edit **only** `$PWD/.agents/skills/ws-<id>/`. Ignore the global duplicate for that id. Verify with this repo’s tests (`npm run test`, `ws-check-harness`) — never by writing the global tree.
3. **Never write, uninstall, or “fix”** `{globalSkillsRoot}/ws-*` from a session whose cwd is this package root. That tree is a managed consumer install for other projects; `update` overwrites it.
4. **`{skillsRoot}` in this repo** still expands to **local** `.agents/skills` (authoring, integrity, harness audits). Do not retarget `pathTokens.skillsRoot` at `{globalSkillsRoot}`. When invoking under rule 1, run that skill’s scripts from `{globalSkillsRoot}` so `SKILL.md` and scripts stay the same version.
5. **Session autoload** is this file § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Do not autoload live `ws-*` from either tree.
6. **Non-`ws-*` user skills** (other folders under `{globalSkillsRoot}` or the host’s user-skills dir) are not this package; keep using them.
7. **No host/IDE switch** removes the duplicate. Project skills roots and user/global skills roots are discovered together. Per-workspace skill toggles are host-private and **not** the portable contract — this section is the tie-break. Do not add product-branded disable rules as shipped guidance.

Consumer projects keep hybrid rules unchanged: local `{skillsRoot}` overrides `{globalSkillsRoot}` when both exist; config always from the project hub.

**Config specificity (most specific wins — always):**

1. Explicit override (`WORKFLOW_SKILLS_SHARED_DIR` / absolute `pathTokens.sharedDir` when set).
2. **Project-local** `$PWD/.agents/skills/ws-shared/config.json` — **overrides** any global hub config.
3. Global `$HOME/.agents/skills/ws-shared/` — templates / fallback only when the project hub does not exist yet (run `ws-configure-project` to create the project hub).

**Skills-root resolution (for scripts / `{skillsRoot}`):** explicit override → project `.agents/skills` if the needed `ws-*` skill exists there → else global `$HOME/.agents/skills` (or `WORKFLOW_SKILLS_GLOBAL_DIR`). In **this upstream package**, `{skillsRoot}` is always the local SoT (`.agents/skills`) even when a global install exists. Invoke vs edit for `SKILL.md` bodies: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory). Never read a project’s `config.json` from the global hub when a project hub exists.

**Agent obligations:** before tool calls, resolve `{sharedDir}` from the project working tree first; expand `{skillsRoot}` independently when hybrid. Do not assume `{skillsRoot}` and `{sharedDir}` are always the same physical tree. When the host lists duplicate `ws-*` ids, follow § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory) before `Read`.

**Global skill execution & local config gate:** When executing a skill installed globally (`$HOME/.agents/skills`), agents must check if the target skill is **config-dependent** (requires project settings, verification commands, SCM providers, or stack companions). If so, the agent MUST verify that the consuming local repository has `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, the agent MUST prompt the user via `user-gate` recommending running `ws-configure-project` to set up the project hub. Config-independent skills (e.g., `ws-configure-project`, `ws-secrets-leak-review`, `ws-karpathy-guidelines`, `ws-tdah`, `ws-write-a-skill`) do not require `config.json` and may run directly.

---

## Doc roles (mandatory)

| File | Audience | Purpose |
|------|----------|---------|
| **`AGENTS.md`** (this file) | Agents | Skill loading, task router, layers, verification, and this repo’s inlined session contract |
| **`README.md`** | Humans | What this repo is, how to install/update/uninstall, contribute, safety |
| **`SKILL_AUTHORING.md`** | Agents & Skill Authors | Mandatory guidelines for designing, pruning, and maintaining lean skills |
| **`ws-shared/AGENTS.md`** | Agents (consumers) | Installed hub: config, gates, consumer task router, external dependencies |
| **`ws-shared/autoload.md`** | Agents (consumers + specs router) | Consumer Always-applied set + specs progressive-disclosure router. This repo does **not** follow its Always-applied table (live `ws-*` bodies). Specs vocabulary/router still load on keywords. |
| **`.agents/skills/ws-*/SKILL.md`** | Agents (upstream SoT) | Skill bodies under development / publish — load on demand via router when **authoring or testing** that skill |
| **Installed `…/skills/*/SKILL.md`** | Agents (consumers) | Progressive disclosure after project-local or global install |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to this hub if the consumer’s IDE needs one — not required by skills; not a portable dependency |

When editing harness docs: put **agent obligations** here; put **human install/UX prose** in `README.md`. Keep them aligned on facts (paths, install commands) without duplicating full skill bodies.

---

## Canonical upstream

Repo `jpolvora/workflow-skills` is the authoritative upstream for workflows and pipeline skills.

- Installed copies via `npx --yes github:jpolvora/workflow-skills` are **managed** (project-local and/or **global**). `update` overwrites skill files; `uninstall` removes skill folders (cascades unused deps) and never deletes project `ws-shared/` consumer data.
- **Preserve** under the **project** `.agents/skills/ws-shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` when `rules.changelogFile` points there (consumer-owned; never overwrite from upstream). Project hub **overrides** any global `$HOME/.agents/skills/ws-shared` values. The installer ships no packaged upstream index — the consumer hub is `ws-shared/AGENTS.md`. Fresh install / `ws-configure-project` seeds `config.json` (from example), `MEMORY.md`, `CHANGELOG.md`, and `STACK.md` under the **project** `ws-shared/` when missing. Installer never writes consumer repo-root files.
- **Layout contract:** § [Skill SoT, install scopes & config override](#skill-sot-install-scopes--config-override-mandatory) — upstream SoT `.agents/skills/ws-*`; consumer install `.agents/skills` and/or `$HOME/.agents/skills`; project config always wins.
- **Latest layout only:** installer does not migrate older folder names or legacy host paths — consumers get the current skill tree and neutral defaults on install/update. See [`README.md`](README.md) § Safety and § [Portability & harness neutrality](#portability--harness-neutrality-mandatory).
- Lasting skill changes: PR to `develop` → `main` only after **`ws-check-harness`** passes. Authoring rules: [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md).
- **Consumers / CI / Actions:** agents must not silently hygiene-refactor managed skill scripts; lasting fixes → suggest or open an **upstream** PR. See [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Managed skills.
- After install/update in a consumer: run `ws-check-harness`.
- Skills stay portable: parameterize via `ws-shared/config.json` / stack docs; no project hardcoding; no IDE/agent product coupling. Client data hub: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (consumer install mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)).
- **This upstream’s local `.cursor/`:** authoring/plans only for this repo — never the shipped default for consumers.
- **Upstream developer loop:** § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) (this package root only — not the portable consumer contract).

### Upstream developer workflow (this repo only)

**Local project rule** for agents in `jpolvora/workflow-skills`. Consumers dogfood the same skills via install but follow [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — not this section.

#### Skill tree (authoritative source)

- **Develop and test** under **`.agents/skills/ws-*`** — pipeline, providers, utilities, and hub templates shipped with skills. This is the **only** upstream skill-content SoT (see § [Skill SoT, install scopes & config override](#skill-sot-install-scopes--config-override-mandatory)). Host-listed `{globalSkillsRoot}/ws-*` duplicates: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory) (default invoke global; edit local only).
- **Consumer hub data** under **`.agents/skills/ws-shared/`** in this repo (`config.json`, MEMORY, STACK, memory, installed-skills) stays local/temp consumer-style data — never published as skill SoT.
- **Package and publish** from `.agents/skills/ws-*` via the installer/CLI (`bin/cli.js`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`) into consumer **project-local** (`.agents/skills`) or **global** (`$HOME/.agents/skills`) installs.
- **Lasting changes** belong in upstream PRs (`develop` → `main`); consumer copies are managed and overwritten on `update` (project `ws-shared` consumer data preserved).

#### Skill authoring contract

| Topic | Canonical doc |
|-------|----------------|
| Skill design, pruning & protocol rules (mandatory) | [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md) |
| Portability, language, folder naming | This file § [Portability & harness neutrality](#portability--harness-neutrality-mandatory) |
| Script launchers (`python` / `node` / `bash`) | [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md) § Script launchers |
| New or rewritten skills (markdown + scripts) | [`ws-write-a-skill`](.agents/skills/ws-write-a-skill/SKILL.md) |
| Spec shape / review | [`ws-spec-format`](.agents/skills/ws-spec-format/SKILL.md) |

Managed script calls use explicit launchers; do not rewrite skill scripts for shell quirks in consumer trees — fix upstream.

#### Development commands (this repo)

**Dependencies:** none to install. `package.json` declares no `dependencies` / `devDependencies`, so the toolchain is Node.js (ESM, `"type": "module"`) plus `npm`; `npm install` is optional and only writes a lockfile. Tests and scripts run straight from a fresh clone.

| Task | Command |
|------|---------|
| Install dependencies | Not required — see above. Run `node -v` to confirm Node is on PATH. |
| Full test suite | `npm run test` (alias `npm run tests`; `pretests` runs `npm pack` first, so it exercises the real tarball) |
| Same suite against the remote installer | `npm run tests:remote` |
| CLI surface / flags | `node bin/cli.js --help` |
| Local install dry run | `cd <scratch-dir> && node <repo>/bin/cli.js install --package workflows --yes --project` |
| Local update / uninstall | `node <repo>/bin/cli.js update` · `node <repo>/bin/cli.js uninstall --skills <csv> --yes` |
| Global-scope variants | add `--global` / `-g` (project scope is `--project` / `-p`; global root override `WORKFLOW_SKILLS_GLOBAL_DIR`) |
| Integrity digests | `npm run generate-integrity` then `npm run verify-integrity` (must exit 0) |
| Catalog / site | `node bin/build-site.js` (catalog only) · `npm run build-site:bump` (also bumps `package.json` + site footer) |
| Installed-skill audit | `node bin/cli.js integrity` · `node bin/cli.js --check` (version + `fullPackageDigest` vs `main`) |

**Never run install/update against this package root.** The installer writes into `.agents/skills/`, which is the upstream SoT here — it would overwrite the skills you are authoring. Always target a scratch directory (or the trees under `test/`), and prefer local `node bin/cli.js` / `./install-skills.sh` over remote `npx` (§ [Consumer CLI](#consumer-cli-install--update--uninstall)).

#### Review & audit commands

| Review | How |
|--------|-----|
| Local code review of the working branch | `ws-code-review` skill → `/code-review [base=<ref>] [plan=<plan-path>]`; reviews committed `{base}...HEAD`; runs fix → re-review rounds (max 3) and writes `{us-dir}/step-06-{slug}.review.md` |
| Harness integrity | `ws-check-harness` (Phases 0–5c) → 0 critical |
| Workflow / FSM simulation | `ws-check-workflows`, or `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` |
| Secrets / PII scan | `ws-secrets-leak-review` |
| Adversarial audit of claimed work | `ws-fable-judge` |
| External agentic reviewer (optional) | § [Local dry-run: agentic code reviewers](#local-dry-run-agentic-code-reviewers) |
| PR review threads after ship | `ws-fix-pr` / `ws-goal-fix-pr` |

#### Recommended DX autoload (upstream dogfood)

In **this repo only**, apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) every session (inlined in this file; not a `SKILL.md`). That compact snapshot covers surgical scope, delivery gate, fable loop, reply shape, memory/changelog, and on-demand write-spec so authoring does **not** `Read` live `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog` / `ws-write-spec` SKILL.md at runtime.

Those live skills still ship to consumers. Consumer hubs autoload them (or keep them on-demand) from installed `.agents/skills/ws-*`. Load a live body here only when the task is to author or test that skill.

Opt-out phrases (`stop ws-tdah`, `stop ws-senior-developer`, …) are in § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only).

#### Start work

| Intent | Load |
|--------|------|
| Draft a spec | This file § [6. Write a spec](#6-write-a-spec-on-demand) → `{specsDir}/{slug}.spec.md` (not `{plansDir}`). Load live `ws-write-spec` / `ws-spec-format` only when authoring those skills. |
| Spec → PR (full) | `ws-spec-to-pr` |
| Spec → PR (fast) | `ws-spec-to-pr-lite` |
| GitHub issue → spec / fix | `ws-github-provider` `fetch-to-spec` (writes `{specsDir}` first, then registers `step-00`) or orchestrator with issue URL |
| Open PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Timesheet / activity hours | `ws-activity-report` |

**Spec-of-record rule:** providers and standalone write-spec land the canonical file under `{specsDir}`; workflow `step-00` is always a registered copy under `{plansDir}/{slug}/`. Re-fetch uses `--force` on the converter first when the spec of record differs, then on register when `step-00` differs.

Workflow artifacts: prefer `{specsDir}` from `config.json` → `plans.specsDir` (default `.agents/specs`; this upstream may also keep legacy repo-root `specs/`); consumers use `config.json` → `plans.dir` / `plans.specsDir`.

#### After changes (recommend / gate)

After edits under `.agents/skills/ws-*`, hubs, `docs/`, `bin/`, or installer inputs:

1. Run **`ws-check-harness`** (Phases 0–5c) — see also § [Harness change protocol](#harness-change-protocol).
2. Resolve **critical** findings before claim complete / merge.

#### Before ship PR — upstream `ws-ship-pr` mandatory gate (this repo only)

**Scope:** `jpolvora/workflow-skills` package root only — not consumer projects.  
**Trigger:** Every time an agent runs `ws-ship-pr` / `/ship-pr` here, Step 2 (Prepare to PR) **must** execute this checklist before commit, push, or PR creation. `ws-ship-pr` discovers it via root `AGENTS.md` (Prepare row 5). Any ❌ → STOP (no push/PR).

Print a board after each row (same ✅ / ❌ / ⏭ convention as [`ws-ship-pr/PREPARE-CHECKLIST.md`](.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md)).

| # | Check | Command / skill | When required |
|---|-------|-----------------|---------------|
| 1 | **Install tests** | `npm run test` (or `npm run tests` during dev) | Always — installer, integrity, tree verification |
| 2 | **Website / catalog** | `npm run build-site:bump` when shipping package content; else `node bin/build-site.js` for catalog-only | Skills/hubs/CLI/installer changed → bump + rebuild `docs/index.html`; verify no merge-conflict markers |
| 3 | **Version** | `package.json` patch bump via step 2; `bin/skill-dependencies.json` → `packageVersion` stays aligned | **CI deploy on `main` never bumps** — bump locally once per release PR before push |
| 4 | **Installer (Node CLI)** | Review/fix `bin/cli.js`, `bin/install-rules.js` | Install/update/uninstall behavior or hub paths changed |
| 5 | **Installer (npx + bash shim)** | `install-skills.sh` argv/help aligned with `bin/cli.js --help`; consumer docs in `README.md` if UX changed | Shim or npx surface changed |
| 6 | **Skill dependency graph** | `bin/skill-dependencies.json` (+ `.agents/skills/ws-shared/skill-dependencies.json` when packaged graph ships) | Skills added/removed/renamed, package membership, or orch dispatch changed |
| 7 | **Integrity digests** | `npm run generate-integrity` && `npm run verify-integrity` | Any hashed install content changed (`bin/skill-integrity.json` must exit 0 on `--check`) |
| 8 | **Harness audit** | `ws-check-harness` Phases 0–5c → 0 critical | New/changed skills, hubs, routing, links, portability, en-us; Phase 3/4b must cover new skill ids and dependency graph |
| 9 | **Workflow simulation** | `ws-check-workflows` / `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | Orchestrator FSM, step dispatch, gates, or simulation docs changed — 0 critical |
| 10 | **Hub drift** | Sync root `AGENTS.md` + `ws-shared/AGENTS.md` (+ `ws-shared/autoload.md` when the Always-applied set or specs router changed) | Routing tables or skill index changed |
| 11 | **Human docs** | `README.md` when install/usage/safety narrative changed | Not required for skill-only doc fixes |
| 12 | **Ship** | `ws-ship-pr` / `/ship-pr` after rows 1–11 are ✅ or justified ⏭ | Commit → push → create PR |
| 13 | **Review convergence** | Wait **30s** after PR creation for code-review Action/CI to start, then `ws-goal-fix-pr` (default **300s** heartbeats per [`ws-ship-pr/GOAL-OVERRIDES.md`](.agents/skills/ws-ship-pr/GOAL-OVERRIDES.md)) until `activeThreads == 0` or escalate | Standalone ship-pr Step 6; orch Step 9 when `stopBeforeFixPr` |

**Upstream skill integrity regenerate (step 7 detail):** Hashed paths include **`.agents/skills/ws-*`** skill content, `bin/` installer inputs, and hub templates packed by the CLI. Regenerate and commit `bin/skill-integrity.json` in the **same** commit as content changes; `npm run generate-integrity` and `npm run verify-integrity` must exit 0 before ship.

**Version bump (step 3 detail):** One patch bump per release PR (`npm run build-site:bump` stamps site footer + `package.json`). Do not rely on GitHub Actions to bump — Actions deploy site on `main` only.

**Post-ship:** Do not merge while review threads are open or required checks are red. `ws-goal-fix-pr` owns the fix loop; `ws-ship-pr` merges only after convergence (unless `no-merge` / orch `stopBeforeFixPr`).

*Note:* Consumers use [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Recommended Feature Delivery Checklist — not this table.

### Consumer CLI (install / update / uninstall)

Human narrative: [`README.md`](README.md) § Install, update, and uninstall. Agents in a **consumer** project (not this package root):

```bash
npx --yes github:jpolvora/workflow-skills              # interactive install (prompts for scope)
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills install --package workflows --global --yes
npx --yes github:jpolvora/workflow-skills update       # uses ws-shared/installed-skills.json
npx --yes github:jpolvora/workflow-skills update --global
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --yes
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --global --yes
```

Manifest: `.agents/skills/ws-shared/installed-skills.json` (`skills` + `selected` roots). Missing on first update → bootstrap from disk. Uninstall preserves `shared/` (config, MEMORY, stack, manifest rewrite).

**This source repo:** do not run remote `npx github:jpolvora/workflow-skills` against the package root (except under `test/`). Prefer local `node bin/cli.js` / `./install-skills.sh`.

---

## Workflows

| Workflow | Path | Role |
|----------|------|------|
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → review → ship → fix-pr (steps 0–5) |

### Dual-mode

- Config: `.agents/skills/ws-shared/config.json` only — [`config-resolution.md`](.agents/skills/ws-shared/config-resolution.md)
- Gates: [`gates.md`](.agents/skills/ws-shared/gates.md) — prefer `user-gate` (native structured choice when available; markdown fallback)
- **Session model:** orchestrator session always runs under `currentModel`; switch via Pause → IDE/agent host → Resume (no `--model` / `--model-chain`). Subagent phase model preferences (`plannerModel`/`executionModel`/`reviewerModel`/`testingModel`) apply exclusively to `dispatch-agent` subagents (standard orch only; lite is inline). `defaults.enableDag` (default `false`) forces sequential task execution; `true` restores threshold-based parallel DAG. Optional review-model soft tip at Advance into Step 6 (full orch only)
- State: `workflowType` `standard` | `lite` (no cross-resume)
- Shared pipeline skills stay orch-agnostic
- **Dispatch:** [`ws-spec-to-pr/STEP-DISPATCH.md`](.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5 table; do not use STEP-DISPATCH as lite step numbers.

### Pipeline skills (owned here)

| Skill | Step(s) | Role |
|-------|---------|------|
| `ws-spec-to-pr` | Orchestrator | FSM dispatcher |
| `ws-write-spec` | 0 | Spec from description |
| `ws-classify-complexity` | 0 (after spec) | Pipeline lite vs standard classifier |
| `ws-write-plan` | 1 | Implementation plan |
| `ws-interview` | 2 | Plan audit |
| `ws-plan-to-tasks` | 3 | DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | Build / review fix |
| `ws-verify-plan` | 5 | Check-implementation (spec score) |
| `ws-code-review` | 6 | Local review (fix → re-review, max 3) |
| `ws-testing` | 7 | Testing (unit/integration/coverage; optional mutation score gate) |
| `ws-ship-pr` | 8 | Delivery commit + push/PR |
| `ws-fix-pr` | 9 | PR thread fix |
| `ws-goal-fix-pr` | 9 | Fix until zero threads |
| `ws-update-plan-implementation` | Post | Plan deltas |
| `ws-github-provider` | Provider | GitHub issue→spec + PR ops |
| `ws-azure-devops-provider` | Provider | ADO WI→spec + PR ops |
| `ws-local-spec-provider` | Provider | Local `*.spec.md` |
| `ws-spec-format` | Protocol | Spec format |
| `ws-goal-loop` | Primitive | Convergence loop |

---

## Upstream session contract (this repo only)

**Not packaged.** Inline here so this repo does not `Read` live `ws-*` SKILL.md for session autoload (those files are the SoT being authored). Compact snapshot of packaged behavior **0.3.18** (`ws-tdah`, `ws-karpathy-guidelines`, `ws-senior-developer`, `ws-fable-method`, `ws-self-learning`, `ws-changelog`, `ws-write-spec`, `ws-spec-format`). When those contracts change and dogfood should follow, update **this section** in the same PR.

Do **not** recreate `.agents/dev-harness/` or any extra `SKILL.md` for this contract. A folder under `.agents/skills/` would be hashed and shipped. Summarize here; invoke live scripts by path; load a live body only when **authoring or testing that skill**. Orchestrators, providers, `ws-check-harness`: task router, one skill at a time.

Hub files (`config.json`, `tools.md`, `gates.md`) are not skills. Specs keywords → `{sharedDir}/autoload.md` § Specs vocabulary + router only (not that file’s Always-applied table). Config missing → `user-gate` → `ws-configure-project` (do not load that skill unless running the wizard). Duplicate `ws-*` ids: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory).

`user-gate`: host structured choice (≥2 options, recommended first); markdown fallback; cancel → STOP, never infer yes.

### 1. Surgical scope (`ws-karpathy-guidelines`)

Caution over speed; trivial tasks: judgment. Consult `{sharedDir}/MEMORY.md` before inventing (§5).

- **Think:** state assumptions; present multiple interpretations; say if a simpler path exists; stop and ask when unclear.
- **Simplicity:** minimum code that solves the ask. No extras, single-use abstractions, unrequested configurability, or impossible-path error handling. If 200 lines could be 50, rewrite.
- **Surgical:** touch only what the request requires. Do not improve adjacent code, comments, or formatting. Match existing style. Mention unrelated dead code; do not delete it. Remove orphans **your** change created. Every changed line traces to the request.
- **Goal-driven:** verifiable success; multi-step `step → verify` until checked. Weak criteria ("make it work") need clarification.

### 2. Delivery gate (`ws-senior-developer`)

Does not replace project policy or a named orch (`ws-spec-to-pr*` wins routing). This section owns **Code review proof**. Opt out: `stop ws-senior-developer` (or unset `rules.seniorDeveloper` in a consumer).

1. Unasked extras: present via `user-gate`; wait.
2. Reuse helpers, stdlib, project patterns before custom logic.
3. Ambiguity: options + trade-offs via `user-gate`; wait.

Trivial / single-file → skip plan ceremony. Multi-file or multi-modification free-text → confirm a plan (`{plansDir}`). Implement the smallest change that satisfies that plan. Report a blocker; do not invent unconfigured commands.

**Code review proof** (before branch / PR handoff): run non-empty `config.json.verification` aliases and cite exit codes; run configured secrets checking; assess docs / spec-index; review changed scope only; report evidence, risks, blockers. Use configured aliases; do not hardcode consumer commands.

### 3. Investigate loop (`ws-fable-method`)

Follow literally. Do not print step headers unless asked. Orch or confirmed senior plan → no competing Plan-First. Fable Verify does not replace §2 proof. Recurring domain → load live `ws-fable-domain` only when asked.

**Triviality** (all): 1 file · <10 lines · no new behavior/architecture · solution known without search → change → one verify → 1–2 sentence report. Else full loop. Unlearned technique → lookup budget first. Inference only → say so.

```
ask → 0 Classify → 1 Done → 2 Evidence → 3 Decide → 4 Act → 5 Verify → 6 Report
```

| Step | Done when |
|------|-----------|
| **0** | Question (findings + 1 rec, no edits) · Task (verified change) · Plan-First (plan + named checks, **STOP**). Tie-break: plan-first. |
| **1** | 1–2 sentences + named check (test/build/log cite). |
| **2** | Orient (glob) → primary sources → parallel lookups; max **2** rounds then state gaps. |
| **3** | One primary recommendation + surgical blast radius. |
| **4** | Surgical edits; stop after 3 failed verify retries. |
| **5** | Observed re-run / diff; `git diff` matches scope. |
| **6** | Outcome first → evidence → honest caveats. |

Subcommands: default = full loop; `plan` = 0–3 then STOP; `audit` = live `ws-fable-judge` only when asked; `report` = outcome-first with caveats.

### 4. Reply shape (`ws-tdah`)

Action-first. Apply implicitly; do not lecture. Shape: `[next action]. [state]. [numbered steps]. [one next step].`

1. Lead — first line = next action
2. Number — multi-step as `1.` `2.` `3.`
3. State — one line: done / blocked / remaining
4. Close — one concrete next step
5. Estimate — minutes when timing matters
6. Win — name completed outcomes (`Done: X`)
7. Error — cause → fix
8. Lists — max 5 items; else top 5 + "N more on request"
9. Compress — filler, hedging, preamble, recap, closers, tangents out; fragments OK

Judgment: outcome > polish; challenge weak plans; no silent guessing; verify risky facts with tools; "I don't know" over fake certainty.

Style: no em dash or `--` in conversational replies; match user language; "X or Y?" → recommend with reason. Auto-Clarity (full sentences) for security, irreversible confirms, or ambiguity that risks a wrong action. Code / commits / PRs: normal prose. Skill bodies / gates / banners: en-us.

Opt-out: `stop ws-tdah` / `stop verbosity` / `normal mode` (retired `stop ws-gabarito`). Re-enable: `/ws-tdah` · `/tdah` · `start ws-tdah`.

### 5. Memory + changelog (`ws-self-learning`, `ws-changelog`)

MEMORY = anti-regression (input + output). Changelog = append-only history, not MEMORY.

**Before** plan/code/fix (skip pure Q&A): 3–8 keywords → `Grep` / `Read` `{sharedDir}/MEMORY.md` → fold Medium+ **DO NOT** / **INSTEAD DO**.

**After** mutating work (required `Learning:` line): new trap → `{sharedDir}/memory/YYYY-MM-DD-[slug].md` then `python .agents/skills/ws-self-learning/scripts/self_learning.py --compile` (script path, not a skill load). No trap → `Learning: N/A (standard implementation)` or `Learning: N/A (no new project knowledge)`. `MEMORY.md` conflict: re-run `--compile`; do not resolve by hand.

Entry shape: `### [YYYY-MM-DD] [Topic]` plus Layer, Module, Severity, Scenario / Context, DO NOT, INSTEAD DO.

Then changelog (`config.json` → `rules.changelogFile`, else `{sharedDir}/CHANGELOG.md`), insert under `# Changelog`:

```markdown
### [YYYY-MM-DD HH:MM] Agent: {agent/runtime}
- **Prompt**: …
- **Done**: …
- **Result**: …
```

Do not re-read or rewrite past changelog entries.

### 6. Write a spec (on demand)

When the user asks to draft a spec. Do not load live `ws-write-spec` / `ws-spec-format` unless authoring those skills.

Write `{specsDir}/{slug}.spec.md` (`plans.specsDir`, default `.agents/specs`). Create `{specsDir}` if missing. Do **not** create `{plansDir}/{slug}/` or `step-00-*.spec.md`. Optional `--register` / orch:

```bash
python .agents/skills/ws-local-spec-provider/scripts/register_local_spec.py \
  --input "{specsDir}/{slug}.spec.md"
```

Use `--force` only when overwriting a differing plan copy. Handoff: `{specsDir}` path (and `step-00` path only if register ran).

Frontmatter: `id: null`, `slug`, `title`, `source: local`, `specDate`. Body: Description, testable one-line ACs, Notes as needed. Every stated requirement → ≥1 AC or explicit out-of-scope. Downstream orch reads `{us-dir}/step-00-*.spec.md` after register, never live tracker APIs.

---

## Skill loading (mandatory)

**Session start:** this file is the hub. Apply § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) before acting on the first prompt. Do **not** `Read` live `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog` / `ws-write-spec` / `ws-spec-format` SKILL.md for session autoload. Do not `Read` a separate harness skill.

[`ws-shared/autoload.md`](.agents/skills/ws-shared/autoload.md) still owns **specs vocabulary** and **specs skill router**. Load those sections when the user mentions specs / plans / Spec-to-PR without naming a skill. Do **not** follow `autoload.md` § Always-applied in this repo (those rows point at live `ws-*` bodies).

The table below is the root-hub set that always loads in **this** repo.

| Item | Path | Trigger |
|------|------|---------|
| Upstream session contract | This file § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) | Every prompt — compact dogfood snapshot (**this repo only; not a skill**) |
| `using-superpowers` | `(global)` | Session start — skill discovery |

**Upstream dogfood (this repo only):** Apply the inlined contract above. Consumers still load installed `ws-*` skills from their hub (`ws-shared` keeps `ws-tdah` / `ws-senior-developer` on-demand). Load a live `ws-*` body here only when needed: **author / test that id** → `$PWD/.agents/skills/ws-*`; **otherwise invoke** `{globalSkillsRoot}/ws-*` when that install exists (see § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory)).

### Progressive disclosure (load on demand)

Only the sets above load unconditionally. Everything else is **pull, not push** — resolve one route, then read only that `SKILL.md`.

| Situation | Do this |
|-----------|---------|
| Session start | This file (including § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only)). Nothing else. Do not load `autoload.md` § Always-applied. |
| Task with a clear intent | Match one row in § [Task router](#task-router) → load that single skill (or use § [6. Write a spec](#6-write-a-spec-on-demand)). Do not preload sibling or downstream skills. Duplicate `ws-*` paths: § [Global vs local `ws-*` (this repo only — mandatory)](#global-vs-local-ws--this-repo-only--mandatory). |
| Spec / plan / `index.PRD` / Spec-to-PR wording without a named skill | Load [`autoload.md`](.agents/skills/ws-shared/autoload.md) § Specs vocabulary + § Specs skill router (or § Keyword → skill) → load **only** the matching skill, except standalone draft-spec uses § [6. Write a spec](#6-write-a-spec-on-demand). Never load the whole specs family. |
| Orchestrated run (`ws-spec-to-pr` / lite / `ws-multi-spec`) | The orchestrator owns loading. Load step skills via its dispatch table, one step at a time. |
| Need config, tokens, or gate wording | Read `{sharedDir}/config.json` (shape: [`config.json.example`](.agents/skills/ws-shared/config.json.example)) + [`tools.md`](.agents/skills/ws-shared/tools.md) / [`gates.md`](.agents/skills/ws-shared/gates.md) — not a skill body. |
| A skill names a companion file (`PHASES.md`, `STEP-DISPATCH.md`, `FORMAT.md`, …) | Read it **when that skill says to**, not upfront. |
| No route matches | Ask via `user-gate` (or `find-skills` / `using-superpowers` to discover) instead of loading the catalog. |

**Anti-patterns:** loading § [Skill catalog](#skill-catalog-layers) rows as a batch · reading every `ws-spec-*` body to decide which applies · loading `ws-check-harness` / `ws-check-workflows` before a change exists to audit · re-reading a skill already loaded this session · `Read`ing both copies of a duplicate `ws-*` id · editing `{globalSkillsRoot}/ws-*` from this package root.

### Dual-hub precedence (root override)

This **root** hub applies § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only) instead of live `ws-tdah` / `ws-senior-developer` SKILL.md. The installed **ws-shared** hub ([`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)) still treats those packaged skills as **on-demand** by default (`ws-tdah` via invoke; `ws-senior-developer` via `rules.seniorDeveloper`).

Consumers may add their own root `AGENTS.md` with the same override pattern. When root and ws-shared hubs both load, **root hub** skill-loading and precedence sections win for autoload decisions. This is intentional — not a harness drift defect. See ws-shared § Consumer root override.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. This root `AGENTS.md` when present (skill loading + precedence — overrides ws-shared opt-in defaults; see § Dual-hub precedence)
3. Design / spec / architecture constraints
4. Surgical scope (§ [1. Surgical scope](#1-surgical-scope-ws-karpathy-guidelines); live `ws-karpathy-guidelines` only when authoring that skill)
5. Delivery gate (§ [2. Delivery gate](#2-delivery-gate-ws-senior-developer); opt out `stop ws-senior-developer`)
6. Investigate loop (§ [3. Investigate loop](#3-investigate-loop-ws-fable-method); defer Plan-First when orch owns session or senior plan already confirmed)
7. Reply shape (§ [4. Reply shape](#4-reply-shape-ws-tdah); opt out `stop ws-tdah` / `stop verbosity` / `normal mode`)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-tdah` / `stop verbosity` / `normal mode` | Disable ws-tdah |
| `stop ws-gabarito` / `sem ws-gabarito` | Same disable (retired alias) |
| `stop ws-senior-developer` | Disable ws-senior-developer when autoloaded |
| `/ws-tdah` · `/tdah` · `start ws-tdah` · `start ws-gabarito` | Activate (single default mode) |

---

## Harness change protocol

On changes under `.agents/skills/ws-*`, this file, `README.md`, or `docs/`:

1. **Mandatory Website & Documentation Update Rule:** Whenever any feature, capability, CLI option, workflow, or skill is added, changed, updated, or removed, agents **MUST** update and describe the change across:
   - `docs/index.html` (rebuild catalog via `node bin/build-site.js` / `npm run build-site:bump`, and update website feature cards/install sections/FAQ as applicable).
   - `README.md` (update human install/usage narrative, CLI flags, and feature options).
   - Root `AGENTS.md` and [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) (keep skill indexes, task routers, autoload set, and CLI documentation in sync).
2. Evaluate: **ws-check-harness** (Phases 0–5c → plan) · site rebuild · `README.md` if install/usage/human docs changed. For PRs that ship package changes, follow § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § Before ship PR — upstream `ws-ship-pr` mandatory gate (dependency graph, integrity, version/catalog, hub drift).
3. If the change affects hashed install content, run integrity regenerate in the same commit (`npm run generate-integrity` + `npm run verify-integrity`) — see § [Before ship PR — upstream `ws-ship-pr` mandatory gate](#before-ship-pr--upstream-ws-ship-pr-mandatory-gate-this-repo-only) step 7.

---

## Skill catalog (layers)

> **Scope note:** This root hub lists the **full upstream disk inventory** (Workflows + Extra + global discovery routes). Package membership is owned by [`bin/skill-dependencies.json`](bin/skill-dependencies.json) (`workflows` = 40 skills, `extra` = 2) — rows marked **(Extra)** below are absent from Workflows-only installs. The consumer-facing routes live in [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md), which keeps Extra skills under its own `### Extra package (optional)` section so Workflows-only installs avoid phantom routes.
>
> **Do not load this catalog as a work list** — it is an index. Load skills per § [Progressive disclosure](#progressive-disclosure-load-on-demand).

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `ws-check-harness` | `.agents/skills/ws-check-harness/SKILL.md` | Harness integrity audit |
| `ws-check-workflows` | `.agents/skills/ws-check-workflows/SKILL.md` | Deep workflow simulation & validation (Full/Lite) |
| `ws-doctor` | `.agents/skills/ws-doctor/SKILL.md` | Workflow skills install/runtime diagnose (read-only report) |
| `ws-audit` | `.agents/skills/ws-audit/SKILL.md` | Runtime orch audit log, performance/correctness/disposable script diagnosis, and upstream issue/tooling proposal |
| `ws-write-a-skill` | `.agents/skills/ws-write-a-skill/SKILL.md` | Create/edit/optimize skills (Extra) |
| `ws-show-harness` | `.agents/skills/ws-show-harness/SKILL.md` | Session harness snapshot (Extra) |
| `using-superpowers` | `(global)` | Skill discovery |

### Layer 1 — Engineering standards

| Skill | Path | Description |
|-------|------|-------------|
| `ws-senior-developer` | `.agents/skills/ws-senior-developer/SKILL.md` | Optional engineering-delivery gate and Code review proof source |

### Layer 2 — Pipeline + providers

| Step | Skill | Path |
|------|-------|------|
| 00 | `ws-write-spec` | `.agents/skills/ws-write-spec/SKILL.md` |
| 01 | `ws-write-plan` | `.agents/skills/ws-write-plan/SKILL.md` |
| 02 | `ws-interview` | `.agents/skills/ws-interview/SKILL.md` |
| 03 | `ws-plan-to-tasks` | `.agents/skills/ws-plan-to-tasks/SKILL.md` |
| 04 | `ws-implement-tasks` | `.agents/skills/ws-implement-tasks/SKILL.md` |
| 05 | `ws-verify-plan` | `.agents/skills/ws-verify-plan/SKILL.md` |
| 06 | `ws-code-review` | `.agents/skills/ws-code-review/SKILL.md` |
| 07 | `ws-testing` | `.agents/skills/ws-testing/SKILL.md` |
| 08 | `ws-ship-pr` | `.agents/skills/ws-ship-pr/SKILL.md` |
| 09 | `ws-fix-pr` | `.agents/skills/ws-fix-pr/SKILL.md` |
| — | `ws-goal-fix-pr` | `.agents/skills/ws-goal-fix-pr/SKILL.md` |
| Post | `ws-update-plan-implementation` | `.agents/skills/ws-update-plan-implementation/SKILL.md` |
| — | `ws-github-provider` | `.agents/skills/ws-github-provider/SKILL.md` |
| — | `ws-azure-devops-provider` | `.agents/skills/ws-azure-devops-provider/SKILL.md` |
| — | `ws-local-spec-provider` | `.agents/skills/ws-local-spec-provider/SKILL.md` |

### Layer 3 — Discovery (reserved)

Install via `using-superpowers` / `find-skills` until routed here.

### Layer 4 — Review & audit

| Skill | Path | Description |
|-------|------|-------------|
| `ws-secrets-leak-review` | `.agents/skills/ws-secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan; optional pre-commit hook is user-requested only (not required by configure-project) |
| `ws-fable-judge` | `.agents/skills/ws-fable-judge/SKILL.md` | Adversarial audit, fraud detection & diff-grounded verification |

### Layer 5 — Utility & meta

| Skill | Path | Notes |
|-------|------|-------|
| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Packaged; consumer on-demand. This repo uses § [4. Reply shape](#4-reply-shape-ws-tdah) |
| `ws-karpathy-guidelines` | `.agents/skills/ws-karpathy-guidelines/SKILL.md` | Packaged; this repo uses § [1. Surgical scope](#1-surgical-scope-ws-karpathy-guidelines) |
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | End-to-end delivery orchestrator FSM |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast sequential delivery orchestrator |
| `ws-multi-spec` | `.agents/skills/ws-multi-spec/SKILL.md` | Sequential smart multi-spec batch delivery orchestrator |
| `ws-fable-method` | `.agents/skills/ws-fable-method/SKILL.md` | 7-step problem-solving loop with gates |
| `ws-fable-domain` | `.agents/skills/ws-fable-domain/SKILL.md` | Domain adapter generator & schemas |
| `ws-spec-format` | `.agents/skills/ws-spec-format/SKILL.md` | Specs |
| `ws-classify-complexity` | `.agents/skills/ws-classify-complexity/SKILL.md` | Pipeline lite vs standard classifier |
| `ws-self-learning` | `.agents/skills/ws-self-learning/SKILL.md` | Consult MEMORY before write; record traps after → `{sharedDir}/MEMORY.md` |
| `ws-patterns-backend` | `.agents/skills/ws-patterns-backend/SKILL.md` | Consult backend.md before write; record patterns after → `{sharedDir}/backend.md` |
| `ws-patterns-frontend` | `.agents/skills/ws-patterns-frontend/SKILL.md` | Consult frontend.md before write; record patterns after → `{sharedDir}/frontend.md` |
| `ws-changelog` | `.agents/skills/ws-changelog/SKILL.md` | `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) |
| `ws-configure-project` | `.agents/skills/ws-configure-project/SKILL.md` | Interview/detect fill `ws-shared/config.json` (may optionally suggest secrets pre-commit hook — never required) |
| `ws-goal-loop` | `.agents/skills/ws-goal-loop/SKILL.md` | Convergence |
| `ws-spec-index` | `.agents/skills/ws-spec-index/SKILL.md` | Project spec index init/sync/promote |
| `ws-spec-list` | `.agents/skills/ws-spec-list/SKILL.md` | Dual board: specs (`{specsDir}`) vs plan workflows (`{plansDir}`) + manage menu |
| `ws-activity-report` | `.agents/skills/ws-activity-report/SKILL.md` | Timesheet entries from plan bootstrap start → latest PR thread comment or delivery commit |
| `ws-sync-spec` | `.agents/skills/ws-sync-spec/SKILL.md` | Auto-update feature specs after prompt/code evolutions |
| `grill-with-docs` | `(global)` | Docs grill |
| `find-skills` | via `using-superpowers` | Discover/install |

---

## Task router

| Intent | Load |
|--------|------|
| Write a spec | This file § [6. Write a spec](#6-write-a-spec-on-demand) (live `ws-write-spec` only when authoring that skill) |
| Classify spec pipeline complexity | `ws-classify-complexity` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement | `ws-implement-tasks` |
| Engineering delivery gate / Code review proof | This file § [2. Delivery gate](#2-delivery-gate-ws-senior-developer) (live `ws-senior-developer` only when authoring that skill) |
| Verify | `ws-verify-plan` |
| Local code review | `ws-code-review` |
| Secrets / leaks | `ws-secrets-leak-review` |
| Adversarial audit / fraud scan | `ws-fable-judge` |
| Fable Method 7-step loop | This file § [3. Investigate loop](#3-investigate-loop-ws-fable-method) (live `ws-fable-method` only when authoring that skill) |
| Domain adapters (DevOps/Data/Research) | `ws-fable-domain` |
| Backend patterns & rules | `ws-patterns-backend` |
| Frontend UI/UX patterns & rules | `ws-patterns-frontend` |
| Testing pre-PR | `ws-testing` |
| Fix PR threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship PR | `ws-ship-pr` |
| Spec → PR E2E | `ws-spec-to-pr` |
| Spec → PR lite | `ws-spec-to-pr-lite` |
| Batch spec delivery | `ws-multi-spec` |
| Project spec index init/sync/promote | `ws-spec-index` |
| List / manage specs vs plan workflows (dual board + menu) | `ws-spec-list` |
| Timesheet / activity hours for a delivery day | `ws-activity-report` |
| Session autoload set (which skills load every prompt) | This repo: § [Upstream session contract (this repo only)](#upstream-session-contract-this-repo-only). Consumers: [`{sharedDir}/autoload.md`](.agents/skills/ws-shared/autoload.md) § Always-applied |
| Specs keywords / which skill to invoke | [`{sharedDir}/autoload.md`](.agents/skills/ws-shared/autoload.md) § Specs skill router |
| Dev commands (deps, tests, local install, integrity, site) | § [Development commands](#development-commands-this-repo) |
| Local code review / audits | § [Review & audit commands](#review--audit-commands) |
| Auto-update feature specs after code changes | `ws-sync-spec` |
| GitHub issue/PR ops | `ws-github-provider` |
| ADO WI/PR ops | `ws-azure-devops-provider` |
| Local `*.spec.md` | `ws-local-spec-provider` |
| Format/review spec | `ws-spec-format` |
| New skill / skill rewrite | `ws-write-a-skill` |
| Show active harness | `ws-show-harness` |
| Audit harness | `ws-check-harness` |
| Diagnose skills / doctor the harness | `ws-doctor` |
| Runtime workflow audit (when `defaults.enableAuditing`) | `ws-audit` |
| Check workflows | `ws-check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Record learning | This file § [5. Memory + changelog](#5-memory--changelog-ws-self-learning-ws-changelog) (live `ws-self-learning` only when authoring that skill) |
| Convergence loop | `ws-goal-loop` |
| Record ws-changelog | This file § [5. Memory + changelog](#5-memory--changelog-ws-self-learning-ws-changelog) (live `ws-changelog` only when authoring that skill) |
| Fill / update `config.json` | `ws-configure-project` |
| Discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification (before claim complete / commit)

Upstream package root: full ordered checklist in § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § [Before ship PR — upstream `ws-ship-pr` mandatory gate](#before-ship-pr--upstream-ws-ship-pr-mandatory-gate-this-repo-only). Summary:

1. **Harness:** load `.agents/skills/ws-check-harness/SKILL.md` → Phases 0–5c
2. **Install tests:** `npm run test` · `npm run tests`
3. **Dependency graph:** if skills added/removed/renamed or orch dispatch changed → update `bin/skill-dependencies.json`; `ws-check-harness` Phase 3/4b must pass
4. **Skill integrity:** if package-hashed content changed → `npm run generate-integrity` && `npm run verify-integrity` (must exit 0) before claim complete / PR
5. **Workflow simulation:** `ws-check-workflows` when orch/gates/simulations changed
6. **Site (optional):** `gh api repos/jpolvora/workflow-skills/pages`
7. **Catalog / version:** if shipping package changes → `npm run build-site:bump`; else catalog-only → `node bin/build-site.js`. `package.json` ↔ footer must match; CI deploy never bumps.
---

## Local dry-run: agentic code reviewers

Upstream-only verification helper (not part of the portable skill contract). Requires the reviewer’s API key env var. Reviews `develop`…`main` (Custom stack + repo prompt). See [`README.md`](README.md) for human-oriented context; command:

```bash
# Download to a file first — curl|bash leaves BASH_SOURCE unbound under set -u.
curl -fsSL https://raw.githubusercontent.com/jpolvora/agentic-code-reviewers/release/run.sh \
  -o /tmp/agentic-code-reviewers-run.sh
bash /tmp/agentic-code-reviewers-run.sh \
  --dry-run \
  --gh \
  --engine opencode \
  --model opencode-go/deepseek-v4-flash \
  --stack Custom \
  --custom-prompt .github/agentic-code-reviewers-prompt.md \
  --include-patterns "**/*.md,**/*.yml,**/*.yaml,**/*.json,**/*.sh,**/*.ps1,**/*.psm1,**/*.psd1,**/*.cmd,**/*.js,**/*.ts,**/*.css,**/*.html" \
  --target-branch refs/heads/main \
  --source-branch refs/heads/develop
```

---

## External dependencies

Not shipped in the hub package (except where noted). Resolve each dependency in **order** (first match wins). Paths are project-agnostic; read values from `.agents/skills/ws-shared/config.json` when present. Do **not** assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | **This repo:** § [2. Delivery gate](#2-delivery-gate-ws-senior-developer). **Consumers:** `config.json` → `rules.seniorDeveloper` (default `.agents/skills/ws-senior-developer/SKILL.md`; set `""` to disable) → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `ws-karpathy-guidelines` | **This repo:** § [1. Surgical scope](#1-surgical-scope-ws-karpathy-guidelines). **Consumers:** `config.json` → `rules.karpathyGuidelines` → shipped `.agents/skills/ws-karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/ws-shared/STACK.md`) — consumer-owned under `ws-shared/`; do not require repo-root `STACK.md` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) — create under that path only; repo-root `CHANGELOG.md` only if explicitly configured |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer; starter [`specs/domains/index.md.example`](specs/domains/index.md.example) |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (token `{specsDir}`; default `.agents/specs`; prefer existing repo-root `specs/`) · optional `reviews.dir` (token `{reviewsDir}`; default `.agents/codereviews`) |

Packaged consumer mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § External dependencies · bootstrap notes in [`ws-shared/setup.md`](.agents/skills/ws-shared/setup.md).

### Code review proof

**This repo:** use § [2. Delivery gate](#2-delivery-gate-ws-senior-developer). Do not load live `ws-senior-developer/SKILL.md` for session proof.

**Consumers:** use the checklist from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist in hubs.
