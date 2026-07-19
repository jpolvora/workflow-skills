# AGENTS.md — Agent harness hub

**Audience: agents (and tools that load agent instructions).**  
Humans: use [`README.md`](README.md) for install, overview, and contribution narrative.

This file is the **routing and operating contract** for the agent harness in this repository. Load skills from the tables below. Do not treat `README.md` as the skill router.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

---

## Doc roles (mandatory)

| File | Audience | Purpose |
|------|----------|---------|
| **`.cursorrules`** (optional) | Agents | Thin pointer to this hub — manually configured by the consumer |
| **`AGENTS.md`** (this file) | Agents | Skill loading, task router, layers, verification, harness rules |
| **`README.md`** | Humans | What this repo is, how to install/update, contribute, safety |
| **`.agents/AGENTS.md`** | Agents (packaged) | Consumer-facing skill index shipped with installs |
| **`.agents/skills/*/SKILL.md`** | Agents | Progressive disclosure — load on demand via router |

When editing harness docs: put **agent obligations** here; put **human install/UX prose** in `README.md`. Keep them aligned on facts (paths, install commands) without duplicating full skill bodies.

---

## Canonical upstream

Repo `jpolvora/workflow-skills` is the authoritative upstream for workflows and pipeline skills.

- Installed copies via `npx --yes github:jpolvora/workflow-skills` are **managed**. `update` overwrites skill files.
- **Preserve** under `.agents/skills/shared/`: `config.json`, `stack.md`, `MEMORY.md`, `memory/*` (consumer-owned; never overwrite from upstream).
- **Root configuration (consumer-configured):** optional `.cursorrules` → `AGENTS.md` pointer; `CHANGELOG.md` stub — see [`README.md`](README.md) § Optional root configuration. Installer **create-if-missing** only (never overwrite).
- **Latest layout only:** installer does not migrate older folder names — consumers get the current skill tree on install/update. See [`README.md`](README.md) § Safety.
- Lasting skill changes: PR to `develop` → `main` only after **`check-harness`** passes. See [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills.
- After install/update in a consumer: run `check-harness`.
- Skills stay portable: parameterize via `shared/config.json` / stack docs; no project hardcoding. Client data hub: [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (and packaged mirror in [`.agents/AGENTS.md`](.agents/AGENTS.md)).

**This source repo:** do not run remote `npx github:jpolvora/workflow-skills` against the package root (except under `test/`). Prefer local `node bin/cli.js` / `./install-skills.sh`.

---

## Workflows

| Workflow | Path | Role |
|----------|------|------|
| `spec-to-pr` | `.agents/skills/spec-to-pr/SKILL.md` | Spec → plan → interview → implement → check → review → test → ship → fix-pr (FSM F0–F6, steps 0–9) |
| `spec-to-pr-lite` | `.agents/skills/spec-to-pr-lite/SKILL.md` | Fast sequential spec → plan → implement → review → ship → fix-pr (steps 0–5) |

### Dual-mode

- Config: `.agents/skills/shared/config.json` only — [`config-resolution.md`](.agents/skills/shared/config-resolution.md)
- Gates: [`gates.md`](.agents/skills/shared/gates.md) — prefer `AskQuestion`; markdown fallback when unavailable
- **Session model:** `currentModel` = executing session model; switch via Pause → Cursor UI → Resume (no `--model` / `--model-chain`). Optional review-model soft tip at Advance into Step 6 (full orch only)
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
| `self-learning` | `.agents/skills/self-learning/SKILL.md` | Every task completion → `shared/MEMORY.md` |
| `using-superpowers` | `(global)` | Session start — skill discovery |

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
2. Evaluate: check-harness (Phases 0–5c → plan) · `node bin/build-site.js` if catalog/routing changed · `README.md` if install/usage/human docs changed.

---

## Skill catalog (layers)

> **Drift check (dual scope):** This root hub lists the **full upstream disk inventory** (Workflows + Extra + global discovery routes). Packaged [`.agents/AGENTS.md`](.agents/AGENTS.md) scopes its Skill index and Task router to the **Workflows package** (27 skills) so Workflows-only consumer installs avoid phantom routes; Extra-package skills appear there only under `### Extra package (optional)`.

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `.agents/skills/check-harness/SKILL.md` | Harness integrity audit |
| `check-workflows` | `.agents/skills/check-workflows/SKILL.md` | Workflow FSM / dual-mode checks |
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

| Skill | Path |
|-------|------|
| `secrets-leak-review` | `.agents/skills/secrets-leak-review/SKILL.md` |

### Layer 5 — Utility & meta

| Skill | Path | Notes |
|-------|------|-------|
| `caveman` | `.agents/skills/caveman/SKILL.md` | Autoload |
| `gabarito` | `.agents/skills/gabarito/SKILL.md` | Autoload |
| `karpathy-guidelines` | `.agents/skills/karpathy-guidelines/SKILL.md` | Autoload |
| `spec-to-pr` / `spec-to-pr-lite` | `.agents/skills/.../SKILL.md` | Orchestrators |
| `spec-format` | `.agents/skills/spec-format/SKILL.md` | Specs |
| `self-learning` | `.agents/skills/self-learning/SKILL.md` | Writes `shared/MEMORY.md` |
| `changelog` | `.agents/skills/changelog/SKILL.md` | `CHANGELOG.md` |
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
| Discover/install skills | `find-skills` or `using-superpowers` |

---

## Verification (before claim complete / commit)

1. **Harness:** load `.agents/skills/check-harness/SKILL.md` → Phases 0–5c
2. **Install tests:** `npm run tests` · `npm run tests -- --local`
3. **Site (optional):** `gh api repos/jpolvora/workflow-skills/pages`
4. **Catalog:** if layers/routing changed → `node bin/build-site.js`
---

## Local dry-run: agentic code reviewers

Requires `OPENCODE_API_KEY`. Reviews `develop`…`main` (Custom stack + repo prompt). See [`README.md`](README.md) for human-oriented context; command:

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

Not shipped in the hub package (except where noted). Resolve each dependency in **order** (first match wins). Paths are project-agnostic; read values from `.agents/skills/shared/config.json` when present.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | `config.json` → `rules.seniorDeveloper` → local skill (`senior-developer/SKILL.md`) → `.cursor/rules/senior-developer.mdc` (or equivalent path from config) → global/user skill |
| `karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `.agents/skills/karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `STACK.md` / `stack.md`) — consumer-owned |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set (e.g. `rules.efMigrations`, `rules.viewPatterns`) — do not invent filenames |
| Domain catalog | `specs/domains/` — consumer; starter [`specs/domains/index.md.example`](specs/domains/index.md.example) |

Packaged install mirror (consumers without this root section): [`.agents/AGENTS.md`](.agents/AGENTS.md) § External dependencies · bootstrap notes in [`shared/setup.md`](.agents/skills/shared/setup.md).

### Code review proof

When skills ask for **Code review proof**, use the checklist / verification obligations from the **resolved** `rules.seniorDeveloper` skill (local/global `senior-developer` equivalent after the table above). Do **not** paste or duplicate that checklist here.
