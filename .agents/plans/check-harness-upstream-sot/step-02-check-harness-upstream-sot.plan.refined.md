---
slug: check-harness-upstream-sot
title: "ws-check-harness: SoT-aware upstream vs consumer skills scan root"
status: "plan refined ok"
refinedFrom: step-01-check-harness-upstream-sot.plan.md
refinedAt: "2026-08-08T02:15:00Z"
shared_understanding: confirmed
---

## 0. Summary & Business Rules

**Objective:** Update `ws-check-harness` so Phase 0 install-mode detection also selects the **skills inventory root** used by Phases 1–5c (especially Phase 4 disk discovery and § 3b folder checks). Upstream authoring trees must audit **`src/skills`** (the only skill-content SoT). Consumer trees keep scanning `{skillsRoot}` / `{globalSkillsRoot}`.

**Refinement decisions (autoMode orch-approved defaults):**

1. **Report fields:** Keep existing `Mode: normal | dry-run`. Add separate fields `Install mode: upstream | consumer` and `Skills scan root: …`. Do not rename `Mode`.
2. **Markers without SoT:** Package markers (`bin/skill-dependencies.json` + `.agents/AGENTS.md`) without `src/skills` SoT ⇒ hard **`Install mode: consumer`** for skills inventory. Optional one-line informational hub note only (markers present, SoT absent).
3. **Dogfood sync:** Implementation edits **SoT only** (`src/skills/ws-check-harness/`). Optional note that maintainers may run `npm run sync-skills` for local dogfood; dogfood lag is **not** a mandatory AC / DoD failure (AC4).
4. **evals/evals.json:** Optional suggestion only; not required for Definition of Done.

**Business rules:**

1. **Install mode drives scan root** — `Install mode: upstream` ⇒ skills scan root = `src/skills`. `Install mode: consumer` ⇒ skills scan root = `{skillsRoot}` (+ `{globalSkillsRoot}` with local-override rules). Hub resolution (root `AGENTS.md` vs `{sharedDir}/AGENTS.md`) stays aligned with install mode but is not sufficient alone for skills SoT. Execution `Mode` (`normal | dry-run`) is orthogonal.
2. **Mechanical upstream gate** — Upstream requires **all** of: existing package markers (`bin/skill-dependencies.json` + packaged `.agents/AGENTS.md`) **and** evidence of SoT (`src/skills/ws-*/SKILL.md` exists for at least one skill). Markers without SoT ⇒ **consumer** for skills inventory (hard rule); optional informational note only.
3. **Dogfood is not SoT** — In upstream install mode, missing/divergent `.agents/skills/ws-*` copies must **not** inflate critical/warning problem counts for inventory/phantom/unrouted diffs. Optional informational note that dogfood may lag SoT is allowed unless the user explicitly requests a dogfood-sync audit.
4. **Consumer ignores stray `src/skills`** — Even if a consumer tree has a folder named `src/skills`, do not scan it for Phase 4 inventory when install mode is consumer.
5. **Integrity unchanged** — Phase 3 item 7 remains upstream-only against hashed package SoT / installer inputs; consumers still skip / do not require `bin/skill-integrity.json`.
6. **Portability** — en-us only; no IDE/host product names; no absolute author-machine paths in skill prose; path tokens still load from project `{sharedDir}/config.json` when present.

**Security / hygiene mitigations:** No secrets or credentials in skill docs. Do not invent integrity digests. Prefer relative repo paths and brace tokens (`{skillsRoot}`, `{sharedDir}`, `{globalSkillsRoot}`).

**Stack context:** `node-skills-package` — documentation/contract change under layer `skills-sot` (`src/skills/ws-check-harness`). No DB, no frontend, no API. MEMORY: keep `ws-shared` paths (not retired `shared/`).

## 1. Definition of Ready & Scope

### Resolved assumptions

- Authoritative edits land in **`src/skills/ws-check-harness/`** (`SKILL.md`, `PHASES.md`, `REPORT-FORMAT.md`). Dogfood under `.agents/skills/ws-check-harness/` is **not** a second SoT; sync via `npm run sync-skills` is optional post-edit and not an AC failure if lagging (AC4).
- Existing Phase 0 already distinguishes Upstream vs Consumer for **hubs**; this work extends that table with an explicit **skills scan root** and tightens upstream detection with SoT evidence (AC2).
- `{skillsRoot}` token default remains `.agents/skills` (install contract). Upstream install mode **overrides inventory scan target** to `src/skills` without relocating the install-layout token meaning for consumers.
- `evals/evals.json` may gain a focused assertion if cheap; **not** required for AC satisfaction or DoD (dry-run checklist covers AC10).
- Spec AC7 wording (`Mode: upstream | consumer`) is satisfied by the new **`Install mode`** field; execution `Mode` stays `normal | dry-run` (OQ1).
- Complexity: **standard**; `workflowType: standard`; language: **en-us**.

