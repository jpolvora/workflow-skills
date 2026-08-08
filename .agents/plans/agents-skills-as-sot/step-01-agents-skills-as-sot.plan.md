---
slug: agents-skills-as-sot
title: "Refactor skill SoT from src/skills to .agents/skills"
status: "plan to be refined"
---

## 0. Summary & Business Rules

**Objective:** Make `.agents/skills/ws-*` the sole upstream skill-content Source of Truth (SoT). Author, package, hash, audit, catalog, and install from that tree. Remove the dual-tree `src/skills` + `npm run sync-skills` bridge.

**Business rules**

1. Upstream skill bodies live only under `.agents/skills/ws-*` (same folder ids, scripts, refs).
2. Consumer-owned hub data under `.agents/skills/ws-shared/` (`config.json`, `config.local.json`, `STACK.md`, `MEMORY.md`, `memory/*`, `installed-skills.json`, `skill-integrity-local.json`, optional `CHANGELOG.md`, `.gitignore`) is never published as SoT templates; keep gitignore + `package.json` `files` exclusions + integrity hub whitelist behavior equivalent to today’s `src/skills/ws-shared` exclusions.
3. Hybrid install scopes and project-config override stay unchanged — only the **upstream package source tree** moves.
4. `assertNotSelfOverwrite` / refuse-install-into-source-repo must still recognize the upstream package root after SoT and consumer install paths share the `.agents/skills` name (detect via package markers, not path name alone).
5. Language en-us; no IDE/host product coupling; no absolute author-machine paths in portable contracts.
6. Live hubs/docs/skills/tests/tooling must stop requiring `src/skills`, `promote into src/`, or `npm run sync-skills`. Archived plan/spec history may still mention old paths (out of scope).

**Security / integrity mitigations**

- Integrity hashing continues to exclude consumer-owned hub names (whitelist hub templates only).
- Installer never overwrites consumer config/MEMORY/STACK/CHANGELOG/memory on update (existing seed-from-templates behavior preserved; retarget template source path only).
- Self-overwrite guard remains fail-closed for package root (except `test/`).

**Fable / DevOps binding (optional, non-blocking):** Treat package markers (`bin/skill-dependencies.json`, `.agents/AGENTS.md`), integrity manifests, and install refuse-self-overwrite as primary sources; verify by observation via `npm run generate-integrity && npm run verify-integrity`, `npm run test`, and `ws-check-harness` Install mode `upstream` + scan root `.agents/skills`.

---

## 1. Definition of Ready & Scope

### Resolved assumptions

| # | Assumption |
|---|------------|
| A1 | Stack = `node-skills-package` (Node 22 / JS). No DB/frontend/i18n/RBAC work. |
| A2 | Current SoT = tracked `src/skills/`; dogfood = gitignored `.agents/skills/ws-*` (often present via sync). |
| A3 | On conflict during move, **SoT content from `src/skills` wins** for publishable skill/hub-template files; **consumer-owned hub files already under `.agents/skills/ws-shared/` are preserved** (never overwritten by templates). |
| A4 | After move, `src/skills/` is deleted; empty `src/` removed if nothing else remains (today only `src/skills/`). |
| A5 | Consumer install destinations (project `.agents/skills`, global `$HOME/.agents/skills`) and config precedence unchanged. |
| A6 | Working branch `develop`, base `main`. Plan artifacts commit only at ship (invariant `commitPlanFilesOnlyAtStep8`). |
| A7 | MEMORY trap `2026-08-01-npm-test-phase-0b-sync-skills` becomes obsolete; rewrite or supersede after gitignore invert (interview may confirm timing). |

### Acceptance Criteria (measurable)

