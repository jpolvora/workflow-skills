# Design: FAQ rewrite + site / README link sync

**Date:** 2026-07-19  
**Branch:** `develop`  
**Status:** Pending user review  
**Approach:** A — full FAQ rewrite to FSM 0–9; refresh site explain copy; fix text links

---

## Problem

1. [`.agents/skills/spec-to-pr/docs/faq.md`](../../../.agents/skills/spec-to-pr/docs/faq.md) is bannered **LEGACY** and still documents the pre-redesign FSM (steps through 13 / “Step 11 Integration”). Humans who open the FAQ get wrong step numbers.
2. Canonical human docs ([`spec-to-pr/README.md`](../../../.agents/skills/spec-to-pr/README.md), [`DIAGRAM.md`](../../../.agents/skills/spec-to-pr/DIAGRAM.md)) and agent contract ([`SKILL.md`](../../../.agents/skills/spec-to-pr/SKILL.md)) already use **steps 0–9**.
3. Site ([`docs/index.html`](../../index.html)) workflows cards are mostly current, but hero/explain copy can be clearer, FAQ is not linked from the site, and some catalog blurbs still say obsolete ranges (e.g. check-harness “00–11”).
4. README pointers still say FAQ is “partially legacy.”

## Goals

- One **current** human FAQ for `spec-to-pr` (and lite dual-mode notes).
- Site + root README accurately explain what Workflow Skills is and link to FAQ / diagrams.
- No leftover “current” references to old Steps 11–13 as the live FSM.
- Regenerate catalog via `node bin/build-site.js` after copy/link fixes that live in templates or AGENTS-derived descriptions.

## Non-goals

- Rewriting pipeline skill bodies or orchestrator FSM behavior.
- Changing installer packages or `skill-dependencies.json` membership (unless a link path is wrong).
- Translating docs (en-us only).
- Running `check-harness` apply phase without asking (ask after docs land).

## Canonical sources (truth)

| Topic | Source |
|-------|--------|
| Standard FSM 0–9 / F0–F6 | `spec-to-pr/SKILL.md`, `DIAGRAM.md`, `README.md` |
| Lite 0–5 | `spec-to-pr-lite/SKILL.md` |
| Gates / session model | `shared/gates.md` |
| Config | `shared/config-resolution.md` |
| Artifacts | `spec-to-pr/ARTIFACTS.md` |
| Setup / flags / resume | `shared/setup.md` |
| Install / packages | root `README.md`, `bin/skill-dependencies.json` |
| Site catalog layers | root `AGENTS.md` layer tables → `bin/build-site.js` |

---

## Design

### 1. Replace FAQ (`spec-to-pr/docs/faq.md`)

**Replace the file** (do not patch legacy sections in place). Keep the useful Q&A topics; renumber and re-aim every step reference to **0–9**.

**Header (no LEGACY banner):**

- Audience: humans (devs / leads); agents prefer `SKILL.md`.
- Complements: `README.md`, `SKILL.md`, `DIAGRAM.md`, `gates.md`, `ARTIFACTS.md`.
- Architecture note: dual-mode; session model; Pause → Cursor → Resume.

**Proposed TOC:**

| # | Section | Content |
|---|---------|---------|
| 1 | Overview | What Spec-to-PR is; orch vs sub-agent vs user; F0–F6 ↔ 0–9 table |
| 2 | Does / does not | Align with current invariants (ship at 8, fix-pr at 9; no push before 8) |
| 3 | Timeline | Mermaid 0–9 + step→skill table |
| 4 | How to start | Invoke forms, providers, flags (`auto`, `dry-run`, `skip-testing`, `skip-tests`, `full`, `strict`) |
| 5–14 | Steps 0–9 | Short What / How / I/O / FAQ bullets per step (condense; link to skills) |
| 15 | Lite dual-mode | Lite 0–5 map; shared config/gates; no cross-resume |
| 16 | Gates & navigation | Slim transitions; AskQuestion + markdown fallback; soft tips (session model), not old “step 4/8” FSM slots |
| 17 | Artifacts & state | Current filenames from `ARTIFACTS.md` / `SKILL.md` |
| 18 | Special modes | auto / dry-run / skip-* / full |
| 19 | Troubleshooting | HS-*; resume; model switch; AskQuestion missing; fix loops — with **current** step numbers |