### Acceptance Criteria (measurable)

| AC | Statement (from spec) | Plan coverage | Refined note |
|----|----------------------|---------------|--------------|
| AC1 | Phase 0 documents deterministic detection table with ≥2 modes: `upstream`, `consumer` | §3 Step A | Modes = **Install mode** values |
| AC2 | Upstream requires SoT under `src/skills/` (≥1 `ws-*/SKILL.md`) **and** existing package markers; absence of SoT must not select upstream skills-scan-root | §3 Step A | Markers−SoT ⇒ hard consumer |
| AC3 | Upstream Phase 4 / § 3b / hub↔disk use `src/skills` | §3 Steps B–C | |
| AC4 | Upstream must not treat dogfood lag as primary unrouted/phantom SoT; optional info only | §3 Steps B–C, H | Sync not mandatory for DoD |
| AC5 | Consumer Phase 4 scans `{skillsRoot}` / `{globalSkillsRoot}`; ignores `src/skills` | §3 Steps A–C | |
| AC6 | `SKILL.md` Hub resolution + `PHASES.md` Phase 0 / Phase 4 prose updated for mode-aware scan | §3 Steps A–C | |
| AC7 | Report records install mode + explicit skills scan root | §3 Step D | Fields: `Install mode` + `Skills scan root`; keep `Mode` = normal\|dry-run |
| AC8 | Integrity (Phase 3 item 7) remains upstream-only vs hashed SoT | §3 Step E | |
| AC9 | en-us; harness-neutral; no absolute author paths | §3 Step F + invariants | |
| AC10 | Dry-run narrative: upstream root → install mode upstream + `src/skills`; consumer → consumer + `.agents/skills` / global | §3 Step G + §5 | Say **Install mode** in checklist text |

### In scope

- `src/skills/ws-check-harness/SKILL.md` — Hub resolution / Mixed Install; path-token notes clarifying inventory override in upstream install mode.
- `src/skills/ws-check-harness/PHASES.md` — Phase 0 detection; § Scan scope §3 / §3b; Phase 4 `find` examples and dependency↔disk closure paths; any Phase 1/2 example greps that hardcode `.agents/skills` as **the** inventory root when mode-aware wording is needed.
- `src/skills/ws-check-harness/REPORT-FORMAT.md` — Phase 6 header: keep `Mode` (execution); add `Install mode` + `Skills scan root`.

### Out of scope

- Installer layout changes; forcing consumers to adopt `src/skills`.
- Auto-syncing `.agents/skills` ↔ `src/skills` as a harness correction.
- Mandatory dogfood mirror update in the same PR (optional `npm run sync-skills` note only).
- Mandatory `evals/evals.json` assertion.
- Product feature work outside harness audit docs/contracts.
- Changing integrity hash algorithms or `bin/generate-skill-integrity.js` behavior (only preserve upstream-only gate wording).

## 2. Technical Design & Architecture

### Layer edits (from `config.json` → `stack.backend.layers`)

| Layer | Path | Change |
|-------|------|--------|
| **skills-sot** | `src/skills/ws-check-harness/` | Contract/docs: install mode + skills scan root; Phase 4 inventory; report header |
| **installer-cli** | `bin/` | **No code change** (integrity remains upstream-only; no new CLI flags) |
| **tests** | `test/` | **No mandatory new automated suite**; verification via dry-run checklist / manual harness narrative (AC10). Optional light eval update only (not DoD). |

**Frontend / DB / API / i18n:** none.

### Detection algorithm (Phase 0 — normative)

```
inputs: cwd = repo root under audit
markers_upstream_pkg =
  exists(bin/skill-dependencies.json) AND exists(.agents/AGENTS.md)
sot_present =
  exists at least one path matching src/skills/ws-*/SKILL.md

if markers_upstream_pkg AND sot_present:
  installMode = upstream
  skillsScanRoot = src/skills   # primary inventory tree (relative)
  primaryHub = AGENTS.md (+ dual-hub drift vs .agents/AGENTS.md)
  integrityGate = required (Phase 3 item 7)
else:
  installMode = consumer
  skillsScanRoot = {skillsRoot}  # + optional {globalSkillsRoot} hybrid
  primaryHub = {sharedDir}/AGENTS.md (existing consumer rules)
  integrityGate = skip / not required
  # Do not invent skills from src/skills even if folder exists
  # If markers_upstream_pkg AND NOT sot_present:
  #   optional one-line informational note only (not a problem-count item)
```

