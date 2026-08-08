# Execution Plan — DAG Tasks

**Slug:** `agents-skills-as-sot`  
**Source plan:** `.agents/plans/agents-skills-as-sot/step-02-agents-skills-as-sot.plan.refined.md`  
**execMode:** `parallel`  
**targetModel:** `coder`

## Size detection

| Metric | Count | Threshold (`dagThresholds`) | Within? |
|--------|-------|-----------------------------|---------|
| Implementation steps (1–10) | 10 | `maxImplementationSteps` ≤ 3 | ❌ |
| Expected files | ~28 | `maxExpectedFiles` ≤ 6 | ❌ |
| Layers | 4 (`skills-sot`, `installer-cli`, `tests`, `scripts`) | `maxLayers` ≤ 2 | ❌ |

**Decision:** `execMode: parallel` (steps, files, and layers all exceed threshold).  
**Ordering constraints applied:** gitignore invert early → move before retarget → delete sync after retarget → harness after hubs → integrity/DoD last. Max 3 concurrent per level; no shared files within a level.

## Levels

| Level | Tasks | Notes |
|-------|-------|-------|
| 0 | T1 | Invert `.gitignore` |
| 1 | T2 | Inventory + promote SoT + delete `src/` |
| 2 | T3, T5, T6 | Bin retarget ‖ tests ‖ root hubs |
| 3 | T4, T7, T8 | package.json+delete sync (after T3) ‖ packaged hubs/config ‖ workflows+MEMORY |
| 4 | T9, T10 | Harness (after hubs) ‖ `build-site:bump` |
| 5 | T11 | Integrity regenerate + DoD |

## Tasks

