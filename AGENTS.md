# AGENTS.md — Agent harness hub

**Audience: agents (and tools that load agent instructions).**  
Humans: use [`README.md`](README.md) for install, overview, and contribution narrative.

This file is the **routing and operating contract** for the agent harness in this repository. Load skills from the tables below. Do not treat `README.md` as the skill router.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

---

## Portability & harness neutrality (mandatory)

Shipped skills are **agent- and IDE-neutral**. They must run in any consumer host that can load `SKILL.md` under `.agents/skills/`.

| Rule | Detail |
|------|--------|
| **No host product names** | Skill bodies, gates, banners, templates, and scripts must **not** name or require specific IDEs/agents (examples of forbidden coupling: product-branded UIs, host-only tool IDs as the contract, host-only folder layouts as required defaults). |
| **Capability vocabulary** | Use portable aliases from [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md): `user-gate`, `dispatch-agent`, path tokens `{skillsRoot}` / `{sharedDir}` / `{plansDir}` (← `plans.dir`), etc. Load `config.json` + `tools.md` Path tokens before tool calls; expand braces first. Prefer a host structured-choice UI when available; markdown fallback when not. |
| **Consumer-owned asset paths** | Workflow artifacts, reviews, and optional project rules live where **the consumer configures** them (`config.json` → `plans.dir`, `reviews.dir`, `rules.*`). Skill prose uses `{plansDir}/{slug}/` — never hardcode the default path. Shipped default for `plans.dir` is `.agents/plans`. |
| **No compatibility maintenance** | Do **not** keep legacy path aliases, migration shims, or dual defaults for old host-specific folders. Latest layout only on install/update. |
| **Host adapters stay out of skills** | Optional host pointer files, marketplace manifests, and this upstream repo’s local `.cursor/` tree are **not** part of the portable skill contract. Put lasting guidance in skills / `AGENTS.md`, not host-private rule files. |
| **Upstream dogfood exception** | This source repo may keep a local `.cursor/` for authoring/plans. That layout must **not** leak into shipped skill defaults or required consumer paths. |

Mirror for packaged authoring: [`.agents/AGENTS.md`](.agents/AGENTS.md) § Portability and genericity (upstream only; consumers use [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)).

---

## Doc roles (mandatory)

| File | Audience | Purpose |
|------|----------|---------|
| **`AGENTS.md`** (this file) | Agents | Skill loading, task router, layers, verification, harness rules |
| **`README.md`** | Humans | What this repo is, how to install/update/uninstall, contribute, safety |
| **`.agents/AGENTS.md`** | Agents (upstream authoring) | Workflows-package index for dual-hub drift checks in this repo — **not** installed into consumers |
| **`.agents/skills/*/SKILL.md`** | Agents | Progressive disclosure — load on demand via router |
| **Optional host pointer** | Agents (host-specific) | Thin pointer to this hub if the consumer’s IDE needs one — not required by skills; not a portable dependency |

When editing harness docs: put **agent obligations** here; put **human install/UX prose** in `README.md`. Keep them aligned on facts (paths, install commands) without duplicating full skill bodies.

---

## Canonical upstream

Repo `jpolvora/workflow-skills` is the authoritative upstream for workflows and pipeline skills.