**Notes:**

- Consumer may further annotate project-local vs global/mixed install **without** changing SoT-root semantics (AC1).
- Record evidence bullets in Phase 0 notes: which markers matched/failed, whether SoT was present, resolved `skillsScanRoot`, resolved `installMode`.
- Path token map still loads from project `{sharedDir}/config.json` when present (AC6). Upstream install mode does **not** redefine `{skillsRoot}` for install layout; it sets a separate audit field **skills scan root**.

### Skills inventory (Phase 4 / § 3)

| Install mode | Discover `SKILL.md` under | § 3b expected folders | Dep-graph ↔ disk (when `bin/skill-dependencies.json` present) |
|--------------|---------------------------|----------------------|---------------------------------------------------------------|
| upstream | `src/skills` | `src/skills/ws-*` | folder ids must exist under `src/skills/` |
| consumer | `{skillsRoot}` (+ `{globalSkillsRoot}` with local override) | under `{skillsRoot}` | existing consumer paths (`.agents/skills/` literals OK for hub tables) |

**Dogfood policy (upstream):** After inventory from `src/skills`, do **not** add unrouted/phantom items solely because `.agents/skills/ws-*` is missing or differs. Optional one-line informational: “Dogfood under `{skillsRoot}` may lag SoT; not counted unless dogfood-sync audit requested.”

### Report header (Phase 6) — normative (OQ1 resolved)

Two distinct concepts in `REPORT-FORMAT.md`:

1. **Execution mode** (existing field name `Mode`): `normal | dry-run`.
2. **Install / inventory mode** (new): `Install mode: upstream | consumer` + **Skills scan root:** e.g. `src/skills` or `.agents/skills` (+ hybrid global note).

Normative header lines:

```markdown
**Mode:** [normal | dry-run]
**Install mode:** [upstream | consumer]
**Skills scan root:** [src/skills | .agents/skills (+ global …)]
**Path token map:** `{skillsRoot}=…` …
```

Do **not** rename `Mode`. Spec AC7 is satisfied by `Install mode` + `Skills scan root`.

### Evidence (current tree)

- `REPORT-FORMAT.md` L17 already has `**Mode:** [normal | dry-run]` — confirms rename would churn; add fields beside it.
- `PHASES.md` §3 / Phase 4a still hardcode `.agents/skills` as inventory SoT — Steps B–C must mode-parameterize.
- `package.json` defines `"sync-skills": "node scripts/sync-skills.js"` — available for optional dogfood, not mandatory DoD.

### Invariant checks (`config.json.invariants`)

- `commitPlanFilesOnlyAtStep8: true` — do not commit plan artifacts in Steps 1–7.
- EF/tenancy keys false — N/A.
- Portability / en-us / harness neutrality from root `AGENTS.md` and `.agents/AGENTS.md` Rules for skills.

## 3. Step-by-Step Plan

Ordered by dependency. Each step lists actions, files, and engineering checks. **Do not implement product behavior outside these docs/contracts.**

### Step A — Phase 0 detection table + skills scan root contract

**Actions:**

1. In `SKILL.md` § Hub resolution & Mixed Install Support, expand the mode table to include **Skills scan root** and SoT evidence requirement (AC1, AC2, AC5, AC6). Prefer column/label **Install mode** (`upstream` | `consumer`) to avoid collision with execution `Mode`.
2. In `PHASES.md` § Hub resolution details (Phase 0), mirror the same table with “first match / required evidence” wording; state that absence of `src/skills` SoT must **not** select upstream skills-scan-root even if `bin/skill-dependencies.json` + `.agents/AGENTS.md` exist — fall through to **consumer** (hard) with optional informational note (AC2, OQ2).
3. Update Phase 0 procedure step 3 to: resolve install mode, primary hub, **and** skills scan root; record evidence in Phase 0 notes.

**Files:** `src/skills/ws-check-harness/SKILL.md`, `src/skills/ws-check-harness/PHASES.md`

**Checks:** Table has exactly the install modes `upstream` | `consumer`; detection is mechanical; no absolute paths; en-us.

