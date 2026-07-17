# AGENTS.md — Agent harness hub

**Audience: agents (and tools that load agent instructions).**  
Humans: use [`README.md`](README.md) for install, overview, and contribution narrative.

This file is the **routing and operating contract** for the agent harness in this repository. Load skills from the tables below. Do not treat `README.md` as the skill router.

**Language:** en-us only for skill bodies, gates, banners, and harness docs.

---

## Doc roles (mandatory)

| File | Audience | Purpose |
|------|----------|---------|
| **`.cursorrules`** (optional) | Agents | Thin pointer to this hub — create-if-missing on consumer install |
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
- **Root seeds (create-if-missing, never overwrite):** `.cursorrules` → `AGENTS.md` pointer; `CHANGELOG.md` stub — see [`README.md`](README.md) § Optional root seeds.
- Lasting skill changes: PR to `develop` → `main` only after **`check-harness`** passes. See [`.agents/AGENTS.md`](.agents/AGENTS.md) § Rules for skills.
- After install/update in a consumer: run `check-harness`.
- Skills stay portable: parameterize via `shared/config.json` / stack docs; no project hardcoding. Client data hub: [`shared/AGENTS.md`](.agents/skills/shared/AGENTS.md).
- Guardrails resolution: § [External dependencies](#external-dependencies) (and packaged mirror in [`.agents/AGENTS.md`](.agents/AGENTS.md)).

**This source repo:** do not run remote `npx github:jpolvora/workflow-skills` against the package root (except under `test/`). Prefer local `node bin/cli.js` / `./install-skills.sh`.

---

## Workflows

| Workflow | Path | Role |
|----------|------|------|
| `spec-to-pr` | `.agents/skills/spec-to-pr/SKILL.md` | Spec → plan → implement → verify → review → integrate → PR (FSM F0–F6, steps 0–13) |
| `spec-to-pr-lite` | `.agents/skills/spec-to-pr-lite/SKILL.md` | Fast sequential plan → implement → review → ship (steps 1–5) |

### Dual-mode

- Config: `.agents/skills/shared/config.json` only — [`config-resolution.md`](.agents/skills/shared/config-resolution.md)
- Gates: [`gates.md`](.agents/skills/shared/gates.md) — prefer `AskQuestion`; markdown fallback when unavailable
- **Session model:** `currentModel` = executing session model; switch via Pause → Cursor UI → Resume (no `--model` / `--model-chain`). Soft tips at F1→F2 / F3→F4 (full orch only)
- State: `workflowType` `standard` | `lite` (no cross-resume)
- Shared pipeline skills stay orch-agnostic
- **Dispatch:** [`spec-to-pr/STEP-DISPATCH.md`](.agents/skills/spec-to-pr/STEP-DISPATCH.md) is **standard-only** (steps 0–13). Lite keeps its own Steps 1–5 table; do not use STEP-DISPATCH as lite step numbers.

### Pipeline skills (owned here)

| Skill | Step(s) | Role |
|-------|---------|------|
| `spec-to-pr` | Orchestrator | FSM dispatcher |
| `00-write-spec` | 0 | Spec from description |
| `01-write-plan` | 1 | Implementation plan |
| `02-interview` | 2 | Plan audit |
| `03-plan-to-tasks` | 3 | DAG tasks |
| `04-implement-tasks` | 5, 10 | Build / fix |
| `05-verify-plan` | 6 | Acceptance verify |
| `06-code-review` | 9 | Local review |
| `07-integration-validation` | 11 | Pre-PR tests |
| `08-fix-pr` | 13 (via ship) | PR thread fix |
| `09-goal-fix-pr` | 13 (via ship) | Fix until zero threads |
| `10-update-plan-implementation` | Post | Plan deltas |
| `11-ship-pr` | 13 | PR deliver / merge |
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

### Layer 0 — Harness

| Skill | Path | Description |
|-------|------|-------------|
| `check-harness` | `.agents/skills/check-harness/SKILL.md` | Harness integrity audit |
| `check-workflows` | `.agents/skills/check-workflows/SKILL.md` | Workflow FSM / dual-mode checks |
| `write-a-skill` | `.agents/skills/write-a-skill/SKILL.md` | Author new skills |
| `using-superpowers` | `(global)` | Skill discovery |

### Layer 1 — Engineering standards

| Skill | Path | Description |
|-------|------|-------------|
| `mobile-first-design` | `.agents/skills/mobile-first-design/SKILL.md` | Mobile-first UI |
| `design-taste-frontend` | `.agents/skills/taste-skill/SKILL.md` | Anti-slop frontend |

### Layer 2 — Pipeline + providers

| Step | Skill | Path |
|------|-------|------|
| 00 | `00-write-spec` | `.agents/skills/00-write-spec/SKILL.md` |
| 01 | `01-write-plan` | `.agents/skills/01-write-plan/SKILL.md` |
| 02 | `02-interview` | `.agents/skills/02-interview/SKILL.md` |
| 03 | `03-plan-to-tasks` | `.agents/skills/03-plan-to-tasks/SKILL.md` |
| 04 | `04-implement-tasks` | `.agents/skills/04-implement-tasks/SKILL.md` |
| 05 | `05-verify-plan` | `.agents/skills/05-verify-plan/SKILL.md` |
| 06 | `06-code-review` | `.agents/skills/06-code-review/SKILL.md` |
| 07 | `07-integration-validation` | `.agents/skills/07-integration-validation/SKILL.md` |
| 08 | `08-fix-pr` | `.agents/skills/08-fix-pr/SKILL.md` |
| 09 | `09-goal-fix-pr` | `.agents/skills/09-goal-fix-pr/SKILL.md` |
| 10 | `10-update-plan-implementation` | `.agents/skills/10-update-plan-implementation/SKILL.md` |
| 11 | `11-ship-pr` | `.agents/skills/11-ship-pr/SKILL.md` |
| — | `github-provider` | `.agents/skills/github-provider/SKILL.md` |
| — | `azure-devops-provider` | `.agents/skills/azure-devops-provider/SKILL.md` |
| — | `local-spec-provider` | `.agents/skills/local-spec-provider/SKILL.md` |

### Layer 3 — Discovery (reserved)

Install via `using-superpowers` / `find-skills` until routed here.

### Layer 4 — Review & audit

| Skill | Path |
|-------|------|
| `security-review` | `.agents/skills/security-review/SKILL.md` |
| `dotnet-security-performance-review` | `.agents/skills/dotnet-security-performance-review/SKILL.md` |
| `tdd-sdd-ddd-reviewer` | `.agents/skills/tdd-sdd-ddd-reviewer/SKILL.md` |
| `domain-review` | `.agents/skills/domain-review/SKILL.md` |
| `multi-domain-review` | `.agents/skills/multi-domain-review/SKILL.md` |
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
| Write a spec | `00-write-spec` |
| Plan implementation | `01-write-plan` → `02-interview` → `03-plan-to-tasks` |
| Implement | `04-implement-tasks` |
| Verify | `05-verify-plan` |
| Local code review | `06-code-review` |
| Security | `security-review` or `dotnet-security-performance-review` |
| Secrets / leaks | `secrets-leak-review` |
| Architecture (DDD) | `tdd-sdd-ddd-reviewer` |
| Domain review | `domain-review` or `multi-domain-review` |
| Integration pre-PR | `07-integration-validation` |
| Fix PR threads | `08-fix-pr` |
| Ship PR | `11-ship-pr` |
| Spec → PR E2E | `spec-to-pr` |
| Spec → PR lite | `spec-to-pr-lite` |
| GitHub issue/PR ops | `github-provider` |
| ADO WI/PR ops | `azure-devops-provider` |
| Local `*.spec.md` | `local-spec-provider` |
| Format/review spec | `spec-format` |
| New skill | `write-a-skill` |
| Audit harness | `check-harness` |
| Check workflows | `check-workflows` |
| Grill plan vs docs | `grill-with-docs` |
| Frontend design | `design-taste-frontend` or `mobile-first-design` |
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
