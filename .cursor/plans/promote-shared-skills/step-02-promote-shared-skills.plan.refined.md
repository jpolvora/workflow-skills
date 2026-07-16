---
slug: promote-shared-skills
title: "Promote shared skills to first-class installable packages"
status: "plan refined ok"
---

## 0. Summary & Business Rules

**Feature:** Promote seven workflow-agnostic skills from `.agents/skills/shared/<skill>/` to top-level `.agents/skills/<skill>/`, making them individually installable and selectable via new installer packages (Full / Workflows / Extra / Individual). Retain `shared/` as a config/docs hub only.

**Core objectives:**
- First-class install units for `caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`.
- Machine-readable dependency map driving smart select-on and package membership.
- Installer UX with package shortcuts (`f` / `w` / `e`) plus enhanced individual toggles.
- Consumer migration on update (nested → top-level) without clobbering `shared/config.json` or `self-learning/memory/`.
- Harness, site catalog, and tests aligned with new layout.

**Business rules:**
- `shared/config.json` is consumer-owned — never overwritten on install/update.
- `self-learning/memory/` and compiled `MEMORY.md` are consumer-owned — preserved at `.agents/skills/self-learning/` after promotion.
- Dual-mode config resolution remains `.agents/skills/shared/config.json` only.
- `shared/` is **not** a selectable skill; it is installed/updated as a hub when workflows or Full package are selected.
- Dependency select-on: toggling a skill **on** auto-selects transitive deps; toggling **off** does **not** auto-deselect dependents (leave selected; document in installer help).
- Skill `name:` frontmatter values unchanged.
- All user-facing strings: **en-us**.

**Security mitigations:**
- No secrets in dependency map or installer output.
- Preserve `config.json` / memory via existing `copyDirPreservingConfig` contract; migration must not copy upstream memory over consumer memory.
- Self-overwrite guard unchanged (`assertNotSelfOverwrite`).

**Complexity classification:** **complex** — multi-surface change (filesystem move, installer CLI, dependency map, site catalog, harness indexes, consumer migration). **Steps 2 (interview) and 3 (DAG) expected** before implementation.

---

## 1. Definition of Ready & Scope

### Resolved assumptions
| Assumption | Resolution |
|------------|------------|
| Hub location | `shared/` stays; only config/docs hub files remain |
| Dependency map path | `bin/skill-dependencies.json` (versioned, shipped in `files` via `bin/`) |
| Package shortcuts | `f` Full · `w` Workflows · `e` Extra · individual numbers unchanged |
| Installable skill count | 35 top-level dirs after promotion (29 today + 7 promoted; `shared/` excluded from menu) |
| Link-update scope | ~30 files with `../shared/<skill>` relative links; ~50 files with `.agents/skills/shared/<skill>` absolute paths |
| Site | `bin/build-site.js` adds **Installation packages** section; regenerates catalog paths |
| Migration trigger | `update` and interactive install both run `migratePromotedSkills()` before copy |

### Acceptance Criteria (measurable)

| AC | Criterion |
|----|-----------|
| AC1 | Seven skills at `.agents/skills/<skill>/SKILL.md`; absent from `shared/<skill>/` |
| AC2 | `shared/` contains hub files only (config, schema, tools, stack, setup, gates, config-resolution, AGENTS.md, .gitignore) |
| AC3 | Installer lists each promoted skill; `shared/` not in toggle list |
| AC4 | Package actions Full / Workflows / Extra + Individual toggles |
| AC5 | Full = all installable skills + shared hub |
| AC6 | Workflows = orchestrators + pipeline + providers + workflow-required promoted utilities + shared hub; no Extra-only skills |
| AC7 | Extra = standalone non-orchestrator skills; no forced `spec-to-pr` / `spec-to-pr-lite` |
| AC8 | Machine-readable dependency map in-repo; installer loads it |
| AC9 | Select-on propagates transitive deps; map updated in same change set as graph edits |
| AC10 | Workflow install/update still ensures shared hub; `config.json` never overwritten |
| AC11 | `self-learning/memory/` preserved at new top-level path after update |
| AC12 | All in-repo references resolve to top-level paths; obsolete “no top-level karpathy” guidance removed |
| AC13 | Site has **Installation packages** section |
| AC14 | `npm run tests -- --local` covers promotion, packages/deps, config + memory preserve |
| AC15 | `check-harness` indexes match disk; no phantom `shared/<skill>` routes |