### Step B — Scan scope §3 / §3b mode-aware inventory

**Actions:**

1. Rewrite `PHASES.md` § Scan scope **§3 Skills** so inventory is described as mode-aware: upstream → `src/skills`; consumer → `{skillsRoot}` / `{globalSkillsRoot}` (AC3, AC5, AC6).
2. Clarify § 3b: when pipeline skills are present, expected folders are checked under the **skills scan root** (upstream: `src/skills/ws-*`, not `.agents/skills/ws-*`) (AC3).
3. Add dogfood lag policy under upstream (AC4).

**Files:** `src/skills/ws-check-harness/PHASES.md`

**Checks:** No remaining prose claiming `.agents/skills` is always “the” disk SoT for upstream audits.

### Step C — Phase 4 discovery commands & hub↔disk / dep closure

**Actions:**

1. Update Phase 4a example `find` commands to be mode-parameterized (e.g. `find src/skills …` when upstream; `find .agents/skills …` / `{skillsRoot}` when consumer) (AC3, AC5).
2. Update Phase 4b row for `bin/skill-dependencies.json`: upstream folder ids must exist under `src/skills/`; consumer under `{skillsRoot}` (AC3, AC5).
3. Align nearby Phase 2 / § 3b shell examples that currently hardcode `ls -d .agents/skills/ws-…` so upstream audits use `src/skills/ws-…` (or show both with an install-mode comment) (AC3, AC6).
4. Ensure unrouted/phantom diffs use inventory from skills scan root only (AC4).

**Files:** `src/skills/ws-check-harness/PHASES.md`

**Checks:** Grep skill body for hardcoded inventory-only `.agents/skills` in Phase 4 normative steps; remaining consumer/hub-literal mentions are intentional (hub routing tables may still cite `.agents/skills/...` for install paths).

### Step D — Report format header

**Actions:**

1. Update `REPORT-FORMAT.md` harness audit header: keep `**Mode:** [normal | dry-run]`; add `**Install mode:** [upstream | consumer]` and `**Skills scan root:** […]` (AC7, OQ1).
2. Keep execution vs install concepts unambiguous in any nearby prose.

**Files:** `src/skills/ws-check-harness/REPORT-FORMAT.md`

**Checks:** Template shows all three fields; en-us; no machine-absolute paths.

### Step E — Preserve integrity upstream-only

**Actions:**

1. Re-read Phase 3 item 7 and `SKILL.md` integrity blurb; adjust only if wording implies consumer integrity or wrong scan root — must remain upstream-only validating hashed SoT / installer inputs (AC8).
2. Confirm consumer install mode still skips / does not require `bin/skill-integrity.json`.

**Files:** `src/skills/ws-check-harness/SKILL.md`, `PHASES.md` (touch only if clarification needed)

**Checks:** No new consumer obligation for integrity.

### Step F — Portability / language / authoring hygiene

**Actions:**

1. Pass portability pass: no IDE product names; no `C:\…` / `/Users/…` in skill contract (AC9).
2. Keep brace tokens for relocatable concepts; use relative `src/skills` for upstream SoT (repo-root-relative, not absolute).
3. Apply MEMORY: do not reintroduce retired `shared/` hub folder paths.

**Files:** all three SoT files after edits

**Checks:** Quick grep for absolute paths / PT-BR / host brands in the three files.

### Step G — Definition of Done dry-run narrative (AC10)

**Actions:**

1. Add a short DoD / verification checklist (in `SKILL.md` Definition of Done **or** as a “Verification (mode)” note in `PHASES.md` Phase 0) stating:
   - At upstream package root → report `Install mode: upstream` + skills scan root `src/skills`.
   - In a consumer tree with only `{skillsRoot}` / global install → `Install mode: consumer` + scan root under `.agents/skills` and/or `{globalSkillsRoot}`.
2. Implementers later execute `/ws-check-harness` (or dry-run) on this repo to confirm SoT inventory (including skills present only under `src/skills`).

**Files:** `SKILL.md` and/or `PHASES.md`

**Checks:** Checklist text maps 1:1 to AC10 using **Install mode** terminology.

### Step H — Optional dogfood sync + eval (non-mandatory)

**Actions:**

1. **SoT-only edits** satisfy mandatory scope. After SoT is correct, maintainers **may** run `npm run sync-skills` for local dogfood; lagging dogfood is **not** an AC4 / DoD failure (OQ3).
2. Optionally add one eval assertion that Phase 0 selects `src/skills` when upstream markers + SoT are present — suggestion only, not DoD (OQ4).