| AC | Statement |
|----|-----------|
| AC1 | Every former `src/skills/ws-*/` package (incl. `ws-shared` templates) lives under `.agents/skills/ws-*/`; `src/skills/` gone; no installer/integrity/site path requires `src/skills` for skill content. |
| AC2 | Consumer-owned `.agents/skills/ws-shared/` files stay non-published (gitignored + `package.json` `files` exclusions + integrity hub hashing class unchanged); install seeds from templates only; update never overwrites consumer config/MEMORY/STACK/CHANGELOG/memory. |
| AC3 | `bin/cli.js`, `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js`, `bin/build-site.js` resolve package skills dir to `.agents/skills`; `generate-integrity` / `verify-integrity` / install pre-verify succeed. |
| AC4 | `package.json` `files` ships `.agents/skills/` (with consumer exclusions); `npm run test` / install dry-runs pass without `src/skills` SoT fallbacks. |
| AC5 | Root `AGENTS.md`, `.agents/AGENTS.md`, packaged `ws-shared/AGENTS.md`, `SKILL_AUTHORING.md`, `README.md` (+ site/catalog SoT text) state `.agents/skills` is upstream SoT; remove promote/`src/`-only-author/`sync-skills` obligations. |
| AC6 | `ws-check-harness` Phase 0: upstream = package markers **and** ≥1 `.agents/skills/ws-*/SKILL.md`; Skills scan root upstream = `.agents/skills`; consumer still scans `{skillsRoot}` / `{globalSkillsRoot}` without inventing inventory from removed `src/skills`. |
| AC7 | Harness docs drop dogfood-lag / install-path↔`src/skills` SoT-id equivalence; hub literals under `.agents/skills/...` are filesystem-true when that tree is scan root; Phase 3 item 7 hashes `.agents/skills`. |
| AC8 | `ws-check-workflows` has no hard `src/skills` SoT dependency; discovery uses `.agents/skills` / `{skillsRoot}`. |
| AC9 | `scripts/sync-skills.js` deleted; no `sync-skills` npm script; no required maintainer `npm run sync-skills` / `scripts/sync-skills.js` step in hubs/docs/skills/tests. |
| AC10 | Root `.gitignore` no longer ignores all `.agents/skills/ws-*/` bodies; only consumer-owned hub paths ignored; skill packages are commit-able. |
| AC11 | en-us; no IDE/host coupling; no absolute author-machine paths in portable contract. |
| AC12 | DoD: `generate-integrity` + `verify-integrity` exit 0; `npm run test` exit 0; `ws-check-harness` at package root → Install mode `upstream`, Skills scan root `.agents/skills`, 0 critical findings attributable to SoT move. |

### Out of scope

- Changing consumer install destinations or hybrid config precedence.
- Renaming skill ids / new pipeline features.
- Migrating historical/archived plan artifacts that merely mention `src/skills` (update live contracts only).
- Live prod deploys or unrelated refactors.

### MEMORY pre-work (ws-self-learning)

- Trap **Local-spec provider config path:** keep `{sharedDir}` = `.agents/skills/ws-shared/config.json` (unchanged by this move).
- Trap **Npm Test Phase 0B Sync Skills:** will be **invalidated** by AC10 — Phase 0b will read tracked SoT under `.agents/skills`; do not keep instructing `sync-skills` after ship. Plan Step 9 / interview to supersede MEMORY entry.

---

## 2. Technical Design & Architecture

### Layers (config.json → post-change)

| Layer | Path (after) | Role |
|-------|--------------|------|
| **skills-sot** | `.agents/skills` | Sole published skill bodies + hub templates |
| **installer-cli** | `bin` | CLI, integrity, site builder, install-rules |
| **tests** | `test/` | Install, integrity, quality-gate tests |
| **scripts** | `scripts/` | Authoring utilities (sync-skills removed) |

Also update dogfood `config.json` / `STACK.md` layer prose (`skills-sot` path, drop sync-skills references) — consumer-owned but required for upstream accuracy.

### Move algorithm (surgical)

1. Ensure `.agents/skills` exists.
2. For each `src/skills/ws-*` directory:
   - Non-hub: copy/replace into `.agents/skills/<id>/` from SoT (force publishable content).
   - `ws-shared`: copy **only non-consumer-owned** items (same exclusion set as today’s `scripts/sync-skills.js`: skip `config.json`, `config.local.json`, `MEMORY.md`, `STACK.md`, `CHANGELOG.md`, `installed-skills.json`, `skill-integrity-local.json`, `.gitignore`, and `memory/`). Prefer SoT templates/docs (`AGENTS.md`, `tools.md`, `gates.md`, `*.example`, `hub.gitignore`, `skill-dependencies.json`, etc.).
3. Invert root `.gitignore` (see Step 7) **before** `git add` of skill bodies.
4. Delete `src/skills/` (and empty `src/`).
5. Do **not** delete consumer-owned hub files during cleanup.

### Tooling retarget (single constant preferred)

Introduce one package-skills root helper used everywhere:

- Suggested: `path.join(packageRoot, '.agents', 'skills')` (or shared export from `install-rules.js` / integrity lib) replacing `src/skills`.
- Touch points:
  - `bin/cli.js` — `srcSkillsDir` → package skills dir (rename for clarity optional, e.g. `packageSkillsDir`).
  - `bin/skill-integrity-lib.js` — `buildUpstreamManifest` skillsDir.
  - `bin/build-site.js` — catalog scan root + `data-path` prefixes.
  - `bin/install-rules.js` — `isWorkflowSkillsSourceTree` secondary marker: today `src/skills/ws-shared/skill-dependencies.json` → `.agents/skills/ws-shared/skill-dependencies.json` (keep `bin/skill-dependencies.json` primary).
  - `bin/generate-skill-integrity.js` — inherits via lib (verify no hardcoded `src/skills`).
  - Tests under `test/` — all SoT path literals / fallbacks.
  - Skill scripts that mention dual-tree (e.g. `ws-self-learning` comment about resolving from `src/skills` or `.agents/skills`).

### Harness contract flip

| Mode | Markers | Skills scan root | Hub literals |
|------|---------|------------------|--------------|
| **upstream** | `bin/skill-dependencies.json` + `.agents/AGENTS.md` + ≥1 `.agents/skills/ws-*/SKILL.md` | `.agents/skills` | Filesystem-true (no SoT-id equivalence / dogfood-lag) |
| **consumer** | markers without upstream SoT evidence, or pure consumer tree | `{skillsRoot}` (+ optional `{globalSkillsRoot}`) | Require on-disk under install tree; **ignore** stray `src/skills` if present |

Remove: dogfood-lag notes, install-path↔`src/skills` equivalence, “do not treat `.agents/skills` as inventory SoT”, mandatory `sync-skills` maintainer steps.

### `package.json` `files` shape (target)

```text
.agents/skills/
!.agents/skills/ws-shared/config.json
!.agents/skills/ws-shared/config.local.json
!.agents/skills/ws-shared/STACK.md
!.agents/skills/ws-shared/MEMORY.md
!.agents/skills/ws-shared/memory/**
!.agents/skills/ws-shared/skill-integrity-local.json
!.agents/skills/**/__pycache__/**
!.agents/skills/**/*.py[cod]
!.agents/skills/**/*.pyo
```

(Plus existing `bin/`, hubs docs, etc.) Remove `src/skills/` entries and `sync-skills` script.

### Invariant checks (`config.json.invariants`)

- `commitPlanFilesOnlyAtStep8: true` — do not commit plan folder before Step 8.
- EF/tenancy sample keys remain false / N/A.
- Portability: path tokens `{skillsRoot}` / `{sharedDir}` stay consumer layout; upstream SoT **coincides** with `{skillsRoot}` in this repo after the move (document carefully so consumers are not told to author in their install tree as “upstream SoT”).

### Self-overwrite risk (spec risk note)

Detection must remain: package root / under package (except `test/`) OR walk-to `isWorkflowSkillsSourceTree`. Update secondary marker path; do **not** treat “has `.agents/skills`” alone as upstream. Verify with install attempt at package root (expect refuse) and under `test/` (allowed).

---

## 3. Step-by-Step Plan

### Step 1 — Inventory & freeze move map (AC1, AC2, AC11)

**Action:** List all `src/skills/ws-*` ids; confirm dogfood tree parity; document consumer-owned preserve list; confirm nothing else under `src/`.

**Files:** read-only scan of `src/skills/`, `.agents/skills/`, `.gitignore`, `package.json` `files`.

**Checks:** Count of packages match; `src/` has only `skills/`; en-us / no host coupling in planned contract wording.

**Maps:** AC1, AC2, AC11.

---

### Step 2 — Invert `.gitignore` for tracked skill bodies (AC10)

**Action:** Remove root rule that ignores `.agents/skills/ws-*/` as “generated from src”. Keep ignoring consumer-owned hub paths via `.agents/skills/ws-shared/.gitignore` / `hub.gitignore` patterns (and any still-needed root exceptions for `config.json`, MEMORY, STACK, CHANGELOG, memory, installed-skills, skill-integrity-local). Ensure `__pycache__` / `*.py[cod]` remain ignored.

**Files:** `.gitignore`; verify `.agents/skills/ws-shared/.gitignore` + shipped `hub.gitignore` still exclude consumer data.

**Checks:** `git check-ignore` on a skill `SKILL.md` → not ignored; on `ws-shared/config.json` → ignored.

**Maps:** AC10, AC2.

---

