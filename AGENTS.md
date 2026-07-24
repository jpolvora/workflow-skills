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
| **Capability vocabulary** | Use portable aliases from [`shared/tools.md`](.agents/skills/shared/tools.md): `user-gate`, `dispatch-agent`, path tokens `{skillsRoot}` / `{sharedDir}` / `{plansDir}` (← `plans.dir`), etc. Load `config.json` + `tools.md` Path tokens before tool calls; expand braces first. Prefer a host structured-choice UI when available; markdown fallback when not. |
| **Consumer-owned asset paths** | Workflow artifacts, reviews, and optional project rules live where **the consumer configures** them (`config.json` → `plans.dir`, `reviews.dir`, `rules.*`). Skill prose uses `{plansDir}/{slug}/` — never hardcode the default path. Shipped default for `plans.dir` is `.agents/plans`. |
| **No compatibility maintenance** | Do **not** keep legacy path aliases, migration shims, or dual defaults for old host-specific folders. Latest layout only on install/update. |
| **Host adapters stay out of skills** | Optional host pointer files, marketplace manifests, and this upstream repo’s local `.cursor/` tree are **not** part of the portable skill contract. Put lasting guidance in skills / `AGENTS.md`, not host-private rule files. |
| **Upstream dogfood exception** | This source repo may keep a local `.cursor/` for authoring/plans. That layout must **not** leak into shipped skill defaults or required consumer paths. |

Mirror for packaged authoring: [`.agents/AGENTS.md`](.agents/AGENTS.md) § Portability and genericity (upstream only; consumers use [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md)).

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