- Installed copies via `npx --yes github:jpolvora/workflow-skills` are **managed**. `update` overwrites skill files; `uninstall` removes skill folders (cascades unused deps) and never deletes `ws-shared/` consumer data.
- **Preserve** under `.agents/skills/ws-shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` when `rules.changelogFile` points there (consumer-owned; never overwrite from upstream). Installer does **not** copy `.agents/AGENTS.md` — consumer hub is `ws-shared/AGENTS.md`. Fresh install seeds `config.json` (from example), `MEMORY.md`, `CHANGELOG.md`, and `STACK.md` under `ws-shared/` when missing. Installer never writes consumer repo-root files.
- **Latest layout only:** installer does not migrate older folder names or legacy host paths — consumers get the current skill tree and neutral defaults on install/update. See [`README.md`](README.md) § Safety and § [Portability & harness neutrality](#portability--harness-neutrality-mandatory).
- Lasting skill changes: PR to `develop` → `main` only after **`ws-check-harness`** passes. See [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills.
- **Consumers / CI / Actions:** agents must not silently hygiene-refactor managed skill scripts; lasting fixes → suggest or open an **upstream** PR. See [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Managed skills.
- After install/update in a consumer: run `ws-check-harness`.
- Skills stay portable: parameterize via `ws-shared/config.json` / stack docs; no project hardcoding; no IDE/agent product coupling. Client data hub: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (consumer install mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)).
- **This upstream’s local `.cursor/`:** authoring/plans only for this repo — never the shipped default for consumers.
- **Upstream developer loop:** § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) (this package root only — not the portable consumer contract).

### Upstream developer workflow (this repo only)

**Local project rule** for agents in `jpolvora/workflow-skills`. Consumers dogfood the same skills via install but follow [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) — not this section.

#### Skill tree (authoritative source)

- **Develop and test** under `.agents/skills/*` — pipeline, providers, utilities, and shared hub templates.
- **Package and publish** via the installer/CLI (`bin/cli.js`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`) into consumer projects (`npx github:jpolvora/workflow-skills`).
- **Lasting changes** belong in upstream PRs (`develop` → `main`); consumer copies are managed and overwritten on `update`.

#### Skill authoring contract

| Topic | Canonical doc |
|-------|----------------|
| Portability, language, folder naming | [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills |
| Script launchers (`python` / `node` / `bash`) | [`ws-shared/tools.md`](.agents/skills/ws-shared/tools.md) § Script launchers |
| New or rewritten skills (markdown + scripts) | [`ws-write-a-skill`](.agents/skills/ws-write-a-skill/SKILL.md) |
| Spec shape / review | [`ws-spec-format`](.agents/skills/ws-spec-format/SKILL.md) |

Managed script calls use explicit launchers; do not rewrite skill scripts for shell quirks in consumer trees — fix upstream.

#### Recommended DX autoload (upstream dogfood)

In **this repo only** (development), load every session for authoring quality:

| Skill | Why |
|-------|-----|
| `ws-karpathy-guidelines` | Surgical scope; no drive-by refactors |
| `ws-tdah` (`/ws-tdah`) | Action-first replies + operational judgment (opt out via `stop ws-tdah` / `stop verbosity` / `normal mode`; retired `stop ws-gabarito` / `sem ws-gabarito`) |
| `ws-senior-developer` | Engineering delivery gate and pre-ship proof |

These ship to consumers but are **not autoloaded** by default on consumer projects (`ws-shared` keeps `ws-tdah` / `ws-senior-developer` on-demand).

#### Start work

| Intent | Load |
|--------|------|
| Draft a spec | `ws-write-spec` (`ws-write-spec`) or local `specs/**/*.spec.md` + `ws-spec-format` |
| Spec → PR (full) | `ws-spec-to-pr` |
| Spec → PR (fast) | `ws-spec-to-pr-lite` |
| GitHub issue → spec / fix | `ws-github-provider` or orchestrator with issue URL |
| Open PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |

Workflow artifacts: prefer repo-root `specs/` (this upstream dogfoods `specs/`); consumers use `config.json` → `plans.dir` / `plans.specsDir`.

#### After changes (recommend / gate)

After edits under `.agents/skills/`, hubs, `docs/`, `bin/`, or installer inputs:

1. Run **`ws-check-harness`** (Phases 0–5c) — see also § [Harness change protocol](#harness-change-protocol).
2. Resolve **critical** findings before claim complete / merge.

#### Before ship PR — upstream `ws-ship-pr` mandatory gate (this repo only)

**Scope:** `jpolvora/workflow-skills` package root only — not consumer projects.  
**Trigger:** Every time an agent runs `ws-ship-pr` / `/ship-pr` here, Step 2 (Prepare to PR) **must** execute this checklist before commit, push, or PR creation. `ws-ship-pr` discovers it via root `AGENTS.md` (Prepare row 5). Any ❌ → STOP (no push/PR).

Print a board after each row (same ✅ / ❌ / ⏭ convention as [`ws-ship-pr/PREPARE-CHECKLIST.md`](.agents/skills/ws-ship-pr/PREPARE-CHECKLIST.md)).

| # | Check | Command / skill | When required |
|---|-------|-----------------|---------------|
| 1 | **Install tests** | `npm run test` (or `npm run tests -- --local` during dev) | Always — installer, integrity, tree verification |
| 2 | **Website / catalog** | `npm run build-site:bump` when shipping package content; else `node bin/build-site.js` for catalog-only | Skills/hubs/CLI/installer changed → bump + rebuild `docs/index.html`; verify no merge-conflict markers |
| 3 | **Version** | `package.json` patch bump via step 2; `bin/skill-dependencies.json` → `packageVersion` stays aligned | **CI deploy on `main` never bumps** — bump locally once per release PR before push |
| 4 | **Installer (Node CLI)** | Review/fix `bin/cli.js`, `bin/install-rules.js` | Install/update/uninstall behavior or hub paths changed |
| 5 | **Installer (npx + bash shim)** | `install-skills.sh` argv/help aligned with `bin/cli.js --help`; consumer docs in `README.md` if UX changed | Shim or npx surface changed |
| 6 | **Skill dependency graph** | `bin/skill-dependencies.json` (+ `.agents/skills/ws-shared/skill-dependencies.json` when packaged graph ships) | Skills added/removed/renamed, package membership, or orch dispatch changed |
| 7 | **Integrity digests** | `npm run generate-integrity` && `npm run verify-integrity` | Any hashed install content changed (`bin/skill-integrity.json` must exit 0 on `--check`) |
| 8 | **Harness audit** | `ws-check-harness` Phases 0–5c → 0 critical | New/changed skills, hubs, routing, links, portability, en-us; Phase 3/4b must cover new skill ids and dependency graph |
| 9 | **Workflow simulation** | `ws-check-workflows` / `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | Orchestrator FSM, step dispatch, gates, or simulation docs changed — 0 critical |
| 10 | **Hub drift** | Sync root `AGENTS.md` + `.agents/AGENTS.md` (+ `ws-shared/AGENTS.md` when hub templates changed) | Routing tables or skill index changed |
| 11 | **Human docs** | `README.md` when install/usage/safety narrative changed | Not required for skill-only doc fixes |
| 12 | **Ship** | `ws-ship-pr` / `/ship-pr` after rows 1–11 are ✅ or justified ⏭ | Commit → push → create PR |
| 13 | **Review convergence** | Wait **30s** after PR creation for code-review Action/CI to start, then `ws-goal-fix-pr` (default **300s** heartbeats per [`ws-ship-pr/GOAL-OVERRIDES.md`](.agents/skills/ws-ship-pr/GOAL-OVERRIDES.md)) until `activeThreads == 0` or escalate | Standalone ship-pr Step 6; orch Step 9 when `stopBeforeFixPr` |

**Upstream skill integrity regenerate (step 7 detail):** Hashed paths include `.agents/skills/*` install tree, `bin/` installer inputs, and hub templates packed by the CLI. Regenerate and commit `bin/skill-integrity.json` in the **same** commit as content changes; `npm run generate-integrity` and `npm run verify-integrity` must exit 0 before ship.

**Version bump (step 3 detail):** One patch bump per release PR (`npm run build-site:bump` stamps site footer + `package.json`). Do not rely on GitHub Actions to bump — Actions deploy site on `main` only.

**Post-ship:** Do not merge while review threads are open or required checks are red. `ws-goal-fix-pr` owns the fix loop; `ws-ship-pr` merges only after convergence (unless `no-merge` / orch `stopBeforeFixPr`).

*Note:* Consumers use [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § Recommended Feature Delivery Checklist — not this table.

### Consumer CLI (install / update / uninstall)

Human narrative: [`README.md`](README.md) § Install, update, and uninstall. Agents in a **consumer** project (not this package root):

```bash
npx --yes github:jpolvora/workflow-skills              # interactive install
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills update       # uses ws-shared/installed-skills.json
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --yes
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
- **Session model:** `currentModel` = executing session model; switch via Pause → IDE/agent host → Resume (no `--model` / `--model-chain`). Optional review-model soft tip at Advance into Step 6 (full orch only)
- State: `workflowType` `standard` | `lite` (no cross-resume)
- Shared pipeline skills stay orch-agnostic
- **Dispatch:** [`ws-spec-to-pr/STEP-DISPATCH.md`](.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5 table; do not use STEP-DISPATCH as lite step numbers.

### Pipeline skills (owned here)

| Skill | Step(s) | Role |
|-------|---------|------|
| `ws-spec-to-pr` | Orchestrator | FSM dispatcher |
| `ws-write-spec` | 0 | Spec from description |
| `ws-write-plan` | 1 | Implementation plan |
| `ws-interview` | 2 | Plan audit |
| `ws-plan-to-tasks` | 3 | DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | Build / review fix |
| `ws-verify-plan` | 5 | Check-implementation (spec score) |
| `ws-code-review` | 6 | Local review (fix → re-review, max 3) |
| `ws-testing` | 7 | Testing (unit/integration/coverage) |
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

## Skill loading (mandatory)

| Skill | Path | Trigger |
|-------|------|---------|
| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Every prompt — `/ws-tdah` action-first shape + judgment (**upstream development only**) |
| `ws-karpathy-guidelines` | `.agents/skills/ws-karpathy-guidelines/SKILL.md` | Every prompt — surgical scope |
| `ws-changelog` | `.agents/skills/ws-changelog/SKILL.md` | Every task completion |
| `ws-self-learning` | `.agents/skills/ws-self-learning/SKILL.md` | Before plan/code/fix: consult `{sharedDir}/MEMORY.md`; on completion: write traps → compile |
| `ws-senior-developer` | `.agents/skills/ws-senior-developer/SKILL.md` | Every prompt — engineering delivery gate (upstream dogfood) |
| `using-superpowers` | `(global)` | Session start — skill discovery |

**Upstream dogfood (this repo only):** Autoload `/ws-tdah` + `ws-karpathy-guidelines` (+ `ws-senior-developer`) every session when authoring here — see § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only). Consumers get the skills on install but **do not** autoload `ws-tdah` from [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) (on-demand via `/ws-tdah` / `start ws-tdah`).

### Dual-hub precedence (root override)

This **root** hub autoloads `ws-tdah` and `ws-senior-developer` for upstream development dogfood. The installed **ws-shared** hub ([`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md)) treats both as **on-demand** by default (`ws-tdah` via invoke; `ws-senior-developer` via `rules.seniorDeveloper`).

Consumers may add their own root `AGENTS.md` with the same override pattern. When root and ws-shared hubs both load, **root hub** skill-loading and precedence sections win for autoload decisions. This is intentional — not a harness drift defect. See ws-shared § Consumer root override.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. This root `AGENTS.md` when present (skill loading + precedence — overrides ws-shared opt-in defaults; see § Dual-hub precedence)
3. Design / spec / architecture constraints
4. `ws-karpathy-guidelines`
5. `ws-senior-developer` (delivery gate; opt out via `rules.seniorDeveloper` unset or `stop ws-senior-developer`)
6. `ws-tdah` (action-first shape + judgment; still below karpathy/senior)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop ws-tdah` / `stop verbosity` / `normal mode` | Disable ws-tdah |
| `stop ws-gabarito` / `sem ws-gabarito` | Same disable (retired alias) |
| `/ws-tdah` · `/tdah` · `start ws-tdah` · `start ws-gabarito` | Activate (single default mode) |

---

## Harness change protocol

On changes under `.agents/skills/`, this file, `README.md`, or `docs/`:

1. Ask the user whether to run **ws-check-harness** and whether **site** / **README** need updates.
2. Evaluate: ws-check-harness (Phases 0–5c → plan) · site rebuild · `README.md` if install/usage/human docs changed. For PRs that ship package changes, follow § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § Before ship PR — upstream `ws-ship-pr` mandatory gate (dependency graph, integrity, version/catalog, hub drift).
3. If the change affects hashed install content, run integrity regenerate in the same commit (`npm run generate-integrity` + `npm run verify-integrity`) — see § [Before ship PR — upstream `ws-ship-pr` mandatory gate](#before-ship-pr--upstream-ws-ship-pr-mandatory-gate-this-repo-only) step 7.

---

## Skill catalog (layers)

> **Drift check (dual scope):** This root hub lists the **full upstream disk inventory** (Workflows + Extra + global discovery routes). Packaged [`.agents/AGENTS.md`](.agents/AGENTS.md) scopes its Skill index and Task router to the **Workflows package** (34 skills) so Workflows-only consumer installs avoid phantom routes; Extra-package skills appear there only under `### Extra package (optional)`.

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `ws-check-harness` | `.agents/skills/ws-check-harness/SKILL.md` | Harness integrity audit |
| `ws-check-workflows` | `.agents/skills/ws-check-workflows/SKILL.md` | Deep workflow simulation & validation (Full/Lite) |
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
| `ws-secrets-leak-review` | `.agents/skills/ws-secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan |
| `ws-fable-judge` | `.agents/skills/ws-fable-judge/SKILL.md` | Adversarial audit, fraud detection & diff-grounded verification |

### Layer 5 — Utility & meta

| Skill | Path | Notes |
|-------|------|-------|
| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Autoload upstream only (`/ws-tdah`; consumer on-demand) |
| `ws-karpathy-guidelines` | `.agents/skills/ws-karpathy-guidelines/SKILL.md` | Autoload |
| `ws-spec-to-pr` | `.agents/skills/ws-spec-to-pr/SKILL.md` | End-to-end delivery orchestrator FSM |
| `ws-spec-to-pr-lite` | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Fast sequential delivery orchestrator |
| `ws-multi-spec` | `.agents/skills/ws-multi-spec/SKILL.md` | Sequential smart multi-spec batch delivery orchestrator |
| `ws-fable-method` | `.agents/skills/ws-fable-method/SKILL.md` | 7-step problem-solving loop with gates |
| `ws-fable-domain` | `.agents/skills/ws-fable-domain/SKILL.md` | Domain adapter generator & schemas |
| `ws-spec-format` | `.agents/skills/ws-spec-format/SKILL.md` | Specs |
| `ws-self-learning` | `.agents/skills/ws-self-learning/SKILL.md` | Consult MEMORY before write; record traps after → `{sharedDir}/MEMORY.md` |
| `ws-changelog` | `.agents/skills/ws-changelog/SKILL.md` | `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) |
| `ws-configure-project` | `.agents/skills/ws-configure-project/SKILL.md` | Interview/detect fill `ws-shared/config.json` |
| `ws-goal-loop` | `.agents/skills/ws-goal-loop/SKILL.md` | Convergence |
| `ws-spec-index` | `.agents/skills/ws-spec-index/SKILL.md` | Project spec index init/sync/promote |
| `ws-sync-spec` | `.agents/skills/ws-sync-spec/SKILL.md` | Auto-update feature specs after prompt/code evolutions |
| `grill-with-docs` | `(global)` | Docs grill |
| `find-skills` | via `using-superpowers` | Discover/install |

