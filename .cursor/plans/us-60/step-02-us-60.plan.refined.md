---
slug: us-60
title: "Portable harness improvements from consumer check-harness (External Dependencies, spec-to-pr disclosure, en-us)"
status: "implemented"
---

## 0. Summary & Business Rules

**Feature:** GitHub issue [#60](https://github.com/jpolvora/workflow-skills/issues/60) / US 60 — port portable harness fixes into `jpolvora/workflow-skills` (docs/skills/CLI only).

**Core objectives**
1. Stop dead-end `#external-dependencies` links for consumers (critical).
2. Progressive disclosure for packaged Active `.cursor/rules/` (warning).
3. Slim `spec-to-pr/SKILL.md` via sibling `STEP-DISPATCH.md` (suggestion).
4. Fix retired skill id `step-10-update-plan-implementation` → `10-update-plan-implementation` (critical if present — **confirmed present**).
5. `domain-review` en-us for leftover PT catalog tokens (warning — **confirmed present**).
6. Optional installer seeds for `.cursorrules` / `CHANGELOG.md` without clobber (suggestion — **locked: CLI create-if-missing**).

**Business rules**
- Repo stack is **node-skills-hub** (Node 22 CLI + Markdown skills). No .NET/React/DB work.
- Skills stay **portable and project-agnostic**; no consumer org/repo/solution/API paths.
- Skill bodies, gates, banners: **en-us** only. Consumer domain maps may keep PT heading aliases.
- Installer must **never overwrite** existing consumer `.cursorrules` / `CHANGELOG.md` / root `AGENTS.md` content when seeding.
- Out of scope (consumer-only): product `index.mdc` inventories, stack `.mdc` demotions, ERP/lib renames, consumer ADO helper PT→EN, hardcoded build hosts.

**Security mitigations**
- No secrets in seeds/templates.
- Do not copy upstream hub `config.json` / `MEMORY.md` into consumers (existing installer trap).
- Seeds are create-if-missing only.

---

## 1. Definition of Ready & Scope

### Verified upstream gaps (2026-07-17 @ `373455bd`; re-verified Step 2 interview)

| Item | Status | Evidence |
|------|--------|----------|
| Root `AGENTS.md` § External dependencies | **Partial** | Section exists (`## External dependencies` → `#external-dependencies`) with resolve table. **Missing:** “Code review proof” pointer; no mirror in `shared/setup.md`; packaged consumer notes still point at root `AGENTS.md` (dead end when consumer hub omits section). |
| Packaged Active rules disclosure | **Gap** | `.agents/AGENTS.md` lists only `ask-question-gates.mdc` with no note that full always-apply inventory lives in the consumer product router. |
| `STEP-DISPATCH.md` | **Missing** | Zero files; dispatch + Step 12/13 live inline in `spec-to-pr/SKILL.md`. |
| Retired id | **Present** | `spec-to-pr/SKILL.md` L830: ``[`step-10-update-plan-implementation`](... ) (`/step-10`)``. Also `10-update-plan-implementation/SKILL.md` standalone invoke still `/step-10`. |
| domain-review PT tokens | **Present** | `Índice`, `Ordem sugerida`, `Dependências`, `Pai / Sub`, `SIM` in `domain-review/SKILL.md`; `## Dependências` placement in `REPORT.md`. |
| Installer `.cursorrules` / `CHANGELOG.md` seeds | **Missing** | `bin/cli.js` `ensureSharedConsumerArtifacts` seeds MEMORY/stack only; no create-if-missing for those two. Upstream repo has `CHANGELOG.md`; no `.cursorrules`. |

### Resolved assumptions (interview)
- Adapt plan template §2–§7 to **skills / hub docs / CLI / tests** (not Domain/DB/Frontend app layers).
- Artifact names like `step-10-{slug}.report.md` are **pipeline filenames**, not skill folder ids — leave them alone.
- **AC6 depth (locked):** CLI create-if-missing for root `.cursorrules` → `AGENTS.md` and root `CHANGELOG.md` stub, mirroring MEMORY/stack seed UX; never overwrite. Docs/README/`setup.md` note optional accompaniment.
- Root hub already has External dependencies; work is **enrich + make portable for consumers**, not invent a second conflicting contract.
- **AC4 scope (locked):** Fix **invoke/dispatch** references (`step-10-update-plan-implementation`, slash `/step-10` as that skill’s invoke). Keep `check-harness` **forbidden-example** mentions of the retired form (they document what not to use). Also update `10-update-plan-implementation/SKILL.md` Invocation from `/step-10` → `/10-update-plan-implementation`.

### Acceptance Criteria (measurable)

| AC | Done when |
|----|-----------|
| **AC1** | Packaged install path documents or seeds External Dependencies so `#external-dependencies` / guardrails resolution is not a dead end (root hub enriched + portable copy or link that ships under `.agents/`). |
| **AC2** | Packaged `.agents/AGENTS.md` Active rules section = `ask-question-gates` + progressive-disclosure note; no stack-specific rule dump. |
| **AC3** | `.agents/skills/spec-to-pr/STEP-DISPATCH.md` exists; `SKILL.md` Audience & load points to it; inlined Step instructions / Step 12–13 gate protocols replaced by short pointer. |
| **AC4** | No invoke/dispatch refs to `step-10-update-plan-implementation` or `/step-10` for the post-workflow skill; `10-update-plan-implementation/SKILL.md` invoke uses `/10-update-plan-implementation`. Artifact `step-10-*.report.md` and check-harness forbidden-examples OK. |
| **AC5** | `domain-review` skill/report instructions use English headings; note that consumer PT aliases remain acceptable. |
| **AC6** | CLI create-if-missing seeds for `.cursorrules` → `AGENTS.md` and `CHANGELOG.md` stub; existing files never overwritten; install tests cover create-once / no-clobber. |
| **AC7** | `check-harness` Phases 0–5c clean for touched paths; `npm run tests -- --local` still green (CLI changed). |

### Out of scope
- Product routers, ABP/stack `.mdc`, ERP aliases, consumer-local ADO helpers.
- Rewriting all of `spec-to-pr/SKILL.md` beyond extract + pointer + retired-id fix.
- Seeding or overwriting consumer root `AGENTS.md` wholesale.
- Site redesign beyond regenerating catalog if routing tables change (`node bin/build-site.js` only if needed).

---

## 2. Technical Design & Architecture

**Stack:** `config.json` → `stack.id: node-skills-hub`. Layers: `skills` (`.agents/skills`), `cli` (`bin`), `tests` (`test`). Frontend/DB: none.

### Layer edits (harness)

| Layer | Paths | Change |
|-------|-------|--------|
| Hub (agent) | `AGENTS.md` | Enrich `## External dependencies`: stable contract, `rules.*` resolution order, **Code review proof** = pointer to resolved `seniorDeveloper` guardrails checklist (do not paste checklist). Keep heading that anchors as `#external-dependencies`. |
| Packaged index | `.agents/AGENTS.md` | (1) Self-contained or linked External Dependencies resolution so consumers without root section still resolve. (2) Active `.cursor/rules/` progressive disclosure note. |
| Shared hub | `.agents/skills/shared/setup.md`, optionally `config.json.example` `_comment` / schema docs | Document `rules.seniorDeveloper`, `rules.karpathyGuidelines`, `rules.stackFile` resolution; pointer to Code review proof. |
| Orch | `.agents/skills/spec-to-pr/SKILL.md`, **new** `STEP-DISPATCH.md` | Extract Step instructions + Step 12/13 protocols; fix post-workflow skill id. |
| Post-workflow skill | `.agents/skills/10-update-plan-implementation/SKILL.md` | Standalone invoke `/10-update-plan-implementation` (not `/step-10`). |
| Review skill | `.agents/skills/domain-review/SKILL.md`, `REPORT.md` | PT → en-us instruction tokens; alias note. |
| CLI (AC6) | `bin/cli.js` (+ help text) | Create-if-missing root `.cursorrules` and `CHANGELOG.md` stub (alongside `ensureSharedConsumerArtifacts` pattern; seed at consumer project root `targetDir`). |
| Tests | `test/test-install.js` | Assert seeds created once; second run does not clobber. |

### Invariants (`config.json.invariants`)
- `commitPlanFilesOnlyAtStep12: true` — plan artifacts stay uncommitted until Step 12.
- Portability: no hardcoded consumer paths in skill bodies.
- en-us skill content (check-harness language phase).

### Progressive disclosure pattern
Mirror existing `ARTIFACTS.md` pattern: `SKILL.md` keeps FSM/invariants/gates overview; load `STEP-DISPATCH.md` **only when advancing/dispatching** steps.

### AC6 seed shapes (defaults)
- **`.cursorrules`:** minimal English pointer that agents should follow `AGENTS.md` (single entry; no secrets).
- **`CHANGELOG.md`:** stub compatible with `changelog` skill template (create file if missing; skill already says create-if-absent).
- Hook after skill/hub install paths that already call `ensureSharedConsumerArtifacts` / equivalent install completion, so Full/workflow installs get seeds without a separate user action.

---

## 3. Step-by-Step Plan

*Dependency order. Each step: Action · Affected files · Engineering checks.*

### Step 1 — External Dependencies (AC1) — critical

**Action**
1. Enrich root `AGENTS.md` § External dependencies:
   - Resolution order table for `senior-developer`, `karpathy-guidelines`, `stackFile` / `CONTEXT.md` / optional consumer rules (keep project-agnostic).
   - Short **Code review proof** subsection: “Use the checklist from the resolved `rules.seniorDeveloper` skill (or local/global equivalent); do not duplicate it here.”
2. Add the same portable contract where consumers always receive it:
   - Preferred: section in `.agents/AGENTS.md` (Consumer notes / new § External Dependencies) **and/or** `shared/setup.md` with stable anchor, linked from packaged index.
   - Update consumer-notes link so it does not rely solely on a consumer root `AGENTS.md` that may omit the section.
3. Light docs on `config.json.example` `rules` block (comments) describing keys; avoid inventing new required files.

**Affected files:** `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/shared/setup.md`, optionally `config.json.example`.

**Checks:** Anchor `#external-dependencies` resolves from gabarito/check-harness/domain-review links; packaged path alone is enough for a fresh install; no stack-specific paths.

### Step 2 — Packaged Active `.cursor/rules/` disclosure (AC2)

**Action**
- Keep table row for `ask-question-gates.mdc` only (packaged rule).
- Add note: full always-apply / glob inventory lives in the **consumer** product router (e.g. `.cursor/rules/index.mdc` when present); do not treat this packaged list as exhaustive; do not embed stack-specific rule filenames.

**Affected files:** `.agents/AGENTS.md`.

**Checks:** No ABP/ERP/product rule names; progressive disclosure wording present.

### Step 3 — Extract `STEP-DISPATCH.md` + fix retired id (AC3, AC4)

**Action**
1. Create `.agents/skills/spec-to-pr/STEP-DISPATCH.md` containing (move, do not rewrite meaning):
   - `## Step instructions` table (steps 0–13).
   - Post-mutating merge note.
   - `### Step 12 — Delivery` and `### Step 13 — Ship & PR` protocols.
2. In `SKILL.md`:
   - Audience & load: add “Dispatch → [`STEP-DISPATCH.md`](STEP-DISPATCH.md) — load only when advancing/dispatching.”
   - Replace inlined Step instructions / Step 12–13 blocks with a short pointer.
   - Allowed deps / consistency note: point at STEP-DISPATCH as authoritative for dispatch table.
3. Fix Post-workflow line in `spec-to-pr/SKILL.md`:
   - Skill: `10-update-plan-implementation`
   - Invoke: `/10-update-plan-implementation`
   - Path: `skills/10-update-plan-implementation/SKILL.md` (relative link unchanged target).
4. Fix `10-update-plan-implementation/SKILL.md` Standalone Invocation: `/10-update-plan-implementation` (not `/step-10`).
5. Do **not** scrub `check-harness` examples that list `step-10-update-plan-implementation` as a **forbidden** form.

**Affected files:** `spec-to-pr/STEP-DISPATCH.md` (new), `spec-to-pr/SKILL.md`, `10-update-plan-implementation/SKILL.md`.

**Checks:** Invoke/dispatch greps clean for retired id and `/step-10` as that skill’s command; `STEP-DISPATCH.md` exists; SKILL.md still documents FSM/invariants; no behavior change to gate order.

### Step 4 — domain-review en-us (AC5)

**Action**
Replace instruction tokens (skill English only):

| Current (PT) | Target (en-us) |
|--------------|----------------|
| `Índice` | Index |
| `Ordem sugerida` | Suggested order |
| `Dependências` | Dependencies |
| `Pai / Sub` | Parent / Sub |
| `SIM` | YES |

In `REPORT.md`, placement before `## Dependencies` (English). Add one note: consumer domain maps may still use Portuguese heading aliases (`Índice`, `Dependências`, …); accept either when parsing catalogs.

**Affected files:** `domain-review/SKILL.md`, `domain-review/REPORT.md`. Optional: clarify in `specs/domains/index.md.example` if it documents headings (only if present/needed).

**Checks:** No PT instructional tokens in skill/report; alias note present; do not rewrite consumer domain content.

### Step 5 — Installer seeds (AC6) — CLI create-if-missing

**Action**
1. In `bin/cli.js` (alongside existing `ensureSharedConsumerArtifacts` pattern / install completion):
   - If root `.cursorrules` missing → write minimal pointer to `AGENTS.md` (single entry).
   - If root `CHANGELOG.md` missing → write stub compatible with `changelog` skill template.
   - If either exists → skip (log note); never overwrite.
2. Document in CLI help / README install notes (human) and/or `shared/setup.md` (agent).
3. Add assertions in `test/test-install.js` (create once; second install preserves content).

**Affected files:** `bin/cli.js`, optionally `README.md`, `shared/setup.md`, `test/test-install.js`.

**Checks:** Fresh consumer/test install gets seeds; update preserves existing; no clobber.

### Step 6 — Verification (AC7)

**Action**
1. Grep guards: retired invoke/dispatch refs, PT tokens in domain-review, STEP-DISPATCH present, External Dependencies reachable from packaged index.
2. Load `check-harness` Phases 0–5c on touched paths.
3. `npm run tests -- --local` (CLI/tests touched).
4. If layer routing tables changed: `node bin/build-site.js` (only if required; avoid drive-by version bump dirtiness — commit version bump with ship if script increments).

**Affected files:** none beyond verification outputs.

**Checks:** AC1–AC6 evidence listed in PR/result; harness criticals clear for touched paths.

---

## 4. Permissions, Tenancy & i18n

**N/A** for product RBAC/tenancy (no app surface).

**Portability / language instead**
- Skill content: en-us.
- Consumer domain catalog: PT heading aliases allowed (documented).
- Installer seeds: English stubs only.
- Do not invent consumer i18n keys or locale paths.

---

## 5. Test Coverage

| AC | Verification / “test” |
|----|------------------------|
| AC1 | Manual/read: packaged `.agents/AGENTS.md` + `setup.md` (or embedded section) resolve External Dependencies without consumer root section; root hub still has `#external-dependencies`. |
| AC2 | Read Active rules section; grep for stack-specific rule filenames → 0. |
| AC3 | File exists `STEP-DISPATCH.md`; `SKILL.md` links it; step table not duplicated at full length in SKILL. |
| AC4 | Invoke/dispatch greps clean for retired id and `/step-10` skill command; allow artifact `step-10-{slug}.report.md` and check-harness forbidden-examples. |
| AC5 | `rg` PT tokens in `domain-review/` instructional prose → 0; alias note present. |
| AC6 | Install dry-run under `test/`: missing seeds created; existing content unchanged on update. |
| AC7 | check-harness 0–5c; `npm run tests -- --local`. |

No backend unit / frontend component tests (stack has none).

---

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep12` — do not commit `.cursor/plans/` mid-pipeline.
- Skills portable: no org/repo/solution/API host hardcoding.
- Packaged skills overwritten on update; consumer-owned `shared/config.json`, `stack.md`, `MEMORY.md`, `memory/*` never overwritten by seeds for AC6.
- Exact prefixed skill folder ids only (`10-update-plan-implementation`, never `step-10-update-plan-implementation` as an invoke/dispatch id).
- en-us in skill bodies; progressive disclosure (link, do not paste senior-developer checklist).
- Do not treat README as skill router; keep AGENTS.md vs README audience split.

---

## 7. Pre-PR Checklist

- [x] External Dependencies portable for fresh consumer install (AC1).
- [x] Packaged Active rules = ask-question-gates + disclosure note (AC2).
- [x] `STEP-DISPATCH.md` shipped; SKILL.md pointer only (AC3).
- [x] No retired/unprefixed invoke for `10-update-plan-implementation` (AC4).
- [x] domain-review instructional PT tokens removed; consumer alias note (AC5).
- [x] CLI seeds implemented without clobber; tests cover create-once (AC6).
- [ ] check-harness (+ local install tests) green (AC7).
- [x] No product/app source invent; no consumer-specific paths.
- [x] Site rebuild only if catalog/routing changed.

---

## 8. Open Questions

None. Interview round 0 closed with defaults; `shared_understanding: confirmed`.

---

## Interview registry

| id | class | section | gap | recommendation | status | resolution | dependsOn |
|----|-------|---------|-----|----------------|--------|------------|-----------|
| G-AC1 | non-blocking | §1/§3.1 | External deps thin; packaged notes dead-end to root | Enrich root + portable section in `.agents/AGENTS.md` and/or `setup.md` + Code review proof pointer | resolved | Re-verified: root § exists without proof; packaged `.agents/AGENTS.md` only links root; `setup.md` has no External Dependencies. Plan Steps 1–2 stay. | |
| G-AC2 | non-blocking | §3.2 | Active rules list looks exhaustive | Progressive-disclosure note only | resolved | Confirmed: table = ask-question-gates only, no disclosure note. | |
| G-AC3 | non-blocking | §3.3 | STEP-DISPATCH missing | Extract from SKILL.md like ARTIFACTS.md | resolved | Glob 0 `STEP-DISPATCH.md`; ARTIFACTS.md progressive-load pattern confirmed. | |
| G-AC4 | non-blocking | §3.3 | Retired id in orch + skill invoke | Fix orch post-workflow line + `10-update-plan-implementation` `/step-10` invoke; keep check-harness forbidden-examples | resolved | Present at `spec-to-pr/SKILL.md` L830 and `10-update-plan-implementation/SKILL.md` L20. AC4 scope clarified. | |
| G-AC5 | non-blocking | §3.4 | PT instructional tokens in domain-review | Map to en-us + consumer alias note | resolved | Tokens present in SKILL.md / REPORT.md as planned. | |
| G-AC6 | non-blocking | §3.5 / §8 | AC6 CLI vs docs-only | **CLI create-if-missing** (recommended) | resolved | softSkipEligible + plan recommendation + MEMORY seed pattern (`ensureSharedConsumerArtifacts`). Locked. | |
| G-PORT | non-blocking | §0/§6 | Consumer MEMORY/config leak risk on seeds | Never overwrite; do not ship hub MEMORY/config | resolved | MEMORY.md traps 2026-07-17; AC6 seeds are root stubs only, create-if-missing. | |