- Installed copies via `npx --yes github:jpolvora/workflow-skills` are **managed**. `update` overwrites skill files; `uninstall` removes skill folders (cascades unused deps) and never deletes `shared/` consumer data.
- **Preserve** under `.agents/skills/shared/`: `config.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, optional `CHANGELOG.md` when `rules.changelogFile` points there (consumer-owned; never overwrite from upstream). Installer does **not** copy `.agents/AGENTS.md` — consumer hub is `shared/AGENTS.md`. Fresh install seeds `config.json` (from example), `MEMORY.md`, `CHANGELOG.md`, and `STACK.md` under `shared/` when missing. Installer never writes consumer repo-root files.
- **Latest layout only:** installer does not migrate older folder names or legacy host paths — consumers get the current skill tree and neutral defaults on install/update. See [`README.md`](README.md) § Safety and § [Portability & harness neutrality](#portability--harness-neutrality-mandatory).
- Lasting skill changes: PR to `develop` → `main` only after **`check-harness`** passes. See [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills.
- **Consumers / CI / Actions:** agents must not silently hygiene-refactor managed skill scripts; lasting fixes → suggest or open an **upstream** PR. See [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md) § Managed skills.
- After install/update in a consumer: run `check-harness`.
- Skills stay portable: parameterize via `shared/config.json` / stack docs; no project hardcoding; no IDE/agent product coupling. Client data hub: [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (consumer install mirror: [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md)).
- **This upstream’s local `.cursor/`:** authoring/plans only for this repo — never the shipped default for consumers.
- **Upstream developer loop:** § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) (this package root only — not the portable consumer contract).

### Upstream developer workflow (this repo only)

**Local project rule** for agents in `jpolvora/workflow-skills`. Consumers dogfood the same skills via install but follow [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md) — not this section.

#### Skill tree (authoritative source)

- **Develop and test** under `.agents/skills/*` — pipeline, providers, utilities, and shared hub templates.
- **Package and publish** via the installer/CLI (`bin/cli.js`, `bin/skill-dependencies.json`, `bin/skill-integrity.json`) into consumer projects (`npx github:jpolvora/workflow-skills`).
- **Lasting changes** belong in upstream PRs (`develop` → `main`); consumer copies are managed and overwritten on `update`.

#### Skill authoring contract

| Topic | Canonical doc |
|-------|----------------|
| Portability, language, folder naming | [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills |
| Script launchers (`python` / `node` / `bash`) | [`shared/tools.md`](.agents/skills/shared/tools.md) § Script launchers |
| New or rewritten skills (markdown + scripts) | [`write-a-skill`](.agents/skills/write-a-skill/SKILL.md) |
| Spec shape / review | [`spec-format`](.agents/skills/spec-format/SKILL.md) |

Managed script calls use explicit launchers; do not rewrite skill scripts for shell quirks in consumer trees — fix upstream.

#### Recommended DX autoload (upstream dogfood)

In **this repo**, load every session for authoring quality:

| Skill | Why |
|-------|-----|
| `karpathy-guidelines` | Surgical scope; no drive-by refactors |
| `gabarito` | Operational rigor and verification discipline |
| `caveman` | Compression (opt out via `stop caveman` / `normal mode`) |

These ship to consumers but are **not required** on consumer projects — consumer hubs may treat them as optional recommendations.

#### Start work

| Intent | Load |
|--------|------|
| Draft a spec | `ws-write-spec` (`00-write-spec`) or local `specs/**/*.spec.md` + `spec-format` |
| Spec → PR (full) | `spec-to-pr` |
| Spec → PR (fast) | `spec-to-pr-lite` |
| GitHub issue → spec / fix | `github-provider` or orchestrator with issue URL |
| Open PR review threads | `ws-fix-pr` / `ws-goal-fix-pr` |

Workflow artifacts: prefer repo-root `specs/` (this upstream dogfoods `specs/`); consumers use `config.json` → `plans.dir` / `plans.specsDir`.

#### After changes (recommend / gate)

After edits under `.agents/skills/`, hubs, `docs/`, `bin/`, or installer inputs:

1. Run **`check-harness`** (Phases 0–5c) — see also § [Harness change protocol](#harness-change-protocol).
2. Resolve **critical** findings before claim complete / merge.

#### Before ship PR (package release checklist)

When shipping changes that modify installable package content (skills, CLI, installer, shared hub templates, site catalog, dependency graph):

| # | Step | Command / Skill | Purpose |
|---|------|-----------------|---------|
| 1 | **Tests** | `npm run test` | Run installer, integrity checks, and tree verification |
| 2 | **Version Bump** | `npm run build-site:bump` | Increment `package.json` patch version once and stamp site footer |
| 3 | **Integrity Digests** | `npm run generate-integrity` && `npm run verify-integrity` | Update and verify `bin/skill-integrity.json` checksums |
| 4 | **Harness Audit** | `check-harness` / `python .agents/skills/check-workflows/scripts/check_workflows.py` | Ensure 0 critical harness errors |
| 5 | **Clean Site Docs** | Verify `docs/index.html` | Confirm no git merge conflict markers exist |
| 6 | **Hub Drift** | Sync `AGENTS.md` + `.agents/AGENTS.md` | Keep packaged hub indexes aligned |
| 7 | **Ship & Converge** | `/ship-pr` | Commit, push, create PR, wait 30s for Action start, run `goal-fix-pr` (300s) |

*Note*: CI deploy on `main` never bumps version; every upstream release PR must run `build-site:bump` and `generate-integrity` locally before push. `08-ship-pr` automatically discovers this checklist during Step 2 preflight.

### Consumer CLI (install / update / uninstall)

Human narrative: [`README.md`](README.md) § Install, update, and uninstall. Agents in a **consumer** project (not this package root):

```bash
npx --yes github:jpolvora/workflow-skills              # interactive install
npx --yes github:jpolvora/workflow-skills install --package workflows --yes
npx --yes github:jpolvora/workflow-skills update       # uses shared/installed-skills.json
npx --yes github:jpolvora/workflow-skills update --include-new
npx --yes github:jpolvora/workflow-skills uninstall --skills <csv> --yes
```

Manifest: `.agents/skills/shared/installed-skills.json` (`skills` + `selected` roots). Missing on first update → bootstrap from disk. Uninstall preserves `shared/` (config, MEMORY, stack, manifest rewrite).

**This source repo:** do not run remote `npx github:jpolvora/workflow-skills` against the package root (except under `test/`). Prefer local `node bin/cli.js` / `./install-skills.sh`.

---

## Workflows

| Workflow | Path | Role |
|----------|------|------|
| `spec-to-pr` | `.agents/skills/spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `spec-to-pr-lite` | `.agents/skills/spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → review → ship → fix-pr (steps 0–5) |

### Dual-mode

- Config: `.agents/skills/shared/config.json` only — [`config-resolution.md`](.agents/skills/shared/config-resolution.md)
- Gates: [`gates.md`](.agents/skills/shared/gates.md) — prefer `user-gate` (native structured choice when available; markdown fallback)
- **Session model:** `currentModel` = executing session model; switch via Pause → IDE/agent host → Resume (no `--model` / `--model-chain`). Optional review-model soft tip at Advance into Step 6 (full orch only)
- State: `workflowType` `standard` | `lite` (no cross-resume)
- Shared pipeline skills stay orch-agnostic
- **Dispatch:** [`spec-to-pr/STEP-DISPATCH.md`](.agents/skills/spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–9). Lite keeps its own Steps 0–5 table; do not use STEP-DISPATCH as lite step numbers.

### Pipeline skills (owned here)

| Skill | Step(s) | Role |
|-------|---------|------|
| `spec-to-pr` | Orchestrator | FSM dispatcher |
| `ws-write-spec` | 0 | Spec from description |
| `ws-write-plan` | 1 | Implementation plan |
| `ws-interview` | 2 | Plan audit |
| `ws-plan-to-tasks` | 3 | DAG tasks |
| `ws-implement-tasks` | 4, 6 (fix substep) | Build / review fix |
| `ws-verify-plan` | 5 | Check-implementation (spec score) |
| `ws-code-review` | 6 | Local review (+ conditional fix) |
| `ws-testing` | 7 | Testing (unit/integration/coverage) |
| `ws-ship-pr` | 8 | Delivery commit + push/PR |
| `ws-fix-pr` | 9 | PR thread fix |
| `ws-goal-fix-pr` | 9 | Fix until zero threads |
| `ws-update-plan-implementation` | Post | Plan deltas |
| `github-provider` | Provider | GitHub issue→spec + PR ops |
| `azure-devops-provider` | Provider | ADO WI→spec + PR ops |
| `local-spec-provider` | Provider | Local `*.spec.md` |
| `spec-format` | Protocol | Spec format |
| `goal-loop` | Primitive | Convergence loop |

---

## Skill loading (mandatory)

| Skill | Path | Trigger |
|-------|------|---------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Every prompt — compression |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Every prompt — operational guidelines |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Every prompt — surgical scope |
| `changelog` | `.agents/skills/changelog/SKILL.md` | Every task completion |
| `self-learning` | `.agents/skills/self-learning/SKILL.md` | Before plan/code/fix: consult `{sharedDir}/MEMORY.md`; on completion: write traps → compile |
| `using-superpowers` | `(global)` | Session start — skill discovery |

**Upstream dogfood (this repo):** The `karpathy-guidelines` / `gabarito` / `caveman` trio is **recommended every session** when authoring here — see § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only). Consumers receive these skills on install but need not autoload them; [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md) documents the consumer contract.

### Precedence (highest first)

1. Explicit user instructions (current turn)
2. Design / spec / architecture constraints
3. `karpathy-guidelines`
4. `gabarito`
5. `caveman` (compression only; keep technical accuracy)

### Opt-out

| Phrase | Effect |
|--------|--------|
| `stop caveman` / `normal mode` | Disable caveman |
| `stop gabarito` / `sem gabarito` | Disable gabarito |
| `/caveman lite\|full\|ultra\|…` | Intensity |

---

## Harness change protocol

On changes under `.agents/skills/`, this file, `README.md`, or `docs/`:

1. Ask the user whether to run **check-harness** and whether **site** / **README** need updates.
2. Evaluate: check-harness (Phases 0–5c → plan) · site rebuild · `README.md` if install/usage/human docs changed. For PRs that ship package changes, follow § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § Before ship PR (dependency graph, integrity, version/catalog, hub drift).
3. If the change affects hashed install content, run § [Upstream skill integrity regenerate](#upstream-skill-integrity-regenerate-this-repo-only) in the same commit (`npm run generate-integrity` + `npm run verify-integrity`).

---

## Skill catalog (layers)

> **Drift check (dual scope):** This root hub lists the **full upstream disk inventory** (Workflows + Extra + global discovery routes). Packaged [`.agents/AGENTS.md`](.agents/AGENTS.md) scopes its Skill index and Task router to the **Workflows package** (31 skills) so Workflows-only consumer installs avoid phantom routes; Extra-package skills appear there only under `### Extra package (optional)`.

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `.agents/skills/check-harness/SKILL.md` | Harness integrity audit |
| `check-workflows` | `.agents/skills/check-workflows/SKILL.md` | Deep workflow simulation & validation (Full/Lite) |
| `write-a-skill` | `.agents/skills/write-a-skill/SKILL.md` | Create/edit/optimize skills (Extra) |
| `show-harness` | `.agents/skills/show-harness/SKILL.md` | Session harness snapshot (Extra) |
| `using-superpowers` | `(global)` | Skill discovery |