### Step 3 — Promote SoT into `.agents/skills` and delete `src/skills` (AC1, AC2)

**Action:** Execute move algorithm (§2): publishable content from `src/skills` → `.agents/skills`, preserve consumer-owned hub files, delete `src/skills/` (+ empty `src/`). Stage skill bodies for git once gitignore inverted.

**Files:** `.agents/skills/ws-*/**` (all packages); remove `src/skills/**`; optionally remove empty `src/`.

**Checks:** Every former package id present under `.agents/skills`; consumer `config.json` / MEMORY / STACK / memory untouched in content; `src/skills` absent.

**Maps:** AC1, AC2.

---

### Step 4 — Retarget installer, integrity, site, install-rules (AC3, AC4, AC12)

**Action:**

1. Point package skills directory to `.agents/skills` in `bin/cli.js`, `bin/skill-integrity-lib.js` (`buildUpstreamManifest`), `bin/build-site.js`.
2. Update `bin/install-rules.js` source-tree marker(s) away from `src/skills/...`.
3. Grep `bin/` for remaining `src/skills` skill-content requirements; fix.
4. Run `npm run generate-integrity` → commit-ready `bin/skill-integrity.json` (same change set as content).
5. Run `npm run verify-integrity` (must exit 0).

**Files:** `bin/cli.js`, `bin/skill-integrity-lib.js`, `bin/generate-skill-integrity.js` (if needed), `bin/build-site.js`, `bin/install-rules.js`, `bin/skill-integrity.json`.

**Checks:** Install pre-verify against `.agents/skills`; site catalog paths use `.agents/skills/...`; self-overwrite still blocks package root.

**Maps:** AC3, AC4 (partial), AC12 (integrity).

---

### Step 5 — `package.json` files list + delete sync bridge (AC4, AC9)

**Action:** Replace `src/skills/` `files` entries with `.agents/skills/` + exclusions; remove `"sync-skills"` script; delete `scripts/sync-skills.js`. Grep repo (hubs, skills, tests, README, STACK) for required sync-skills maintainer steps and remove/rewrite.

**Files:** `package.json`, `scripts/sync-skills.js` (delete), any docs/scripts referencing sync.

**Checks:** `npm pack` dry contents include skill bodies under `.agents/skills` and exclude consumer hub files; no `sync-skills` script; grep clean for required sync step (historical plans OK).

**Maps:** AC4, AC9.

---

### Step 6 — Update tests path expectations (AC4, AC9, AC12)

**Action:** Retarget `test/test-install.js`, `test/test-quality-gates.js`, `test/test-cleanup-workflow-git.js` (and any other tests) from `src/skills` → `.agents/skills`. Remove SoT fallbacks that rewrite `.agents/skills/...` → `src/skills/...`. Drop Phase 0b dependency on sync-skills. Update any assertions about sync script existence to expect absence.

**Files:** `test/**`.

**Checks:** `npm run test` exit 0.

**Maps:** AC4, AC9, AC12.

---

### Step 7 — Hub & human doc contract rewrite (AC5, AC11)

**Action:** Rewrite SoT sections to “edit / publish from `.agents/skills`”; remove promote-into-`src/`, author-only-in-`src/`, dogfood-sync obligations. Align:

- Root `AGENTS.md` (Skill SoT table, upstream developer workflow, integrity step 7 paths, harness change protocol).
- `.agents/AGENTS.md` (authoring SoT blurb).
- Packaged `ws-shared/AGENTS.md` (SoT pointer).
- `SKILL_AUTHORING.md` canonical SoT banner.
- `README.md` if install/safety/SoT narrative mentions old tree.
- Dogfood `STACK.md` / `config.json` layer descriptions (path + drop sync-skills).
- Site: `npm run build-site:bump` (or `build-site`) so catalog `data-path` / copy no longer advertise `src/skills` as SoT.

**Files:** `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/ws-shared/AGENTS.md`, `SKILL_AUTHORING.md`, `README.md`, `.agents/skills/ws-shared/STACK.md`, `.agents/skills/ws-shared/config.json` (layer prose), `docs/index.html` (via build-site).

**Checks:** Grep live hubs/docs for “only canonical … `src/skills`”, “promote into `src`”, “`npm run sync-skills`” as required maintainer step → none; wording remains en-us / host-neutral.

**Maps:** AC5, AC11, AC9 (docs).

---

### Step 8 — `ws-check-harness` scan-root + drop dogfood-lag (AC6, AC7, AC12)

