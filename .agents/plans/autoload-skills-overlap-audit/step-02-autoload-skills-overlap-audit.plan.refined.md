---
slug: autoload-skills-overlap-audit
title: "Overlap audit and simplification of autoload utility skills"
status: "plan refined ok"
---

## 0. Summary & Business Rules

Audit the five Always-applied utility skills (`ws-senior-developer`, `ws-self-learning`, `ws-changelog`, `ws-fable-method`, `ws-tdah`) for overlapping instructions, duplicated responsibility, and conflicts when loaded together via `{sharedDir}/autoload.md`. Produce evidence-backed recommendations (Keep / Thin / Merge / Demote), then apply approved surgical skill/hub edits so everyday and orch workflows face fewer competing gates without losing MEMORY vs CHANGELOG, delivery proof, fable loop, or reply-shape ownership.

**Business rules**

- Prefer thin + cross-link over merge unless >50% shared agent-facing obligations and no distinct artifact remains.
- Do not redesign orch FSM beyond one-line hub notes if a merge lands.
- Autoload membership wiring remains owned by `shared-autoload-md` (recommend-only here for configure-project); this US may still edit Always-applied rows when AC6 requires hub alignment after Thin/Demote.
- en-us; portable paths/tokens; no host product names.

## 1. Definition of Ready & Scope

**Ready when**

- Spec registered: `{us-dir}/step-00-autoload-skills-overlap-audit.spec.md`
- Classifier: `finalPipeline: standard`; complexity: `standard`
- Related context: `.agents/specs/shared-autoload-md.spec.md`, `{sharedDir}/autoload.md`
- Mode: `autoMode` + `fullMode` (gates auto index 0)

**In scope**

- Read five `SKILL.md` (+ short refs only if needed for evidence)
- Write `{plansDir}/autoload-skills-overlap-audit/overlap-matrix.md` and `recommendations.md`
- Apply Thin/cross-link (default) under `.agents/skills/ws-*` and hub precedence text
- Re-run `ws-check-harness` Phase 5b/5c (or equivalent) on the set
- Merge only if matrix proves >50% overlap and no distinct artifact — otherwise **report-only** for Merge (no skill id retirement in this PR)

**Out of scope**

- Implementing `ws-configure-project --section autoload` / root AGENTS generation (`shared-autoload-md` open ACs)
- Rewriting `ws-karpathy-guidelines` (note-only unless Critical conflict)
- Removing MEMORY/CHANGELOG consumer semantics
- Inventing a sixth mega-skill without matrix evidence

**ACs (measurable)** — unchanged from step-01; see spec AC1–AC9.

## 2. Technical Design & Architecture

Unchanged from step-01. Target ownership end-state:

- MEMORY write/compile → `ws-self-learning` only
- CHANGELOG append → `ws-changelog` only
- Code review proof checklist → `ws-senior-developer` only
- 7-step loop → `ws-fable-method` only
- Reply-shape → `ws-tdah` only

## 3. Step-by-Step Plan

### Step A — Evidence harvest (skills-sot read-only)

- Read each of the five `SKILL.md` fully; note Done-when / completion gates / opt-outs.
- Skim hub precedence in `ws-shared/AGENTS.md` + `autoload.md` Always-applied.
- Grep for MEMORY, CHANGELOG, user-gate, surgical, verify, plan, proof.

### Step B — Build audit artifacts

- Write `{us-dir}/overlap-matrix.md` and `{us-dir}/recommendations.md` (AC1–AC4, AC8 draft).

### Step C — Recommendation gate

- **autoMode:** auto-accept Recommended = Thin + cross-link for all clusters; Merge = report-only unless matrix proves >50% and zero distinct artifacts; Demote proposals may update `autoload.md` Always-applied when AC6 needs it.

### Step D — Apply approved surgical edits

- Thin/cross-link skill bodies; update hub precedence / `autoload.md` as needed.
- Skip Merge/retirement path unless Step C exception fires.

### Step E — Verify harness + simplification proof

- `ws-check-harness` Phases 5b/5c + Phase 2 on touched hubs; `npm run test` only if graph/integrity changed.

### Step F — Delivery (fullMode)

- Step 8: commit plan+result, create PR (`shipAction: create-pr`).

## 4. Permissions, Tenancy & i18n

N/A.

## 5. Test Coverage

Unchanged from step-01 AC verification table.

## 6. Invariants (Do Not Violate)

Unchanged from step-01 (`commitPlanFilesOnlyAtStep8`, portability, harness-neutral, launcher rules, preserve consumer hub data).

## 7. Pre-PR Checklist

Unchanged from step-01.

## 8. Open Questions

All resolved (autoMode model-inferred / project evidence):

| # | Resolution | Source |
|---|------------|--------|
| 1 | Default bias = **Thin + cross-link** for all clusters | project: spec Notes + step-01 Recommended |
| 2 | Demote may be **recommended and applied to Always-applied** when AC6 requires hub alignment; configure-project root AGENTS stays `shared-autoload-md` | project: this spec AC6 + shared-autoload non-goals |
| 3 | **Merge = report-only** this PR unless matrix proves >50% and no distinct artifact | project: spec Prefer thin + Open Q3 default |
| 4 | **Karpathy = note-only** unless Critical conflict with the five | project: spec Non-goals / tension seeds |

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|--------|------------|------------------|----------|
| G1 | blocking | 8 | Default Thin vs case-by-case | closed | Thin + cross-link default for all clusters | project | spec Notes L74; plan §0 |
| G2 | blocking | 8 | Demote Always-applied vs defer | closed | Demote may update autoload Always-applied for AC6; configure-project root AGENTS deferred | project | AC6; shared-autoload-md non-goals |
| G3 | blocking | 8 | Merge in this PR? | closed | Report-only unless >50% + no distinct artifact | project | spec Prefer thin; Open Q3 |
| G4 | non-blocking | 8 | Karpathy scope | closed | Note-only unless Critical | project | spec Non-goals |
| G5 | non-blocking | 0 | Mode | closed | autoMode + fullMode enabled mid-run | assumed-default | user: set mode to auto full |

**shared_understanding:** confirmed (autoMode End refinement and advance)