---

## Task router

| Intent | Load |
|--------|------|
| Write a spec | `ws-write-spec` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement | `ws-implement-tasks` |
| Engineering delivery gate / Code review proof | `ws-senior-developer` (autoload in this root hub; ws-shared default on-demand — see § Dual-hub precedence) |
| Verify | `ws-verify-plan` |
| Local code review | `ws-code-review` |
| Secrets / leaks | `ws-secrets-leak-review` |
| Adversarial audit / fraud scan | `ws-fable-judge` |
| Fable Method 7-step loop | `ws-fable-method` |
| Domain adapters (DevOps/Data/Research) | `ws-fable-domain` |
| Testing pre-PR | `ws-testing` |
| Fix PR threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship PR | `ws-ship-pr` |
| Spec → PR E2E | `ws-spec-to-pr` |
| Spec → PR lite | `ws-spec-to-pr-lite` |
| Batch spec delivery | `ws-multi-spec` |
| Project spec index init/sync/promote | `ws-spec-index` |
| Auto-update feature specs after code changes | `ws-sync-spec` |
| GitHub issue/PR ops | `ws-github-provider` |
| ADO WI/PR ops | `ws-azure-devops-provider` |
| Local `*.spec.md` | `ws-local-spec-provider` |
| Format/review spec | `ws-spec-format` |
| New skill / skill rewrite | `ws-write-a-skill` |
| Show active harness | `ws-show-harness` |
| Audit harness | `ws-check-harness` |
| Check workflows | `ws-check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Record learning | `ws-self-learning` |
| Convergence loop | `ws-goal-loop` |
| Record ws-changelog | `ws-changelog` |
| Fill / update `config.json` | `ws-configure-project` |
| Discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification (before claim complete / commit)

Upstream package root: full ordered checklist in § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § [Before ship PR — upstream `ws-ship-pr` mandatory gate](#before-ship-pr--upstream-ws-ship-pr-mandatory-gate-this-repo-only). Summary:

1. **Harness:** load `.agents/skills/ws-check-harness/SKILL.md` → Phases 0–5c
2. **Install tests:** `npm run test` · `npm run tests -- --local`
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
| `senior-developer` | `config.json` → `rules.seniorDeveloper` (default `.agents/skills/ws-senior-developer/SKILL.md`; set `""` to disable) → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `ws-karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `.agents/skills/ws-karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/ws-shared/STACK.md`) — consumer-owned under `ws-shared/`; do not require repo-root `STACK.md` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/ws-shared/CHANGELOG.md`) — create under that path only; repo-root `CHANGELOG.md` only if explicitly configured |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer; starter [`specs/domains/index.md.example`](specs/domains/index.md.example) |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (default `.agents/specs`; prefer existing repo-root `specs/`) · optional `reviews.dir` (default `.agents/codereviews`) |

Packaged consumer mirror: [`ws-shared/AGENTS.md`](.agents/skills/ws-shared/AGENTS.md) § External dependencies · bootstrap notes in [`ws-shared/setup.md`](.agents/skills/ws-shared/setup.md).

### Code review proof

When skills ask for **Code review proof**, use the checklist / verification obligations from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist here.