### Out of scope
- Workflow FSM step semantics changes.
- Renaming skill `name:` frontmatter.
- Moving config/docs out of `shared/`.
- Committing consumer `config.json`.
- Full parity rewrite of `install-skills.sh` (note as follow-up if drift detected).

---

## 2. Technical Design & Architecture

### Layer edits (per `config.json` stack)

| Layer | Path | Role in this feature |
|-------|------|----------------------|
| skills | `.agents/skills/` | Move 7 folders; update cross-links |
| cli | `bin/cli.js`, `bin/skill-dependencies.json` | Packages, deps, hub-only copy, migration |
| tests | `test/test-install.js` | New phases for promotion + packages |
| docs | `docs/index.html`, `bin/build-site.js` | Catalog paths + Installation packages |
| harness | `AGENTS.md`, `.agents/AGENTS.md`, `shared/AGENTS.md`, `check-harness/SKILL.md` | Routing tables, obsolete guidance |

### Filesystem promotion (AC1, AC2)

**Move (git mv):**
```
.agents/skills/shared/caveman/           → .agents/skills/caveman/
.agents/skills/shared/gabarito/          → .agents/skills/gabarito/
.agents/skills/shared/karpathy-guidelines/ → .agents/skills/karpathy-guidelines/
.agents/skills/shared/spec-format/       → .agents/skills/spec-format/
.agents/skills/shared/goal-loop/         → .agents/skills/goal-loop/
.agents/skills/shared/self-learning/     → .agents/skills/self-learning/
.agents/skills/shared/changelog/         → .agents/skills/changelog/
```

**Remain in `shared/`:**
`config.json.example`, `config.schema.json`, `tools.md`, `stack.md`, `setup.md`, `gates.md`, `config-resolution.md`, `AGENTS.md`, `.gitignore` (+ consumer `config.json` when present).

**Rewrite `shared/AGENTS.md`:** Remove “Shared Skills” table of nested paths; point to top-level skill paths and document hub-only role.

### Dependency map — `bin/skill-dependencies.json` (AC8, AC9)

Proposed schema (v1):

```json
{
  "version": 1,
  "hub": {
    "dir": "shared",
    "ensureWhen": ["full", "workflows", "workflow-skill-selected"]
  },
  "packages": {
    "full": { "select": "all-skills", "ensureHub": true },
    "workflows": { "skills": ["spec-to-pr", "spec-to-pr-lite", "..."], "ensureHub": true },
    "extra": { "skills": ["security-review", "..."], "ensureHub": false }
  },
  "dependencies": {
    "spec-to-pr": ["00-write-spec", "01-write-plan", "...", "caveman", "gabarito", "karpathy-guidelines", "self-learning", "changelog", "spec-format", "goal-loop", "check-harness", "check-workflows", "github-provider", "local-spec-provider"],
    "spec-to-pr-lite": ["01-write-plan", "04-implement-tasks", "06-code-review", "11-ship-pr", "caveman", "gabarito", "karpathy-guidelines", "self-learning", "changelog", "spec-format"],
    "09-goal-fix-pr": ["08-fix-pr", "goal-loop"],
    "00-write-spec": ["spec-format"],
    "github-provider": ["spec-format"],
    "azure-devops-provider": ["spec-format"],
    "local-spec-provider": ["spec-format"],
    "tdd-sdd-ddd-reviewer": ["karpathy-guidelines"],
    "domain-review": ["karpathy-guidelines"],
    "06-code-review": ["karpathy-guidelines", "caveman", "gabarito", "self-learning"]
  },
  "autoloadOnly": []
}
```

**Rules:**
- `packages.workflows.skills` = explicit list (or derived: all skills minus `packages.extra.skills` minus orchestrator-only exclusions). Finalize in Step 2 interview.
- `dependencies` = **install-time** edges only (must be on disk). Behavioral autoload refs stay in skill bodies.
- Helper: `resolveTransitiveDeps(skillName, map) → Set<string>`.
- Helper: `listInstallableSkills(srcDir, map) → string[]` — all dirs with `SKILL.md`, excluding `shared`.

### Installer CLI — `bin/cli.js` (AC3–AC7, AC10, AC11)

