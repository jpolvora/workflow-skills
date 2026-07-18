---
id: 65
slug: us-65
title: "check-harness: phantom routes, missing Skill loading, unprefixed dispatch refs (2026-07-17)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/65"
specDate: 2026-07-17
---

# Specification — check-harness: phantom routes, missing Skill loading, unprefixed dispatch refs (2026-07-17)

**State:** open

## Description

## Summary

Full `/check-harness` audit against an installed consumer copy of this package (cursor-reviewer, branch `develop`, 2026-07-17) found **14** issues (7 critical, 5 warning, 2 suggestion). Several are **upstream package** problems: packaged index still routes deleted skills, utility skills cite a missing `AGENTS.md` § Skill loading, and `STEP-DISPATCH.md` uses unprefixed skill folder names.

**Ask:** fix in `workflow-skills` (prefer `develop` → `main`), then consumers refresh via `npx github:jpolvora/workflow-skills update`.

## Context

- Audit skill: `check-harness` (Phases 0–5c → Phase 6 plan)
- Disk inventory: **26** `SKILL.md` trees under `.agents/skills/`
- Utilities already promoted to top-level (`caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`); nested `shared/<utility>/` removed
- Review/frontend/meta skills **gone on disk** but still indexed in packaged `.agents/AGENTS.md`

## Critical (upstream)

### 1. Phantom skill routes in packaged `.agents/AGENTS.md`

Index + Task router still list skills that are **not** on disk:

| Skill id | Indexed path |
|----------|----------------|
| `write-a-skill` | `skills/write-a-skill/SKILL.md` |
| `mobile-first-design` | `skills/mobile-first-design/SKILL.md` |
| `design-taste-frontend` / `taste-skill` | `skills/taste-skill/SKILL.md` |
| `security-review` | `skills/security-review/SKILL.md` |
| `dotnet-security-performance-review` | `skills/dotnet-security-performance-review/SKILL.md` |
| `tdd-sdd-ddd-reviewer` | `skills/tdd-sdd-ddd-reviewer/SKILL.md` |
| `domain-review` | `skills/domain-review/SKILL.md` |
| `multi-domain-review` | `skills/multi-domain-review/SKILL.md` |
| `secrets-leak-review` | `skills/secrets-leak-review/SKILL.md` |

**Fix:** Remove those rows from Skill index + Task router (or restore skills if deletion was accidental). Sync root hub + packaged index (Drift check).

### 2. Missing § Skill loading / § Precedence

Utility skills cite root/`AGENTS.md` sections that do not exist:

- `gabarito/SKILL.md` → `AGENTS.md` § Skill loading (+ opt-out table)
- `caveman/SKILL.md` → same
- `spec-format/SKILL.md` → § Skill loading

Neither consumer root hub nor packaged `.agents/AGENTS.md` currently defines **Skill loading**, **Precedence**, or **opt-outs**.

**Fix:** Add canonical § Skill loading (Every prompt / conditional), § Precedence, and opt-out table to the packaged hub (and upstream root hub if that is the source of truth). Keep progressive disclosure: skills link; do not duplicate bodies.

### 3. Unprefixed skill folder refs in `spec-to-pr/STEP-DISPATCH.md`

Strict folder-name matching (check-harness Phase 5):

- Step 11 action text: `integration-validation` → should be `07-integration-validation`
- Step 13 notes: `goal-fix-pr` → should be `09-goal-fix-pr`

**Fix:** Use exact prefixed directory names in all orchestrator dispatch instructions.

### 4. Broken link: `shared/AGENTS.md` → `bin/skill-dependencies.json`

Packaged `skills/shared/AGENTS.md` links to `../../../bin/skill-dependencies.json`. In a consumer install there is often **no** `bin/` tree → broken internal link.

**Fix:** Make the link consumer-safe (upstream-only note, conditional docs, or ship a minimal deps map with the package). Do not assume author-machine/`bin/` layout in consumer copies.

### 5. Hub pointer for workflows

`spec-to-pr/SKILL.md` “Hub → `../../../AGENTS.md`” lands on the **consumer product** hub when installed, which may not be the skill catalog.

**Fix:** Document dual-hub clearly: workflow routing → packaged `.agents/AGENTS.md` (skill index); consumer root `AGENTS.md` may stay product-specific and should **point to** the packaged index.

## Warning

| Item | Detail | Suggested fix |
|------|--------|---------------|
| Auto-load undeclared | Skills self-declare autoload; hub has no table | Covered by critical #2 |
| `config.json` markdown links | Links to gitignored consumer `config.json` look “broken” until copy-from-example | Prefer `config.json.example` + “copy to config.json”, or document as intentional |
| Consumer README / root AGENTS drift | Separate consumer issue if product docs still cite retired local skills (`code-review-self`, `megabrain`, `solve-pr`) | Consumer-side; call out so install docs stay aligned |

## Suggestion (writing-great-skills)

| Item | Detail |
|------|--------|
| `check-harness` sprawl | ~720 lines; consider extracting methodology/output templates behind context pointers |
| Inventory examples | Soften or drop retired ids (`taste-skill`, `write-a-skill`) in check-harness examples |

## Out of scope for this issue (consumer-only)

- Root `AGENTS.md` absolute `file:///` links (cursor-reviewer product hub)
- PT-BR product analyzer contract in consumer root hub
- Replacing consumer README skill tables for retired runner-local skills

## Acceptance Criteria

- AC1: Packaged `.agents/AGENTS.md` skill index + Task router match disk (`find …/SKILL.md`); no phantoms
- AC2: § Skill loading + Precedence + opt-outs exist where `gabarito` / `caveman` / `spec-format` point
- AC3: `STEP-DISPATCH.md` uses prefixed folder names (`07-integration-validation`, `09-goal-fix-pr`)
- AC4: `shared/AGENTS.md` has no broken consumer-facing link to missing `bin/skill-dependencies.json`
- AC5: Workflow hub guidance points at packaged skill index for routing
- AC6: `/check-harness` (or `--dry-run`) on a fresh install: no critical phantoms / dead Skill-loading refs / unprefixed dispatch

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
