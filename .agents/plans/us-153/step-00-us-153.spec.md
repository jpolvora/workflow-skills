---
id: 153
slug: us-153
title: "Align shared hub docs: ws-senior-developer opt-in vs consumer root AGENTS.md autoload"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/153"
specDate: 2026-07-27
---

# Specification — Align shared hub docs: ws-senior-developer opt-in vs consumer root AGENTS.md autoload

**State:** open

## Description

## Summary

Dual-hub nuance: consumer **root** `AGENTS.md` can autoload `ws-senior-developer` on every prompt, while **shared hub** (`ws-shared/AGENTS.md`, `setup.md`) still documents it as opt-in via `rules.seniorDeveloper`.

This is **intentional consumer override** — not a bug in consumer repos. Upstream should align shared-hub documentation so agents are not confused when both hubs are present.

## Current state

### Shared hub (upstream template)

`ws-shared/AGENTS.md` **Skill loading (mandatory)** table lists only Layer 0 skills (`ws-caveman`, `ws-gabarito`, `ws-karpathy-guidelines`) plus completion gates (`ws-changelog`, `ws-self-learning`). `ws-senior-developer` is **not** in the mandatory table.

Elsewhere the shared hub treats it as optional:

- Task router: `ws-senior-developer` — *"opt in through `rules.seniorDeveloper` or invoke explicitly"*
- External dependencies: `senior-developer` resolves via `config.json` → `rules.seniorDeveloper` (set path to opt in)
- `setup.md`: `rules.seniorDeveloper` — *"Optional engineering guardrails"*

### Consumer root `AGENTS.md` (example: cursor-server)

Some consumers add a **root** `AGENTS.md` (installer never writes it) that elevates the skill to a per-prompt delivery gate:

- **Autoload every prompt (delivery gate):** `ws-senior-developer` — classify scope, confirm plan for multi-file work, pre-ship proof; resolved via `rules.seniorDeveloper`
- Precedence section includes autoloaded `ws-senior-developer` unless user overrides

So in those repos, agents following root `AGENTS.md` autoload `ws-senior-developer` every turn, while agents that only read `ws-shared/AGENTS.md` treat it as on-demand/opt-in.

## Why this matters

- Agents with both hubs loaded may get conflicting signals (mandatory vs opt-in).
- `ws-check-harness` / doc audits may flag the mismatch as drift even when the consumer override is deliberate.
- New consumers copying only the shared hub will not get the same delivery-gate behavior as repos with a strong root `AGENTS.md`.

## Proposed upstream alignment (pick one direction)

**Option A — Document dual-mode explicitly (minimal change)**

In `ws-shared/AGENTS.md`, add a short **Consumer root override** note:

- Default (shared hub only): `ws-senior-developer` is on-demand / opt-in via `rules.seniorDeveloper`.
- Consumer root `AGENTS.md` may promote it to per-prompt autoload (delivery gate); that override wins over shared hub opt-in wording when both are present.

**Option B — Promote to shared mandatory table**

Add `ws-senior-developer` to **Skill loading (mandatory)** with trigger e.g. *"Every prompt when `rules.seniorDeveloper` is set; otherwise on-demand"* — and update task router + `setup.md` to match.

**Option C — Keep opt-in default, seed root template**

Ship an optional root `AGENTS.md` snippet or documented pattern for consumers that want per-prompt autoload, without changing shared hub defaults.

## Out of scope

- No change required in consumer repos that intentionally autoload via root `AGENTS.md` (e.g. cursor-server).
- Do not duplicate the Code review proof checklist into hub docs (existing rule stands).

## Acceptance Criteria

- AC1: Single coherent story in `ws-shared/AGENTS.md`, `setup.md`, and task router for when `ws-senior-developer` autoloads vs is invoked
- AC2: Document precedence when consumer root `AGENTS.md` conflicts with shared hub
- AC3: Harness/docs do not treat intentional consumer override as a defect

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