**Baseline (investigated):**
- `listSkillDirs` returns all first-level dirs including `shared` (29 today).
- `ensureSharedInstalled` bulk-copies entire `shared/` tree; creates `shared/self-learning/memory` (wrong after promotion).
- Interactive menu: flat numbered list, `a` all, `y` install — no packages.
- `copyDirSync` / `copyDirPreservingConfig` skip files inside any `memory/` folder (good for top-level `self-learning`).

**Changes:**

1. **`loadSkillGraph()`** — read `bin/skill-dependencies.json`; validate on startup.

2. **`listInstallableSkills()`** — replace raw `listSkillDirs` for menu; filter out `shared` and any dir without `SKILL.md`.

3. **`ensureSharedHubInstalled(mode)`** (rename/refactor `ensureSharedInstalled`):
   - Copy **whitelist** hub files from upstream `shared/` only: `config.json.example`, `config.schema.json`, `tools.md`, `stack.md`, `setup.md`, `gates.md`, `config-resolution.md`, `AGENTS.md`, `.gitignore`.
   - Use `copyDirPreservingConfig` semantics for `config.json` only.
   - **Remove** nested skill copy and **remove** `shared/self-learning/memory` mkdir.
   - Call when: Full package, Workflows package, or any selected skill in `WORKFLOW_SKILL_TRIGGERS` set (`spec-to-pr`, `spec-to-pr-lite`, or any skill in `packages.workflows.skills`).

4. **`migratePromotedSkills()`** (new, parallel to `migrateRenamedSkills`):
   - For each of the seven slugs:
     - If `target/shared/<slug>/` exists and `target/<slug>/` missing → move dir to top-level.
     - If both exist → merge: preserve consumer `memory/`, `MEMORY.md`; refresh skill files from upstream top-level.
     - Remove empty `target/shared/<slug>/`.
   - **Memory migration:** if `target/shared/self-learning/memory/` exists and `target/self-learning/memory/` empty/missing → move memory files to top-level path.
   - Log each migration step.

5. **Interactive UX (`runInteractive`)**:
   - Header: document shortcuts `f` Full · `w` Workflows · `e` Extra · `a` all · numbers toggle · `y` install.
   - On `f`/`w`/`e`: apply package membership to `selected[]`, then `applyTransitiveDeps(selected)`.
   - On numeric toggle **on**: set skill + `resolveTransitiveDeps(skill)`.
   - On numeric toggle **off**: clear only that skill (deps stay selected).
   - After selection, show summary count before install.

6. **`runUpdate`**: call `migratePromotedSkills()` early; ensure hub when workflow skills updated; `--include-new` installs new top-level skills from upstream list.

7. **Install loop**: per selected skill, `copyDirPreservingConfig` from top-level src; then `ensureSharedHubInstalled` once if needed.

### Site catalog — `bin/build-site.js` + `docs/index.html` (AC13)

**Baseline:** Scans nested `shared/*` for catalog; `findSkillMdPath` falls back to `shared/<slug>/SKILL.md`; no Installation packages section (only generic Install steps).

**Changes:**
1. Remove nested `shared/*` promotion in skill scan (top-level only after AC1).
2. Update `findSkillMdPath` candidates: top-level first; drop `shared/<slug>` fallback (or keep one release as deprecated fallback — prefer remove after move).
3. Add **Installation packages** HTML block (new `<section id="install-packages">` before or inside `#install`):
   - Table/cards for Full, Workflows, Extra, Individual.
   - Shortcut keys, hub behavior, dependency auto-select summary.
   - Generated from `skill-dependencies.json` (single source of truth).
4. Regenerate `docs/index.html` after `AGENTS.md` layer table updates (promoted paths in Layer 5).

### Harness / index updates (AC12, AC15)

| File | Action |
|------|--------|
| Root `AGENTS.md` | Layer 5 + Skill loading table: top-level paths; fix External Dependencies karpathy row (invert obsolete guidance) |
| `.agents/AGENTS.md` | Move Utility & Meta from `skills/shared/*` to `skills/<skill>/` |
| `shared/AGENTS.md` | Hub-only docs; link to top-level promoted skills |
| `shared/config.json.example` | `rules.karpathyGuidelines` → `.agents/skills/karpathy-guidelines/SKILL.md` |
| `shared/config.schema.json` | Update default/example path if present |
| `shared/tools.md` | `self-learning` paths → top-level |
| `shared/setup.md` | Self-learning memory path references |
| `check-harness/SKILL.md` | Diagram + Phase 2 rule: top-level `karpathy-guidelines/` / `spec-format/` are **canonical**; warn on `shared/<promoted>/` phantom paths |
| `check-workflows/SKILL.md` | Verify shared hub + promoted skill paths if referenced |
| `README.md` | Install section mentions packages (brief) |
| `MEMORY.md` | Root pointer to new `self-learning/MEMORY.md` path |

