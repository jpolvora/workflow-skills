---
id: null
slug: check-harness-upstream-sot
title: "ws-check-harness: SoT-aware upstream vs consumer skills scan root"
source: local
specDate: 2026-08-07
---

# Specification — ws-check-harness: SoT-aware upstream vs consumer skills scan root

## Description

Update `ws-check-harness` so Phase 0 **install mode** also selects the **skills inventory root** used by Phases 1–5c (especially Phase 4 disk discovery).

Today the skill already distinguishes **Upstream** vs **Consumer** for hub resolution (`AGENTS.md` vs `{sharedDir}/AGENTS.md`), but skill inventory scans still treat `{skillsRoot}` (default `.agents/skills`) as the filesystem truth. In the upstream package repo, **`src/skills/ws-*` is the only skill-content SoT**; `.agents/skills/ws-*` is dogfood / harness scratch and can diverge. Auditing dogfood while calling the repo “upstream” misses SoT defects and produces false confidence.

**Required behavior:**

1. **Detect** whether the current working tree is the **upstream package root** (authoring tree with `src/skills/*` SoT).
2. If yes → enter **`mode: upstream`**: invent skills from **`src/skills`** (not `.agents/skills`) for Phase 4 inventory, pipeline § 3b folder checks, dependency-graph ↔ disk closure, retired-id scans against live skill bodies under SoT, and any other “skills on disk” checks. Keep existing upstream hub rules (root `AGENTS.md` + dual-hub drift vs `.agents/AGENTS.md`, integrity against `src/` hashed content).
3. If no → enter **`mode: consumer`**: invent skills from project-local `{skillsRoot}` and/or `{globalSkillsRoot}` with existing local-override and config-precedence rules. Do not require or scan `src/skills`.

Detection must be **mechanical and evidence-based** (repo markers), recorded in the Phase 0 notes and the Phase 6 report (`Mode` / path token / **skills scan root**).

## Acceptance Criteria

- AC1: Phase 0 documents a deterministic detection table with at least two modes: `upstream` and `consumer` (consumer may further note project-local vs global/mixed install without changing the skills SoT root semantics).
- AC2: Upstream detection requires evidence that the cwd is this package’s authoring root, including presence of skill SoT under `src/skills/` (at least one `src/skills/ws-*/SKILL.md`) **and** existing upstream package markers already used by the skill (e.g. `bin/skill-dependencies.json` + packaged `.agents/AGENTS.md` / root hub contract). Absence of `src/skills` SoT must **not** select `upstream` skills-scan-root even if other markers exist.
- AC3: When `mode: upstream`, Phase 4 skill discovery (`find` / inventory of `SKILL.md`) uses **`src/skills`** as the primary skills tree. Comparing routed hub ids to disk uses SoT folders under `src/skills/ws-*`. Pipeline § 3b expected folders are checked under `src/skills/`, not `.agents/skills/`.
- AC4: When `mode: upstream`, the audit must **not** treat missing or divergent dogfood copies under `.agents/skills/ws-*` as the primary unrouted/phantom inventory SoT. Optional informational note that dogfood may lag SoT is allowed; it must not inflate critical/warning problem counts unless the user explicitly asks to audit dogfood sync.
- AC5: When `mode: consumer`, Phase 4 continues to scan `{skillsRoot}` (default `.agents/skills`) and `{globalSkillsRoot}` with local-override collision rules unchanged; `src/skills` is ignored even if a stray folder exists.
- AC6: `SKILL.md` § Hub resolution (and `PHASES.md` Phase 0 / Phase 4 inventory prose) are updated so “skills on disk” and `{skillsRoot}` expand/scan semantics match the selected mode; path token map still loads from project `{sharedDir}/config.json` when present.
- AC7: `REPORT-FORMAT.md` (or equivalent Phase 6 header) records `Mode: upstream | consumer` and an explicit **skills scan root** path (e.g. `src/skills` or `.agents/skills` / hybrid global note).
- AC8: Integrity check (Phase 3 item 7) remains **upstream-only** and continues to validate against the package’s hashed SoT (`src/skills` / installer inputs); consumer mode still skips or does not require `bin/skill-integrity.json`.
- AC9: Language stays en-us; no IDE/host product coupling; no hardcoded absolute author-machine paths in the skill contract.
- AC10: A dry-run narrative (or checklist in DoD) shows: running the skill at the upstream package root reports `mode: upstream` + scan root `src/skills`; running in a consumer tree with only `{skillsRoot}` / global install reports `mode: consumer` + scan root under `.agents/skills` and/or `{globalSkillsRoot}`.

## Notes

- **In scope:** `src/skills/ws-check-harness/SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md` (and dogfood mirrors under `.agents/skills/ws-check-harness/` only if sync policy requires it after SoT edit). Align any Phase 4 example commands that hardcode `.agents/skills` with mode-aware roots.
- **Out of scope:** Changing installer layout; forcing consumers to adopt `src/skills`; auto-syncing `.agents/skills` ↔ `src/skills`; product feature work outside harness audit.
- **Related SoT contract:** root `AGENTS.md` § Skill SoT, install scopes & config override — `src/skills/ws-*` is the only upstream skill-content SoT.
- **Slug / canonical path:** `.agents/plans/check-harness-upstream-sot/step-00-check-harness-upstream-sot.spec.md`
- **Suggested follow-up:** `ws-write-plan` → implementation; verify with a live `/ws-check-harness` on this repo (expect SoT inventory including skills present only under `src/skills`).