### Layer 1 — Engineering standards

*(None on disk in this upstream tree. Former Extra UI skills were removed; restore via PR if needed.)*

### Layer 2 — Pipeline + providers

| Step | Skill | Path |
|------|-------|------|
| 00 | `ws-write-spec` | `.agents/skills/00-write-spec/SKILL.md` |
| 01 | `ws-write-plan` | `.agents/skills/01-write-plan/SKILL.md` |
| 02 | `ws-interview` | `.agents/skills/02-interview/SKILL.md` |
| 03 | `ws-plan-to-tasks` | `.agents/skills/03-plan-to-tasks/SKILL.md` |
| 04 | `ws-implement-tasks` | `.agents/skills/04-implement-tasks/SKILL.md` |
| 05 | `ws-verify-plan` | `.agents/skills/05-verify-plan/SKILL.md` |
| 06 | `ws-code-review` | `.agents/skills/06-code-review/SKILL.md` |
| 07 | `ws-testing` | `.agents/skills/07-testing/SKILL.md` |
| 08 | `ws-ship-pr` | `.agents/skills/08-ship-pr/SKILL.md` |
| 09 | `ws-fix-pr` | `.agents/skills/09-fix-pr/SKILL.md` |
| — | `ws-goal-fix-pr` | `.agents/skills/goal-fix-pr/SKILL.md` |
| Post | `ws-update-plan-implementation` | `.agents/skills/update-plan-implementation/SKILL.md` |
| — | `github-provider` | `.agents/skills/github-provider/SKILL.md` |
| — | `azure-devops-provider` | `.agents/skills/azure-devops-provider/SKILL.md` |
| — | `local-spec-provider` | `.agents/skills/local-spec-provider/SKILL.md` |