**Step mapping (must appear correctly):**

| Step | Label | Skill |
|------|-------|-------|
| 0 | Spec | `ws-write-spec` / providers |
| 1 | Plan | `ws-write-plan` |
| 2 | Interview | `ws-interview` |
| 3 | Plan-to-tasks | `ws-plan-to-tasks` |
| 4 | Implement | `ws-implement-tasks` |
| 5 | Check | `ws-verify-plan` |
| 6 | Code review (+ fix) | `ws-code-review` / `ws-implement-tasks` |
| 7 | Testing | `ws-testing` |
| 8 | Ship | `ws-ship-pr` |
| 9 | Fix-PR | `ws-fix-pr` / `ws-goal-fix-pr` |

**Explicit removals:** treating old Step 11 Integration / Step 12 cleanup / Step 13 ship as current; old soft-tip-as-FSM-steps 4 and 8; legacy artifact names (`step-11-*`, `step-12-*` result as current).

**Length target:** shorter than today’s ~750 lines; prefer tables + links over repeating skill bodies.

### 2. Site (`docs/index.html`)

**Hand-edit explain copy** (then run `build-site.js` so catalog/package blocks stay generated):

| Area | Change |
|------|--------|
| Hero `<p>` | Clearer: portable installable skills + two Spec→PR workflows; link to GitHub Pages is already the site itself |
| Workflows subtitle | Keep dual-mode / session-model accuracy; add link to FAQ on GitHub (`blob/main/.agents/skills/spec-to-pr/docs/faq.md`) |
| Workflow cards | Ensure bullet lists match 0–9 / 0–5; optional “FAQ” / “Diagram” text links |
| Nav | Add **FAQ** → GitHub blob URL for the FAQ (Pages does not host the FAQ markdown as a page) |
| Stale strings | Fix check-harness (and any other) “00–11” → current pipeline folder language (`00`–`09` + unprefixed goal/update skills) — preferably by fixing the description in root `AGENTS.md` so regen stays correct |

**`build-site.js`:** Prefer fixing source descriptions in `AGENTS.md` / skill frontmatter that feed the catalog, then regenerate. Avoid one-off HTML-only catalog edits that regen will overwrite.

**Version bump:** `build-site.js` bumps `package.json` patch on every run — accept that as part of this change (document in CHANGELOG).

### 3. README / link hygiene

| File | Change |
|------|--------|
| `spec-to-pr/README.md` | Remove “FAQ partially legacy”; FAQ is current |
| Root `README.md` | Keep FAQ link; ensure wording does not call FAQ legacy; optional one-line “What is this” tighten if needed |
| Any other “legacy FAQ” / “steps 11–13” pointers in human docs under `docs/` or skill READMEs found during grep | Update or delete |

### 4. Verification

1. Grep FAQ + site + READMEs for legacy markers: `LEGACY`, `Step 11`, `Step 12`, `Step 13`, `00–11`, `step-11-`, `step-12-` as **current** claims.
2. Spot-check relative links in FAQ resolve on disk.
3. `node bin/build-site.js` succeeds; open `docs/index.html` mentally for nav FAQ + workflows links.
4. Ask user whether to run **check-harness** (Phases 0–5c) after docs land.

---

## Success criteria

- [ ] FAQ has no LEGACY banner; documents steps 0–9 only as current FSM.
- [ ] FAQ dual-mode / flags / providers / gates match `SKILL.md` + `gates.md`.
- [ ] Site nav or workflows section links to FAQ; hero/workflows explain copy accurate.
- [ ] Catalog blurb(s) no longer say obsolete `00–11` as the live range.
- [ ] READMEs stop calling the FAQ legacy.
- [ ] Site regenerated; package patch bump recorded.

## Out of scope follow-ups (optional later)

- Host FAQ as a rendered Pages route (would need build-site markdown page support).
- Portuguese FAQ (forbidden for skill/harness docs; not requested).