**Action:** Update `SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md` (and any scripts if present) so:

- Upstream SoT evidence = `.agents/skills/ws-*/SKILL.md`.
- Skills scan root upstream = `.agents/skills`.
- Consumer ignores stray `src/skills`.
- Delete dogfood-lag / SoT-id equivalence / install-path exception rules.
- Phase 3 item 7 integrity remains upstream-only against hashed `.agents/skills`.
- Example `rg`/`find` commands in docs use `.agents/skills`.

**Files:** `.agents/skills/ws-check-harness/SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md` (+ scripts if any hardcode paths).

**Checks:** Manual Phase 0 notes at package root show Install mode `upstream`, Skills scan root `.agents/skills`; no criticals from SoT-move drift.

**Maps:** AC6, AC7, AC12.

---

### Step 9 — `ws-check-workflows` + ancillary skill path comments (AC8)

**Action:** Remove SKILL.md wording that cites SoT `src/skills/` as alternate. Confirm `resolve_skills_dir` already prefers `{skillsRoot}` / `.agents/skills` (keep; fix only if any hard `src/skills` remains in scripts/docs). Clean dual-tree comments in skills such as `ws-self-learning` if they instruct `src/skills` resolution. Supersede MEMORY trap for Phase 0b sync-skills (compile via ws-self-learning after interview/implement).

**Files:** `.agents/skills/ws-check-workflows/SKILL.md`, `scripts/check_workflows.py` (only if needed), other skill comments; `.agents/skills/ws-shared/memory/*` / MEMORY compile.

**Checks:** `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` uses `.agents/skills`; grep skill bodies for required `src/skills` SoT → none.

**Maps:** AC8, AC9 (MEMORY), AC11.

---

### Step 10 — Definition of Done gate (AC12 + regression)

**Action:** Run full verification board:

1. `npm run generate-integrity && npm run verify-integrity`
2. `npm run test`
3. `ws-check-harness` Phases 0–5c at package root → 0 critical attributable to SoT move; record Install mode + scan root
4. Optional: `ws-check-workflows` if orch docs/scripts touched
5. Confirm `assertNotSelfOverwrite`: install at repo root refused; `test/` still allowed
6. Spot-check `npm pack` exclusion of consumer hub files

**Files:** none new (evidence only).

**Maps:** AC12 (and reconfirms AC1–AC11).

---

## 4. Permissions, Tenancy & i18n

N/A for this Node skills package (no RBAC, tenancy field, or i18n framework). Portable contract must remain host-neutral (AC11).

---

## 5. Test Coverage

| AC | Test / verification case | Method / command |
|----|--------------------------|------------------|
| AC1 | All former package ids exist under `.agents/skills`; `src/skills` missing; CLI/integrity/site resolve `.agents/skills` | `test-install` SoT path assertions; filesystem assert; grep `bin/` for skill-content `src/skills` |
| AC2 | Consumer hub files excluded from pack + integrity hub digest; update/install seed does not overwrite config/MEMORY/STACK/CHANGELOG/memory | `npm pack` / install dry-run in `test/test-install.js`; integrity hub whitelist unit behavior |
| AC3 | Manifest build + `--check` against `.agents/skills`; install pre-verify OK | `npm run generate-integrity`; `npm run verify-integrity`; install path in `test-install.js` |
| AC4 | `package.json` `files` lists `.agents/skills/` with exclusions; tests pass without `src/skills` fallback | `npm run test`; pack file list inspection |
| AC5 | Live hubs/docs state `.agents/skills` SoT; no promote/`sync-skills` required steps | Doc grep gate in quality tests or harness Phase 2/4; manual hub review |
| AC6 | Phase 0 upstream detection + scan root `.agents/skills`; consumer ignores stray `src/skills` | `ws-check-harness` Phase 0 at package root; optional consumer fixture |
| AC7 | Harness docs lack dogfood-lag / SoT-id equivalence; Phase 3 item 7 hashes `.agents/skills` | Doc assertion / harness Phase 3; `REPORT-FORMAT` sample lines |
| AC8 | `check_workflows` / skill docs use `.agents/skills` or `{skillsRoot}` only | Run `check_workflows.py`; grep skill for `src/skills` SoT |
| AC9 | `scripts/sync-skills.js` gone; no npm script; no required maintainer sync step | Filesystem + `package.json` script assert; repo grep (exclude archived plans) |
| AC10 | Skill `SKILL.md` not gitignored; consumer hub files still ignored | `git check-ignore` positive/negative cases; `git status` shows skill bodies as trackable |
| AC11 | No host product names / absolute machine paths in portable skill/installer contract touched by this change | Portability scan (`ws-check-harness` Phase 5 / existing gates) |
| AC12 | Integrity 0 + tests 0 + harness upstream/scan-root/0 critical | Explicit DoD command board (Step 10) |

