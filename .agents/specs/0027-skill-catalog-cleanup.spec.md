---
id: null
slug: skill-catalog-cleanup
title: "Skill catalog cleanup: Extra demotion and patterns merge"
source: local
specDate: 2026-08-14
---

# Specification — Skill catalog cleanup: Extra demotion and patterns merge

## Description

Catalog audit of the 43 packaged `ws-*` skills found **no true duplicates to delete**. Overlap is composition (wrapper + primitive) or complementary roles. Deleting pipeline, diagnostic, spec-family, or autoload behavior skills would break orch dispatch and hub routing.

This spec is the lowest-risk cleanup: shrink the default **Workflows** package and collapse one clone pair. It does **not** delete skill folders except the two patterns ids replaced by a single successor.

### Part A — Demote niche skills to Extra

Move these ids from `packages.workflows.skills` to `packages.extra.skills`:

| Skill | Why Extra | Install-graph change required |
|-------|-----------|-------------------------------|
| `ws-activity-report` | Timesheet utility; no orch step dispatches it | Drop its declared deps on `ws-github-provider` / `ws-azure-devops-provider` / `ws-configure-project` so Extra does not cascade-install providers. Runtime still loads the SCM provider when present. |
| `ws-fable-domain` | Niche domain adapters | Remove from `dependencies.ws-write-plan`. `ws-write-plan` already treats fable domain as optional when `fable.enabled`; if the folder is missing, skip domain adapters (no STOP). |
| `ws-update-plan-implementation` | Post-ship QA deltas; not an FSM step | Remove from `dependencies.ws-spec-to-pr`. Orch / PROTOCOLS keep a link: invoke when installed; do not require it on disk for Workflows. |

`ws-show-harness` is already Extra. Leave it there. Do not fold it into `ws-doctor` in this spec.

Fresh `install --package workflows` must not copy the three demoted folders. Full package (`select: all-skills`) still installs them. Existing consumer manifests that already list those ids keep receiving updates until the consumer uninstalls them.

### Part B — Merge pattern skills

Replace `ws-patterns-backend` and `ws-patterns-frontend` with one skill `ws-patterns`.

| Keep | Change |
|------|--------|
| Consumer files `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` (and their `.template` seeds) | One SKILL.md that consults/records the file matching the task layer |
| `ws-configure-project --section patterns` | Interview still chooses backend, frontend, or both; autoload lists `ws-patterns` once |
| Workflows + Full membership | Package lists `ws-patterns` instead of the two old ids |

Retired folders `.agents/skills/ws-patterns-backend/` and `.agents/skills/ws-patterns-frontend/` are removed (no compatibility shims / dual defaults). Hubs, autoload, orch deps, installer graph, tests, and catalog point at `ws-patterns` only.

User-gate prompt text in the skill body is **en-us** (example: `Register this preference in the {backend\|frontend} patterns file? ("<summary>")`). Do not keep Portuguese prompt strings in the skill body.

### Out of scope

- Deleting or merging `ws-doctor`, `ws-audit`, `ws-check-harness`, `ws-check-workflows`, `ws-show-harness`
- Inlining `ws-goal-loop` into `ws-goal-fix-pr`
- Merging `ws-tdah` / `ws-karpathy-guidelines` / `ws-senior-developer` / `ws-fable-method` / `ws-self-learning` / `ws-changelog`
- Collapsing `ws-spec-to-pr` vs lite, the three providers, or the spec family (`write-spec`, `spec-format`, `local-spec-provider`, `spec-list`, `spec-index`, `sync-spec`, `classify-complexity`)
- Deduplicating `update_state.py` copies or shared `py_compile` / `node --check` between doctor and check-workflows

Related completed specs (do not reopen): [`project-patterns-memory-skills`](project-patterns-memory-skills.spec.md), [`promote-shared-skills`](promote-shared-skills.spec.md), [`autoload-skills-overlap-audit`](autoload-skills-overlap-audit.spec.md).

## Acceptance Criteria