### Layer 3 — Discovery (reserved)

Install via `using-superpowers` / `find-skills` until routed here.

### Layer 4 — Review & audit

| Skill | Path | Description |
|-------|------|-------------|
| `secrets-leak-review` | `.agents/skills/secrets-leak-review/SKILL.md` | Secrets / PII / credential leak scan |
| `fable-judge` | `.agents/skills/fable-judge/SKILL.md` | Adversarial audit, fraud detection & diff-grounded verification |

### Layer 5 — Utility & meta

| Skill | Path | Notes |
|-------|------|-------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Autoload |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Autoload |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Autoload |
| `spec-to-pr` / `spec-to-pr-lite` | `.agents/skills/.../SKILL.md` | Orchestrators |
| `fable-method` | `.agents/skills/fable-method/SKILL.md` | 7-step problem-solving loop with gates |
| `fable-domain` | `.agents/skills/fable-domain/SKILL.md` | Domain adapter generator & schemas |
| `spec-format` | `.agents/skills/spec-format/SKILL.md` | Specs |
| `self-learning` | `.agents/skills/self-learning/SKILL.md` | Consult MEMORY before write; record traps after → `{sharedDir}/MEMORY.md` |
| `changelog` | `.agents/skills/changelog/SKILL.md` | `rules.changelogFile` (default `.agents/skills/shared/CHANGELOG.md`) |
| `configure-project` | `.agents/skills/configure-project/SKILL.md` | Interview/detect fill `shared/config.json` |
| `goal-loop` | `.agents/skills/goal-loop/SKILL.md` | Convergence |
| `grill-with-docs` | `(global)` | Docs grill |
| `find-skills` | via `using-superpowers` | Discover/install |