**Skill body link sweep (~30 files):** Replace `../shared/<skill>/` → `../<skill>/` from sibling pipeline skills. Replace absolute `.agents/skills/shared/<skill>/` → `.agents/skills/<skill>/`.

**High-touch files (priority):**
`spec-to-pr/SKILL.md`, `spec-to-pr-lite/SKILL.md`, `00-write-spec`, `01-write-plan`, `02-interview`, `06-code-review`, `09-goal-fix-pr`, `11-ship-pr`, providers, `self-learning/SKILL.md`, `self_learning.py`, `goal-loop/SKILL.md`.

### Package membership (finalized — Step 2)

**Installable skills (35):** all top-level dirs with `SKILL.md`, excluding `shared/`.

**Workflows (`w`) — 26 skills + shared hub:**

`spec-to-pr`, `spec-to-pr-lite`, `00-write-spec`, `01-write-plan`, `02-interview`, `03-plan-to-tasks`, `04-implement-tasks`, `05-verify-plan`, `06-code-review`, `07-integration-validation`, `08-fix-pr`, `09-goal-fix-pr`, `10-update-plan-implementation`, `11-ship-pr`, `github-provider`, `azure-devops-provider`, `local-spec-provider`, `check-harness`, `check-workflows`, `caveman`, `gabarito`, `karpathy-guidelines`, `spec-format`, `goal-loop`, `self-learning`, `changelog`

**Extra (`e`) — 9 skills (no hub, no orchestrators):**

`security-review`, `dotnet-security-performance-review`, `tdd-sdd-ddd-reviewer`, `domain-review`, `multi-domain-review`, `secrets-leak-review`, `mobile-first-design`, `taste-skill`, `write-a-skill`

**Full (`f`):** all 35 installable skills + shared hub.

**Individual:** numeric toggles with transitive dep select-on; `shared/` never listed.

### Verification of invariants (`config.json.invariants`)

| Invariant | Impact |
|-----------|--------|
| `commitPlanFilesOnlyAtStep12: true` | Unaffected — plan artifacts only |
| Others (EF/tenancy) | N/A — Node skills hub |

---

## 3. Step-by-Step Plan

### Step 1: Dependency map + filesystem promotion (AC1, AC2, AC8)

**Actions:**
1. Author `bin/skill-dependencies.json` with packages + dependency edges (workflows/extra lists per draft above).
2. `git mv` seven skill folders to top-level; verify each `SKILL.md` intact.
3. Prune `shared/` to hub files; rewrite `shared/AGENTS.md`.
4. Add `skill-dependencies.json` to npm `files` implicitly via `bin/`.

**Affected files:**
- `bin/skill-dependencies.json` (new)
- `.agents/skills/{caveman,gabarito,karpathy-guidelines,spec-format,goal-loop,self-learning,changelog}/**` (moved)
- `.agents/skills/shared/**` (pruned)

**Checks:** `ls .agents/skills/shared/` shows no skill subdirs; each promoted skill has `SKILL.md` at top level.

---

### Step 2: Installer CLI — hub, migration, packages (AC3–AC7, AC9–AC11)

**Actions:**
1. Implement `loadSkillGraph`, `listInstallableSkills`, `resolveTransitiveDeps`.
2. Refactor `ensureSharedHubInstalled` (whitelist hub copy; drop nested memory mkdir).
3. Implement `migratePromotedSkills` (nested → top-level + memory path).
4. Extend `runInteractive` with `f`/`w`/`e`, dep select-on, updated help text.
5. Wire `runUpdate` + install loop to migration + hub ensure triggers.
6. Update `printHelp()` for packages and shortcuts.

**Affected files:** `bin/cli.js`

**Checks:** Manual dry-run in `test/` cwd: `f` selects 35 skills; `w` excludes Extra-only; toggling `09-goal-fix-pr` selects `goal-loop` + `08-fix-pr`; `shared/` never in menu.