- AC1: `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` list `ws-activity-report`, `ws-fable-domain`, and `ws-update-plan-implementation` under `packages.extra.skills` and **not** under `packages.workflows.skills`.
- AC2: `dependencies.ws-activity-report` does not include `ws-github-provider`, `ws-azure-devops-provider`, or `ws-configure-project`. Selecting Extra (or the activity-report id alone) does not mark those providers as required install deps.
- AC3: `dependencies.ws-write-plan` does not include `ws-fable-domain`. `ws-write-plan` SKILL.md states that domain adapters run only when `ws-fable-domain` is installed **and** `fable.enabled` / `autoDetectDomain` are true; missing folder is a skip, not a hard fail.
- AC4: `dependencies.ws-spec-to-pr` does not include `ws-update-plan-implementation`. Standard orch docs still name it as an optional post-workflow Extra skill (PROTOCOLS / DIAGRAM / hubs), not a required step.
- AC5: A Workflows-only install (`install --package workflows --yes` into a scratch tree) does not create `.agents/skills/ws-activity-report`, `ws-fable-domain`, or `ws-update-plan-implementation`. Full install still creates all three.
- AC6: Skill folder `.agents/skills/ws-patterns/` exists with `SKILL.md` that consults `{sharedDir}/backend.md` on backend work and `{sharedDir}/frontend.md` on frontend work, and records to the matching file after `user-gate` approval. Folders `ws-patterns-backend` and `ws-patterns-frontend` do not exist.
- AC7: Pattern `user-gate` prompt strings in `ws-patterns/SKILL.md` are en-us only (no Portuguese `Deseja registrar` copy). Consumer-owned `backend.md` / `frontend.md` path contract is unchanged.
- AC8: `packages.workflows.skills` and orch dependency arrays that previously named `ws-patterns-backend` / `ws-patterns-frontend` name `ws-patterns` instead. `autoload.md` Always-applied table has one patterns row (`ws-patterns`). `ws-configure-project` `--section patterns` writes that id (not the retired pair).
- AC9: Root `AGENTS.md`, `{sharedDir}/AGENTS.md`, `README.md`, and the site catalog (`node bin/build-site.js` or `npm run build-site:bump` at ship) route timesheet / domain-adapter / post-plan-delta intents to Extra membership and pattern intents to `ws-patterns`. No router row points at the retired pattern ids or treats the three demoted skills as Workflows-required.
- AC10: `test/test-install.js` (or equivalent) asserts AC1 and AC5 membership; `test/test-autoload-configure.js` (or equivalent) asserts the patterns section emits `ws-patterns`. `npm run test` exits 0.
- AC11: After hashed content changes, `npm run generate-integrity` and `npm run verify-integrity` exit 0 in the same ship commit. `ws-check-harness` Phases 0–5c report 0 critical findings for retired ids, package graph, and hub drift.

## Child Tasks

### Task A — Extra demotion

- **Status:** Open
- **Description:** Move the three skills in the package map; drop the three install-dep edges; update write-plan / spec-to-pr prose for optional Extra; add install-test coverage that Workflows scratch trees omit those folders.

### Task B — Patterns merge

- **Status:** Open
- **Description:** Add `ws-patterns`; delete the two old skill folders; retarget hubs, autoload, configure-project, orch deps, evals; en-us user-gate; autoload/configure tests.

## Notes

- Latest layout only: no leftover `ws-patterns-backend` path aliases. Consumers who installed the old pair run `update` / reinstall Full or Workflows to get `ws-patterns`; they may `uninstall --skills ws-patterns-backend,ws-patterns-frontend --yes` if stale folders remain.
- Extra `ensureHub` stays `false`. Demoted skills that need `config.json` keep their existing missing-config `user-gate` → `ws-configure-project`.
- Language: en-us for skill bodies, gates, banners, hubs, this spec.
- Do not register this file into `{plansDir}` here; orch / `ws-local-spec-provider` owns `step-00` copies.