**Suggested named cases (for implementers):**

- `test_sot_lives_under_agents_skills`
- `test_package_files_excludes_consumer_hub`
- `test_integrity_manifest_from_agents_skills`
- `test_install_preverify_agents_skills`
- `test_no_sync_skills_script`
- `test_no_src_skills_fallback_in_tests`
- `test_gitignore_tracks_skill_bodies`
- `test_assert_not_self_overwrite_still_blocks_package_root`
- `harness_phase0_upstream_scan_root_agents_skills`
- `harness_docs_no_dogfood_lag_equivalence`

---

## 6. Invariants (Do Not Violate)

From `config.json.invariants` + harness rules:

1. **`commitPlanFilesOnlyAtStep8`** — do not commit `{plansDir}` artifacts before ship.
2. **Consumer hub sanctity** — never publish or overwrite consumer-owned `ws-shared` data from templates on update.
3. **Portability** — skills/installer contract stays IDE/agent-neutral; use `{skillsRoot}` / `{sharedDir}` tokens for consumer layout.
4. **Integrity fail-closed** — no ship with verify-integrity ≠ 0; no silent `--force-integrity` in DoD.
5. **Self-overwrite refuse** — installing into upstream package root remains blocked (except `test/`).
6. **No dual SoT** — after change, do not reintroduce `src/skills` as authoring or hash root.
7. **en-us only** for skill bodies, gates, banners, harness docs touched here.
8. **Latest layout only** — no migration shims dual-reading `src/skills` and `.agents/skills` for package SoT (tests must not keep SoT fallbacks).

---

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills under `.agents/skills`; tooling under `bin/`; tests under `test/`).
- [ ] Domain entities/mappings N/A — hub templates vs consumer data encapsulation preserved.
- [ ] Schema migrations N/A.
- [ ] Authorization N/A — self-overwrite guard verified.
- [ ] i18n N/A.
- [ ] Test cases cover all ACs (table §5).
- [ ] `npm run generate-integrity && npm run verify-integrity` exit 0.
- [ ] `npm run test` exit 0.
- [ ] `ws-check-harness` → Install mode `upstream`, Skills scan root `.agents/skills`, 0 critical from SoT move.
- [ ] `scripts/sync-skills.js` deleted; no `sync-skills` npm script.
- [ ] Site/catalog rebuilt if SoT paths shown (`build-site:bump` when shipping).
- [ ] Hubs drift-aligned (`AGENTS.md` ↔ `.agents/AGENTS.md` ↔ `ws-shared/AGENTS.md`).
- [ ] MEMORY trap for sync-skills superseded.

---

## 8. Open Questions

1. **Move conflict policy (confirm):** When dogfood `.agents/skills/ws-X` differs from `src/skills/ws-X`, always overwrite publishable files from `src/skills` (recommended). Any packages that must merge instead?
2. **MEMORY supersede timing:** Rewrite `2026-08-01-npm-test-phase-0b-sync-skills` in the same implementation PR, or defer to post-ship self-learning compile?
3. **Site version bump:** Prefer `npm run build-site:bump` (patch bump + catalog) in the same release PR as the SoT move (recommended per upstream ship gate)?
4. **`isWorkflowSkillsSourceTree` secondary marker:** Confirm replacing `src/skills/ws-shared/skill-dependencies.json` with `.agents/skills/ws-shared/skill-dependencies.json` is sufficient alongside `bin/skill-dependencies.json` (no other `src/skills` markers in install-rules).
5. **Empty `src/` directory:** Delete entirely after move (recommended) vs leave placeholder README? Spec says delete if nothing remains.
6. **Historical grep noise:** Quality-gate greps for `src/skills` / `sync-skills` — should they exclude `.agents/plans/**` and archived `specs/**` explicitly so history does not fail CI?
7. **config.json layer id:** Rename layer `skills-sot` path only, or also refresh the outdated “migrating to src/ws-*” comment in dogfood config/STACK in this PR? (Recommended: yes, same PR.)