---

### Step 3: Harness link sweep + config defaults (AC12, AC15)

**Actions:**
1. Update root `AGENTS.md` Layer 5 + autoload table + External Dependencies.
2. Update `.agents/AGENTS.md` Utility section.
3. Update `config.json.example`, `config.schema.json`, `tools.md`, `setup.md`, `gates.md` if paths cited.
4. Bulk replace `../shared/<promoted>/` in pipeline/review skills (~30 files).
5. Update `check-harness/SKILL.md` phantom-path rules and diagram.
6. Update `self-learning/self_learning.py` default paths and help text.
7. Update `test/test-install.js` hardcoded `shared/goal-loop` path.

**Affected files:** See harness table in §2; grep-driven full list.

**Checks:** `rg 'shared/(caveman|gabarito|karpathy|spec-format|goal-loop|self-learning|changelog)'` returns zero in `.agents/skills/` (except migration comments/changelog history if any).

---

### Step 4: Site catalog + Installation packages (AC13)

**Actions:**
1. Update `AGENTS.md` layer rows first (source for catalog).
2. Modify `bin/build-site.js`: top-level scan only; emit `#install-packages` section from `skill-dependencies.json`.
3. Run `node bin/build-site.js`; commit regenerated `docs/index.html`.
4. Verify promoted skill cards use `.agents/skills/caveman/SKILL.md` paths (not `shared/`).

**Affected files:** `bin/build-site.js`, `docs/index.html`, `AGENTS.md`

**Checks:** Open site catalog — 7 promoted skills at top-level paths; Installation packages section present.

---

### Step 5: Test suite expansion (AC14)

**Actions:**
1. Update tree comparison in `test-install.js` for new layout (promoted paths).
2. **Phase 4 (new):** After install, assert top-level `caveman/SKILL.md` exists; `shared/caveman/` absent.
3. **Phase 5 (new):** Simulate `shared/self-learning/memory/` legacy consumer → run `update` → memory at `self-learning/memory/`.
4. **Phase 6 (new):** Non-interactive package test — spawn CLI with stdin `w\ny\n` (or export test helper); assert Workflows membership installed without `security-review` (Extra-only example).
5. **Phase 7 (new):** Dependency auto-select — stdin toggle `09-goal-fix-pr` only; assert `goal-loop` installed.
6. Keep existing phases: self-overwrite, config preserve, rename migration, shim smoke.

**Affected files:** `test/test-install.js`

**Checks:** `npm run tests -- --local` green.

---

### Step 6: Harness verification + README (AC15)

**Actions:**
1. Run `check-harness` Phases 0–5c (report-only first).
2. Fix any phantom routes / broken links found.
3. Brief `README.md` install section update for packages.

**Affected files:** As surfaced by harness; `README.md`

**Checks:** `check-harness` critical findings = 0; `npm run tests -- --local` still green.

---

## 4. Permissions, Tenancy & i18n

| Area | Notes |
|------|-------|
| RBAC / tenancy | N/A — CLI installer, no auth surface |
| Data isolation | Consumer `config.json` and `self-learning/memory/` isolated from upstream overwrite |
| i18n | All installer prompts, site copy, skill bodies: **en-us** only |

---

## 5. Test Coverage

| AC | Test case | Location / method |
|----|-----------|-------------------|
| AC1 | Promoted skills at top-level; not under `shared/` | `test-install.js` Phase 4 — `assertPath` |
| AC2 | `shared/` hub files only | Phase 4 — `readdir shared/` negative assert on 7 slugs |
| AC3 | Menu lists promoted; not `shared` | Phase 6 stdout parse or unit export of `listInstallableSkills` |
| AC4 | Package shortcuts apply membership | Phase 6 — `w`/`e`/`f` stdin automation |
| AC5 | Full selects all + hub | Phase 6 — `f` → dir count = installable count; `shared/config.schema.json` exists |
| AC6 | Workflows excludes Extra-only | Phase 6 — no `security-review` after `w` |
| AC7 | Extra excludes orchestrators | Phase 6 — `e` → no `spec-to-pr` |
| AC8 | Map file exists + valid JSON | Phase 0b — require `bin/skill-dependencies.json` |
| AC9 | Dep select-on (`09-goal-fix-pr` → `goal-loop`) | Phase 7 |
| AC10 | `config.json` preserve on update | Existing Phase 2 (unchanged) |
| AC11 | Memory preserve after path move | Phase 5 — marker file in legacy path survives update |
| AC12 | No stale `shared/<promoted>` in harness | Phase 0b grep + `check-harness` |
| AC13 | Site Installation packages section | Manual / optional HTML assert in Phase 0b on `docs/index.html` |
| AC14 | Full suite green | `npm run tests -- --local` |
| AC15 | Harness routing consistent | `check-harness` Phases 0–5c post-implementation |