**Files:** dogfood mirror (optional); `evals/evals.json` (optional)

**Checks:** SoT remains authoritative; dogfood is copy only; neither blocks claim-complete for this feature.

## 4. Permissions, Tenancy & i18n

| Area | Applicability |
|------|----------------|
| RBAC / permissions | N/A — documentation skill; no auth surfaces |
| Tenancy / data leakage | N/A — `domain.tenancyField` empty |
| i18n | N/A — frontend i18n none; skill language fixed **en-us** |
| Config secrets | Do not embed tokens/PATs; integrity commands stay as existing npm/node recipes |

## 5. Test Coverage

Map each AC to concrete verification cases (manual harness dry-run / checklist unless noted). Method names are checklist IDs for Step 5 / Step 7.

| AC | Test case ID | Method / procedure | Pass criteria |
|----|--------------|--------------------|---------------|
| AC1 | `T_AC1_mode_table` | Inspect Phase 0 tables in `SKILL.md` + `PHASES.md` | Table documents install modes `upstream` and `consumer` with deterministic detection |
| AC2 | `T_AC2_sot_required` | Review detection prose; apply “markers without `src/skills/ws-*/SKILL.md`” | Install mode consumer; skills-scan-root **not** `src/skills`; optional info note OK |
| AC3 | `T_AC3_upstream_inventory` | Review Phase 4a / §3 / §3b; dry-run audit at package root | Inventory / folder checks target `src/skills`; hub↔disk uses `src/skills/ws-*` |
| AC4 | `T_AC4_dogfood_not_counted` | Review upstream dogfood policy; simulate missing `.agents/skills/ws-foo` while SoT has it | No critical/warning inventory inflation; info note allowed; sync not required |
| AC5 | `T_AC5_consumer_scan` | Review consumer prose; confirm `src/skills` ignored in consumer mode | Phase 4 uses `{skillsRoot}` / `{globalSkillsRoot}` only |
| AC6 | `T_AC6_docs_aligned` | Diff Hub resolution + Phase 0/4 sections vs behavior | Docs describe mode-aware expand/scan; path tokens still from `{sharedDir}/config.json` |
| AC7 | `T_AC7_report_header` | Inspect `REPORT-FORMAT.md` header template | `Mode` remains normal\|dry-run; `Install mode` + `Skills scan root` present |
| AC8 | `T_AC8_integrity_upstream_only` | Inspect Phase 3 item 7 + SKILL integrity blurb | Upstream-only; consumer skip; validates hashed SoT / installer inputs |
| AC9 | `T_AC9_portability_enus` | Grep edited files for absolute paths, host brands, non-en-us skill prose | Clean |
| AC10 | `T_AC10_dry_run_narrative` | Run checklist: (1) upstream cwd narrative (2) consumer cwd narrative | Reports match Install mode + scan root pairs in AC10 |

**Automated (optional):** `evals/evals.json` assertion — `upstream_sot_scan_root` — agent records `src/skills` when auditing this package root. **Not DoD.**

**Regression:** After implementation, live `/ws-check-harness` (or dry-run) on `workflow-skills` should list SoT skills under `src/skills` and must not treat dogfood-only gaps as primary inventory defects.

## 6. Invariants (Do Not Violate)

From `config.json.invariants` + harness rules:

1. **`commitPlanFilesOnlyAtStep8: true`** — plan files stay uncommitted until delivery Step 8.
2. **SoT authoring** — lasting skill edits only under `src/skills/ws-check-harness/`; never treat `.agents/skills` dogfood as publish SoT.
3. **No installer / consumer layout coercion** — do not require consumers to create `src/skills`.
4. **No absolute author-machine paths** in skill contracts.
5. **Harness neutrality** — no IDE/agent product coupling in skill bodies.
6. **en-us only** for skill bodies, gates, banners, report templates.
7. **Path tokens** — expand `{skillsRoot}` / `{sharedDir}` / `{plansDir}` / `{reviewsDir}` / `{globalSkillsRoot}` per `tools.md`; do not resurrect retired `shared/` folder defaults (MEMORY).
8. **Integrity** — do not invent digests; do not tell consumers `--force-integrity` is the fix for upstream drift.
9. **Surgical scope** — change only check-harness mode/scan-root contract docs; no drive-by hub rewrites or unrelated skill edits.
10. **Karpathy / senior-developer** — suggest unasked extras (eval, sync) but keep mandatory scope to AC1–AC10 SoT files; optional sync/eval are not blockers.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (`skills-sot` docs only; no unrelated `bin/` / app code).
- [x] Domain entities and mappings encapsulated — N/A (no domain model change).
- [x] Schema migrations created — N/A.
- [x] Authorization checks applied — N/A.
- [x] i18n keys declared — N/A (en-us skill prose only).
- [x] Test cases cover all ACs (AC1–AC10 mapped in §5).
- [x] Upstream detection requires SoT evidence (AC2); markers-without-SoT ⇒ consumer.
- [x] Phase 4 / §3b use `src/skills` in upstream install mode (AC3).
- [x] Dogfood lag does not inflate problem counts (AC4); sync not mandatory.
- [x] Consumer ignores `src/skills` (AC5).
- [x] Report header: `Mode` unchanged; `Install mode` + `Skills scan root` added (AC7).
- [x] Integrity remains upstream-only (AC8).
- [x] Portability / en-us pass (AC9).
- [x] Dry-run narrative / DoD covers AC10 (Install mode terminology).
- [x] evals update optional only (not DoD).
- [x] No plan commit before Step 8.

## 8. Open Questions (resolved)

| # | Question | Resolution | Basis |
|---|----------|------------|-------|
| 1 | Report field naming: add `Install mode` + `Skills scan root` beside `Mode`, or rename `Mode`? | **Keep `Mode` for normal\|dry-run; add `Install mode` + `Skills scan root`** | Orch-approved default; lowest churn vs current `REPORT-FORMAT.md` L17; AC7 satisfied via Install mode |
| 2 | Markers-without-SoT: hard consumer vs hybrid `upstream-hub`? | **Hard `Install mode: consumer` for skills inventory**; optional one-line informational hub note if package markers exist without SoT | Orch-approved; matches AC2 “must not select upstream skills-scan-root” |
| 3 | Dogfood sync mandatory in same PR? | **SoT-only edits in implementation**; optional `npm run sync-skills` for local dogfood; lag not AC/DoD failure | Orch-approved; AC4; `package.json` has `sync-skills` script |
| 4 | Eval update mandatory? | **Optional suggestion only**; not required for DoD | Orch-approved; keep diff minimal |

## Interview registry

| id | class | section | gap | status | resolution | dependsOn |
|----|-------|---------|-----|--------|------------|-----------|
| OQ1 | blocking | §8 / AC7 | Report field naming vs existing `Mode` | resolved | Keep `Mode`=normal\|dry-run; add Install mode + Skills scan root | |
| OQ2 | blocking | §8 / AC2 | Markers-without-SoT consumer vs hybrid | resolved | Hard consumer for inventory; optional info note only | |
| OQ3 | blocking | §8 / AC4 | Dogfood sync mandatory? | resolved | SoT-only mandatory; optional `npm run sync-skills`; lag not DoD fail | |
| OQ4 | non-blocking | §8 / DoD | evals.json required? | resolved | Optional suggestion only; not DoD | |
| G1 | blocking | §0 / AC7 | Spec says `Mode: upstream\|consumer` but report Mode is execution | resolved | Interpret AC7 as Install mode + Skills scan root; document in §2/§5 | OQ1 |
| G2 | blocking | §1 / AC10 | AC10 checklist said “mode: upstream”; risk of colliding with dry-run Mode | resolved | Checklist uses **Install mode** terminology | OQ1 |
| G3 | blocking | §0 BR2 | Plan allowed “hybrid notes” soft path for markers−SoT | resolved | Hardened to consumer (no upstream skills-scan-root) | OQ2 |
| G4 | non-blocking | §1 / Step H | Dogfood mirror listed “in scope if sync policy requires” | resolved | Out of mandatory scope; optional post-SoT sync note | OQ3 |
| G5 | non-blocking | §1 AC10 table | Typo `.agents.skills` in draft plan AC10 row | resolved | Corrected to `.agents/skills` in refined AC10 | |
| G6 | non-blocking | §2 evidence | PHASES.md still hardcodes `.agents/skills` inventory | resolved | Covered by Steps B–C; confirmed via codebase grep | |
| G7 | non-blocking | §2 evidence | REPORT-FORMAT.md already has Mode=normal\|dry-run | resolved | Confirms OQ1; Step D adds fields beside Mode | OQ1 |
| G8 | non-blocking | §3 Step H | Whether `npm run sync-skills` exists | resolved | Confirmed in `package.json`; cite as optional only | OQ3 |
