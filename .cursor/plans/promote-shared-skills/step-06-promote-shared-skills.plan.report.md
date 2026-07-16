---
us: "promote-shared-skills"
reportDate: 2026-07-16
sourcePlans: ["step-02-promote-shared-skills.plan.refined.md"]
githubSource: none
mode: full
---

# Verification Report — promote-shared-skills

## Quick Score

| Metric | Score | Notes |
|--------|------:|-------|
| Completeness | 9.5 | All DAG tasks T1–T6 delivered; site + tests + README |
| Correctness & Style | 9.0 | Hub whitelist, dep map, migration, path sweep |
| Tests | 9.5 | `npm run tests -- --local` green (Phases 0–7) |
| **Weighted** | **9.3** | Approve (≥ 7) |

## Acceptance Criteria

| AC | Result | Evidence |
|----|--------|----------|
| AC1 | **PASS** | Seven skills at `.agents/skills/<skill>/SKILL.md`; absent under `shared/` |
| AC2 | **PASS** | `shared/` hub files only (AGENTS, config*, tools, stack, setup, gates, config-resolution, .gitignore) |
| AC3 | **PASS** | `listInstallableSkills` excludes `shared`; menu lists 35 skills including promoted |
| AC4 | **PASS** | Shortcuts `f`/`w`/`e` + numeric toggles in `bin/cli.js` |
| AC5 | **PASS** | Full = all-skills + `ensureHub`; covered by help + dep map + install test select-all |
| AC6 | **PASS** | Workflows 26 skills + hub; Phase 6 asserts no `security-review` |
| AC7 | **PASS** | Extra 9 skills; no orchestrators in `packages.extra` |
| AC8 | **PASS** | `bin/skill-dependencies.json` loaded by CLI |
| AC9 | **PASS** | Phase 7: toggle `09-goal-fix-pr` installs `goal-loop` + `08-fix-pr` |
| AC10 | **PASS** | `ensureSharedHubInstalled`; config preserve Phase 2; hub whitelist only |
| AC11 | **PASS** | Phase 5 memory migration; `copyDirPreservingConfig` skips `memory/` files |
| AC12 | **PASS** | Path sweep + AGENTS indexes; karpathy guidance inverted; example config updated |
| AC13 | **PASS** | `docs/index.html` `#install-packages`; caveman at top-level path |
| AC14 | **PASS** | Local test suite Phases 4–7 + existing preserve phases green |
| AC15 | **PASS** | Indexes match disk; check-harness treats nested `shared/<skill>` as obsolete (intentional) |

## Gaps / follow-ups (non-blocking)

- `install-skills.sh` remains flat-install only (documented; Node CLI is canonical for packages).
- Full `check-harness` Phases 0–5c recommended before merge to `main` (not a blocker for Step 7).

## Verdict

**APPROVED** — proceed to Step 7 first commit (code only; no `.cursor/plans/` artifacts).