---

## 6. Invariants (Do Not Violate)

- Consumer `shared/config.json` never overwritten on install/update.
- Consumer `self-learning/memory/` and `MEMORY.md` never overwritten by upstream copy.
- Dual-mode config path: `.agents/skills/shared/config.json` only (`config-resolution.md` unchanged).
- `shared/` not selectable as a skill package.
- Skill `name:` frontmatter unchanged (routing by name stable).
- Self-overwrite guard: refuse install when cwd is package root (except `test/`).
- Upstream canonical source: changes authored here; portable paths only.
- `commitPlanFilesOnlyAtStep12: true` — workflow artifact commit discipline unchanged.

---

## 7. Pre-PR Checklist

- [x] Seven skills promoted; `shared/` hub-only (AC1–AC2)
- [x] `bin/skill-dependencies.json` matches installer behavior (AC8–AC9)
- [x] Installer packages `f`/`w`/`e` + dep select-on (AC3–AC7)
- [x] `ensureSharedHubInstalled` whitelist; memory path top-level (AC10–AC11)
- [x] `migratePromotedSkills` covered by tests
- [x] AGENTS.md ×2 + shared/AGENTS.md + link sweep (AC12)
- [x] `node bin/build-site.js` — Installation packages section (AC13)
- [x] `npm run tests -- --local` green (AC14)
- [x] `check-harness` Phases 0–5c — no critical phantom/broken links (AC15)
- [x] Root `README.md` install blurb updated
- [x] All strings en-us

---


## 8. Open Questions — Resolved (Step 2)

| # | Question | Resolution | Evidence |
|---|----------|------------|----------|
| 1 | Workflows vs Extra for `check-harness` / `check-workflows`? | **Workflows package** | `test/test-install.js` expects `check-harness` after install; AGENTS.md mandates harness audit post-install |
| 2 | `security-review` hard dep on `karpathy-guidelines`? | **No install dep** — autoload/behavioral only | `security-review/SKILL.md` has no karpathy reference; only `tdd-sdd-ddd-reviewer` and `domain-review` cite karpathy |
| 3 | `install-skills.sh` same PR? | **Minimal sync only** — banner pointing to Node CLI for packages | README + site still link curl installer; `bin/cli.js` canonical for packages/deps |
| 4 | Transitive deselect UX? | **Confirmed:** select-off does not cascade | Per spec AC + installer help text |
| 5 | `azure-devops-provider` in Workflows default? | **Yes** | `test-install.js` pipeline list includes `azure-devops-provider` |

**Shared understanding:** confirmed — no blocking gaps remain.

---

## Interview registry

| id | class | section | gap | status | resolution |
|----|-------|---------|-----|--------|------------|
| G1 | non-blocking | §8 Q1 | Harness skills package placement | resolved | Workflows — matches test-install + AGENTS.md |
| G2 | non-blocking | §8 Q2 | Review skill karpathy install dep | resolved | autoloadOnly; no hard install edge for security-review |
| G3 | non-blocking | §8 Q3 | Bash installer drift | resolved | Minimal banner in install-skills.sh; packages Node-only |
| G4 | non-blocking | §8 Q4 | Deselect cascade rule | resolved | no cascade-off confirmed |
| G5 | non-blocking | §8 Q5 | ADO provider in Workflows | resolved | included in packages.workflows |
| G6 | blocking | §2 packages | Final skill name arrays | resolved | 26 Workflows + 9 Extra + 35 Full enumerated above |
| G7 | non-blocking | §2 deps | `06-code-review` install deps | resolved | declare karpathy + caveman + gabarito + self-learning as install deps |

**Plan notes:** Complexity = **complex**. Ready for **Step 3 plan-to-tasks** DAG.
