# Shared — Workflow Config & Docs Hub

> **Config, gates, and bootstrap docs** for [`spec-to-pr`](../spec-to-pr/SKILL.md) and [`spec-to-pr-lite`](../spec-to-pr-lite/SKILL.md).
>
> This folder is **not** an installable skill package. The interactive installer copies only hub files here when a workflow or Full package is selected.
>
> Promoted utility skills (`caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`) live as **top-level** installable skills under `.agents/skills/<skill>/`.
>
> Consumer-owned (preserved on update): `config.json`, and (at top-level) `self-learning/memory/` + `MEMORY.md`.

---

## Config & Tools

| File | Purpose |
|------|---------|
| [`config.json.example`](config.json.example) | Project config template — copy to `config.json`, fill in, never commit |
| [`config.schema.json`](config.schema.json) | JSON Schema for `config.json` validation |
| [`config-resolution.md`](config-resolution.md) | Canonical config path + SCM resolution (dual-mode) |
| [`gates.md`](gates.md) | Shared AskQuestion / delivery / ship gate contract (dual-mode) |
| [`tools.md`](tools.md) | Canonical agent tool vocabulary (aliases → config keys) |
| [`stack.md`](stack.md) | Human-readable companion to `config.json` |
| [`setup.md`](setup.md) | Bootstrap & entry logic shared by `spec-to-pr` and `spec-to-pr-lite` |

---

## Promoted skills (top-level installables)

| Skill | Path |
|-------|------|
| `caveman` | [`../caveman/SKILL.md`](../caveman/SKILL.md) |
| `gabarito` | [`../gabarito/SKILL.md`](../gabarito/SKILL.md) |
| `karpathy-guidelines` | [`../karpathy-guidelines/SKILL.md`](../karpathy-guidelines/SKILL.md) |
| `spec-format` | [`../spec-format/SKILL.md`](../spec-format/SKILL.md) |
| `goal-loop` | [`../goal-loop/SKILL.md`](../goal-loop/SKILL.md) |
| `self-learning` | [`../self-learning/SKILL.md`](../self-learning/SKILL.md) |
| `changelog` | [`../changelog/SKILL.md`](../changelog/SKILL.md) |

Install packages and dependency map: [`../../bin/skill-dependencies.json`](../../bin/skill-dependencies.json).
