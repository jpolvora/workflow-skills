# Shared — Workflow Config & Consumer Data Hub

**Audience: agents** (config resolution, gates, consumer-owned paths). Humans: install narrative in root [`README.md`](../../../README.md).

> **Config, gates, bootstrap docs, and consumer-owned project data** for [`spec-to-pr`](../spec-to-pr/SKILL.md) and [`spec-to-pr-lite`](../spec-to-pr-lite/SKILL.md).
>
> This folder is **not** an installable skill package. The interactive installer copies hub templates here when a workflow or Full package is selected.
>
> Promoted utility skills (`caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`, `configure-project`) live as **top-level** installable skills under `.agents/skills/<skill>/`.
>
> **Consumer-owned** (preserved on update; never overwritten by upstream):
> `config.json`, `stack.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, and optional `CHANGELOG.md` (when `rules.changelogFile` points under `shared/`).
> Fresh install seeds empty `MEMORY.md` from `MEMORY.md.template` and `stack.md` from `stack.md.example`. Upstream hub memory/stack/config are **not** copied to consumers. Prefer [`configure-project`](../configure-project/SKILL.md) to interview/detect and fill `config.json`. The installer writes `installed-skills.json` for update/uninstall tracking.

---

## Config & Tools

| File | Purpose |
|------|---------|
| [`config.json.example`](config.json.example) | Project config template — copy to `config.json`, fill via [`configure-project`](../configure-project/SKILL.md), never commit |
| [`config.schema.json`](config.schema.json) | JSON Schema for `config.json` validation |
| [`config-resolution.md`](config-resolution.md) | Canonical config path + SCM resolution (dual-mode) |
| [`gates.md`](gates.md) | Shared user-gate / delivery / ship / session-model banner (dual-mode) |
| [`tools.md`](tools.md) | Canonical agent tool vocabulary (aliases → config keys) |
| [`stack.md.example`](stack.md.example) | Template for human-readable stack companion — seeds `stack.md` |
| [`setup.md`](setup.md) | Bootstrap & entry logic shared by `spec-to-pr` and `spec-to-pr-lite` |
| [`MEMORY.md.template`](MEMORY.md.template) | Empty memory index template — seeds `MEMORY.md` |

## Consumer-owned (local only)

| File | Purpose |
|------|---------|
| `config.json` | Project identity, stack, verification, providers |
| `stack.md` | Human-readable companion to `config.json` (edit freely) |
| `MEMORY.md` | Compiled anti-regression index (`self-learning` skill) |
| `memory/*.md` | Individual memory entries (compile into `MEMORY.md`) |
| `CHANGELOG.md` | Optional append-only history when `rules.changelogFile` defaults here |
| `installed-skills.json` | Managed skill list for `update` / `uninstall` (installer-written) |

---

## Promoted skills (top-level installables)

| Skill | Path |
|-------|------|
| `caveman` | [`../caveman/SKILL.md`](../caveman/SKILL.md) |
| `gabarito` | [`../gabarito/SKILL.md`](../gabarito/SKILL.md) |
| `karpathy-guidelines` | [`../karpathy-guidelines/SKILL.md`](../karpathy-guidelines/SKILL.md) |
| `spec-format` | [`../spec-format/SKILL.md`](../spec-format/SKILL.md) |
| `configure-project` | [`../configure-project/SKILL.md`](../configure-project/SKILL.md) |
| `goal-loop` | [`../goal-loop/SKILL.md`](../goal-loop/SKILL.md) |
| `self-learning` | [`../self-learning/SKILL.md`](../self-learning/SKILL.md) |
| `changelog` | [`../changelog/SKILL.md`](../changelog/SKILL.md) |

Install packages and dependency map: upstream `bin/skill-dependencies.json` in [workflow-skills](https://github.com/jpolvora/workflow-skills) (not vendored in consumer clones).

---

## Skill discovery (consumers)

Installed skills live at `.agents/skills/<name>/SKILL.md`. Load on demand from orchestrator dispatch, task intent, or host skill discovery. There is **no** separate packaged `.agents/AGENTS.md` in consumer projects; this file is the consumer-facing hub for config, gates, and external dependencies.

---

## External dependencies

Not shipped in the hub package (except where noted). Resolve each dependency in **order** (first match wins). Read paths from `config.json` when present. Do **not** assume host-private rule folders.

| Dependency | Resolve (first match) |
|------------|------------------------|
| `senior-developer` | `config.json` → `rules.seniorDeveloper` → local skill (`senior-developer/SKILL.md`) → global/user skill |
| `karpathy-guidelines` | `config.json` → `rules.karpathyGuidelines` → shipped `../karpathy-guidelines/SKILL.md` → global skill |
| Stack companion | `config.json` → `rules.stackFile` (default `.agents/skills/shared/stack.md`) — consumer-owned under `shared/` |
| Changelog file | `config.json` → `rules.changelogFile` (default `.agents/skills/shared/CHANGELOG.md`) |
| Domain glossary | `config.json` → `domain.glossaryFile` (often `CONTEXT.md`) — consumer root, optional |
| Optional consumer rules | Other `config.json` `rules.*` paths when set — do not invent filenames |
| Workflow artifacts | `config.json` → `plans.dir` (token `{plansDir}`; default `.agents/plans`) · `plans.specsDir` (default `.agents/plans/specs`) · optional `reviews.dir` (default `.agents/codereviews`) |

Bootstrap notes: [`setup.md`](setup.md). Config resolution: [`config-resolution.md`](config-resolution.md).

### Code review proof

When skills ask for **Code review proof**, use the checklist from the **resolved** `rules.seniorDeveloper` skill. Do **not** paste or duplicate that checklist here.