### T1 — Invert `.gitignore` for tracked skill bodies

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.gitignore`
- **Plan steps:** 2
- **ACs:** AC10, AC2
- **Acceptance:** Root no longer ignores all `.agents/skills/ws-*/` bodies; consumer-owned hub paths stay ignored; `git check-ignore` on a skill `SKILL.md` → not ignored; `ws-shared/config.json` → ignored; `__pycache__` / `*.py[cod]` remain ignored.
- **coderPrompt:** Edit only `.gitignore`. Remove the rule that ignores `.agents/skills/ws-*/` as generated-from-src (and its sync-skills comment). Keep ignoring consumer-owned hub paths (`config.json`, `config.local.json`, `STACK.md`, `MEMORY.md`, `memory/**`, `CHANGELOG.md`, `installed-skills.json`, `skill-integrity-local.json`) via root exceptions and/or `.agents/skills/ws-shared/.gitignore` / `hub.gitignore` patterns. Keep `__pycache__` and `*.py[cod]` ignores. Do not stage skill bodies yet. AC10, AC2.

### T2 — Promote SoT into `.agents/skills` and delete `src`

- **parallelGroup:** L1
- **dependsOn:** [T1]
- **Files:** `.agents/skills/`, `src/skills/`, `src/`
- **Plan steps:** 1, 3
- **ACs:** AC1, AC2
- **Acceptance:** All former `src/skills/ws-*` package ids under `.agents/skills`; publishable content force-overwritten from `src/skills`; consumer-owned `ws-shared` files untouched; `src/skills/` and empty `src/` deleted; inventory ~39 packages.
- **coderPrompt:** After T1: (1) Inventory `src/skills/ws-*` vs `.agents/skills/ws-*` (expect 39 each; `src/` only `skills/`). (2) Non-hub: copy/replace `src/skills/<id>/` → `.agents/skills/<id>/` (force overwrite). `ws-shared`: copy only non-consumer-owned items (same exclusion set as today’s `scripts/sync-skills.js`). (3) Delete `src/skills/` and empty `src/`. Do not delete consumer hub files. Do not edit `bin/`, `package.json`, hubs, or tests. AC1, AC2.

### T3 — Retarget installer, integrity lib, site, install-rules

- **parallelGroup:** L2
- **dependsOn:** [T2]
- **Files:** `bin/cli.js`, `bin/skill-integrity-lib.js`, `bin/build-site.js`, `bin/install-rules.js`
- **Plan steps:** 4 (code only; integrity json deferred to T11)
- **ACs:** AC3, AC4
- **Acceptance:** Package skills dir = `.agents/skills` in cli/integrity/site; install-rules secondary marker = `.agents/skills/ws-shared/skill-dependencies.json`; primary remains `bin/skill-dependencies.json`; no skill-content SoT requirement on `src/skills` in `bin/`; self-overwrite still blocks package root. Do not write `bin/skill-integrity.json` here.
- **coderPrompt:** Edit only the listed `bin/*.js` files after T2. Point package skills directory to `path.join(packageRoot, '.agents', 'skills')` in `bin/cli.js` (optional rename `srcSkillsDir`→`packageSkillsDir`), `bin/skill-integrity-lib.js` `buildUpstreamManifest`, and `bin/build-site.js`. Update `bin/install-rules.js` secondary marker path; keep `bin/skill-dependencies.json` primary. Grep `bin/` for remaining skill-content `src/skills` requirements and fix. Do **not** run `generate-integrity` (T11). AC3, AC4 partial.

### T5 — Retarget tests path expectations

- **parallelGroup:** L2
- **dependsOn:** [T2]
- **Files:** `test/test-install.js`, `test/test-quality-gates.js`, `test/test-cleanup-workflow-git.js`
- **Plan steps:** 6
- **ACs:** AC4, AC9, AC12
- **Acceptance:** Tests expect `.agents/skills` SoT; no `srcFallback`; no Phase 0b sync-skills dependency; sync script absence asserted where covered; live-tree-only greps (exclude `.agents/plans/**`, archived specs).
- **coderPrompt:** Edit only the listed `test/*.js` files after T2. Retarget SoT literals/fallbacks to `.agents/skills`. Remove `.agents`→`src/skills` fallbacks. Drop Phase 0b sync-skills dependency. Expect sync script absence. Scope any forbid-greps to live trees only. Do not edit `package.json` or `bin/`. AC4, AC9, AC12.

### T6 — Rewrite root hub and human SoT docs

- **parallelGroup:** L2
- **dependsOn:** [T2]
- **Files:** `AGENTS.md`, `SKILL_AUTHORING.md`, `README.md`
- **Plan steps:** 7 (root/human)
- **ACs:** AC5, AC11, AC9
- **Acceptance:** Root docs state `.agents/skills` is upstream SoT; no promote-into-`src` / author-only-in-`src` / mandatory sync-skills; en-us; host-neutral.
- **coderPrompt:** Edit only `AGENTS.md`, `SKILL_AUTHORING.md`, and `README.md` after T2. Rewrite SoT / upstream developer workflow / integrity hashed-path / harness-change prose for `.agents/skills`. Remove promote/sync-skills maintainer obligations. Keep consumer install destinations and hybrid precedence unchanged. Do not edit `.agents/AGENTS.md` or ws-shared (T7). Do not bump site/version (T10). AC5, AC11, AC9.

### T4 — `package.json` files list + delete sync bridge

- **parallelGroup:** L3
- **dependsOn:** [T3]
- **Files:** `package.json`, `scripts/sync-skills.js`
- **Plan steps:** 5
- **ACs:** AC4, AC9
- **Acceptance:** `files` ships `.agents/skills/` with consumer exclusions; `src/skills` entries gone; `sync-skills` script removed; `scripts/sync-skills.js` deleted; no version bump here.
- **coderPrompt:** After T3 only. Replace `src/skills/` `files` entries with `.agents/skills/` + exclusions per refined plan §2. Remove `"sync-skills"` script. Delete `scripts/sync-skills.js`. Do not run `build-site:bump` (T10). AC4, AC9.

### T7 — Rewrite packaged hubs + dogfood layer prose

- **parallelGroup:** L3
- **dependsOn:** [T2]
- **Files:** `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `.agents/skills/ws-shared/STACK.md`, `.agents/skills/ws-shared/config.json`
- **Plan steps:** 7 (packaged + A11)
- **ACs:** AC5, AC11
- **Acceptance:** Packaged hubs align on `.agents/skills` SoT; dogfood `skills-sot` → `.agents/skills`; migrating/sync notes removed.
- **coderPrompt:** After T2. Edit only the four listed files. Align packaged AGENTS SoT pointers; refresh STACK.md + config.json layer prose (`skills-sot` → `.agents/skills`; drop migrating/sync notes). Do not edit root AGENTS.md (T6) or harness (T9). AC5, AC11.

### T8 — check-workflows + MEMORY + self-learning path comments

- **parallelGroup:** L3
- **dependsOn:** [T2]
- **Files:** `.agents/skills/ws-check-workflows/SKILL.md`, `.agents/skills/ws-self-learning/scripts/self_learning.py`, `.agents/skills/ws-shared/memory/2026-08-01-npm-test-phase-0b-sync-skills.md`, `.agents/skills/ws-shared/MEMORY.md`
- **Plan steps:** 9
- **ACs:** AC8, AC9, AC11
- **Acceptance:** No hard `src/skills` SoT alternate in check-workflows; self-learning not instructing dual-tree `src/skills`; MEMORY trap superseded + MEMORY.md recompiled.
- **coderPrompt:** After T2. Edit only the listed `.agents/skills` files. Remove `src/skills` SoT alternate from check-workflows SKILL.md. Fix self-learning comment. Supersede the Phase 0b sync-skills MEMORY trap and recompile MEMORY.md. Do not edit harness (T9) or ws-shared AGENTS/STACK/config (T7). AC8, AC9, AC11.

### T9 — ws-check-harness scan-root + drop dogfood-lag

- **parallelGroup:** L4
- **dependsOn:** [T6, T7]
- **Files:** `.agents/skills/ws-check-harness/SKILL.md`, `.agents/skills/ws-check-harness/PHASES.md`, `.agents/skills/ws-check-harness/REPORT-FORMAT.md`
- **Plan steps:** 8
- **ACs:** AC6, AC7, AC12
- **Acceptance:** Upstream SoT evidence = `.agents/skills/ws-*/SKILL.md`; scan root upstream = `.agents/skills`; consumer ignores stray `src/skills`; dogfood-lag / SoT-id equivalence removed; Phase 3 item 7 hashes `.agents/skills`.
- **coderPrompt:** After T6+T7. Edit only the three harness docs under `.agents/skills`. Flip upstream evidence and scan root to `.agents/skills`; drop dogfood-lag / SoT-id equivalence; hub literals filesystem-true when scan root is that tree; update example commands. AC6, AC7, AC12.

### T10 — Site catalog rebuild via `build-site:bump`

- **parallelGroup:** L4
- **dependsOn:** [T3, T4, T6]
- **Files:** `docs/index.html`, `package.json`
- **Plan steps:** 7 (site)
- **ACs:** AC5
- **Acceptance:** `npm run build-site:bump` updates catalog/`data-path` and version; site does not advertise `src/skills` as SoT.
- **coderPrompt:** After T3, T4, and T6. Run `npm run build-site:bump`. Ensure site/catalog reflects `.agents/skills` SoT. Do not regenerate `bin/skill-integrity.json` (T11). AC5 site.

### T11 — Integrity regenerate + Definition of Done gate

- **parallelGroup:** L5
- **dependsOn:** [T4, T5, T8, T9, T10]
- **Files:** `bin/skill-integrity.json`
- **Plan steps:** 4 (integrity), 10
- **ACs:** AC12 (+ reconfirm AC1–AC11)
- **Acceptance:** `generate-integrity` + `verify-integrity` exit 0; `npm run test` exit 0; `ws-check-harness` → Install mode `upstream`, Skills scan root `.agents/skills`, 0 critical from SoT move; `src/` absent; self-overwrite still refuses package root; pack excludes consumer hub files.
- **coderPrompt:** LAST. Run integrity generate+verify; `npm run test`; `ws-check-harness` Phases 0–5c; confirm `src/` gone, pack exclusions, self-overwrite refuse. Optional `ws-check-workflows`. Only update `bin/skill-integrity.json` as needed. AC12. Plan steps 4 integrity + 10.

## Plan-step → task map

| Plan step | Task(s) |
|-----------|---------|
| 1 Inventory | T2 |
| 2 Invert gitignore | T1 |
| 3 Move + delete src | T2 |
| 4 Retarget bin (+ integrity later) | T3 → T11 |
| 5 package.json + delete sync | T4 |
| 6 Tests | T5 |
| 7 Hubs/docs/site | T6, T7, T10 |
| 8 Harness | T9 |
| 9 Workflows + MEMORY | T8 |
| 10 DoD | T11 |

## Handoff

Artifacts for `ws-implement-tasks`:

- `.agents/plans/agents-skills-as-sot/step-03-agents-skills-as-sot.plan.exec.md`
- `.agents/plans/agents-skills-as-sot/step-03-agents-skills-as-sot.exec.dag.json`