---

## Task router

| Intent | Load |
|--------|------|
| Write a spec | `ws-write-spec` |
| Plan implementation | `ws-write-plan` → `ws-interview` → `ws-plan-to-tasks` |
| Implement | `ws-implement-tasks` |
| Verify | `ws-verify-plan` |
| Local code review | `ws-code-review` |
| Secrets / leaks | `secrets-leak-review` |
| Adversarial audit / fraud scan | `fable-judge` |
| Fable Method 7-step loop | `fable-method` |
| Domain adapters (DevOps/Data/Research) | `fable-domain` |
| Testing pre-PR | `ws-testing` |
| Fix PR threads | `ws-fix-pr` / `ws-goal-fix-pr` |
| Ship PR | `ws-ship-pr` |
| Spec → PR E2E | `spec-to-pr` |
| Spec → PR lite | `spec-to-pr-lite` |
| GitHub issue/PR ops | `github-provider` |
| ADO WI/PR ops | `azure-devops-provider` |
| Local `*.spec.md` | `local-spec-provider` |
| Format/review spec | `spec-format` |
| New skill / skill rewrite | `write-a-skill` |
| Show active harness | `show-harness` |
| Audit harness | `check-harness` |
| Check workflows | `check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Record learning | `self-learning` |
| Convergence loop | `goal-loop` |
| Record changelog | `changelog` |
| Fill / update `config.json` | `configure-project` |
| Discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification (before claim complete / commit)

Upstream package root: full ordered checklist in § [Upstream developer workflow](#upstream-developer-workflow-this-repo-only) § Before ship PR. Summary:

1. **Harness:** load `.agents/skills/check-harness/SKILL.md` → Phases 0–5c
2. **Install tests:** `npm run tests` · `npm run tests -- --local`
3. **Dependency graph:** if skills added/removed/renamed or orch dispatch changed → update `bin/skill-dependencies.json`; `check-harness` Phase 3/4b must pass
4. **Skill integrity:** if package-hashed content changed → § [Upstream skill integrity regenerate](#upstream-skill-integrity-regenerate-this-repo-only); always `npm run verify-integrity` (must exit 0) before claim complete / PR. Testing Step approval requires this green.
5. **Site (optional):** `gh api repos/jpolvora/workflow-skills/pages`
6. **Catalog / version:** if shipping package changes → § [Upstream PR version bump](#upstream-pr-version-bump-this-repo-only); else if only regenerating catalog → `node bin/build-site.js` (no bump). `package.json` ↔ footer must match; CI deploy never bumps.
---

## Local dry-run: agentic code reviewers

Upstream-only verification helper (not part of the portable skill contract). Requires the reviewer’s API key env var. Reviews `develop`…`main` (Custom stack + repo prompt). See [`README.md`](README.md) for human-oriented context; command:

```bash
curl -fsSL https://raw.githubusercontent.com/jpolvora/agentic-code-reviewers/release/run.sh | bash -s -- \
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

Not shipped in the hub package (except where noted). Resolve each dependency in **order** (first match wins). Paths are project-agnostic; read values from `.agents/skills/shared/config.json` when present. Do **not** assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | `config.json` → `rules.seniorDeveloper` → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `.agents/skills/karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/shared/STACK.md`) — consumer-owned under `shared/`; do not require repo-root `STACK.md` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/shared/CHANGELOG.md`) — create under that path only; repo-root `CHANGELOG.md` only if explicitly configured |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames; prefer skills over host-private rule files |
| Domain catalog | `specs/domains/` — consumer; starter [`specs/domains/index.md.example`](specs/domains/index.md.example) |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (default `.agents/specs`; prefer existing repo-root `specs/`) · optional `reviews.dir` (default `.agents/codereviews`) |

Packaged consumer mirror: [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md) § External dependencies · bootstrap notes in [`shared/setup.md`](.agents/skills/shared/setup.md).

### Code review proof

When skills ask for **Code review proof**, use the checklist / verification obligations from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist here.
