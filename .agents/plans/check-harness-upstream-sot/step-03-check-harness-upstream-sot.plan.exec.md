# Execution Plan — DAG Tasks

**Slug:** `check-harness-upstream-sot`  
**Source plan:** `.agents/plans/check-harness-upstream-sot/step-02-check-harness-upstream-sot.plan.refined.md`  
**execMode:** `parallel`  
**targetModel:** `coder`

## Size detection

| Metric | Count | Threshold (`dagThresholds`) | Within? |
|--------|-------|-----------------------------|---------|
| Implementation steps (A–G mandatory) | 7 | `maxImplementationSteps` ≤ 3 | ❌ |
| Expected files | 3 | `maxExpectedFiles` ≤ 6 | ✅ |
| Layers | 1 (`skills-sot`) | `maxLayers` ≤ 2 | ✅ |

**Decision:** `execMode: parallel` (steps exceed threshold).  
**Consolidation:** Plan Steps A–G mapped into **3** file-isolated tasks (≤6). Step H (optional dogfood sync / eval) is **out of mandatory DAG**.

## Levels

| Level | Tasks | Notes |
|-------|-------|-------|
| 0 | T1, T2, T3 | Parallel: no shared files |
| — | (done) | Portability (Step F) folded into each task |

## Tasks

### T1 — SKILL.md Install mode + scan root + DoD

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `src/skills/ws-check-harness/SKILL.md`
- **Plan steps:** A (SKILL), E (SKILL integrity blurb), G (DoD / AC10), F (local hygiene)
- **ACs:** AC1, AC2, AC5, AC6, AC8, AC9, AC10
- **Acceptance:**
  - Hub resolution / Mixed Install table uses **Install mode** `upstream` | `consumer` and documents **Skills scan root**.
  - Upstream requires package markers **and** SoT (`src/skills/ws-*/SKILL.md`); markers without SoT ⇒ consumer for skills inventory.
  - Upstream scan root = `src/skills`; consumer = `{skillsRoot}` / `{globalSkillsRoot}`; consumer ignores stray `src/skills`.
  - Integrity blurb remains upstream-only (hashed SoT / installer inputs); consumers skip.
  - DoD / verification note states AC10 Install mode + scan-root pairs.
  - en-us; no absolute author paths; no host product names; no retired `shared/` hub paths.
- **coderPrompt:** Edit only `src/skills/ws-check-harness/SKILL.md`. Expand Hub resolution & Mixed Install Support so Install mode drives Skills scan root per refined plan §2 detection algorithm (markers + SoT ⇒ upstream/`src/skills`; else consumer/`{skillsRoot}`+global; markers−SoT ⇒ hard consumer + optional info note). Keep path tokens from `{sharedDir}/config.json`. Clarify integrity remains upstream-only. Add a short DoD/verification checklist using **Install mode** terminology (AC10). Do not edit dogfood under `.agents/skills`. Do not rename execution Mode. Surgical docs-only change.

### T2 — PHASES.md Phase 0 / scan scope / Phase 4

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `src/skills/ws-check-harness/PHASES.md`
- **Plan steps:** A (PHASES), B, C, E (Phase 3 item 7 if needed), G (verification note), F (local hygiene)
- **ACs:** AC1, AC2, AC3, AC4, AC5, AC6, AC8, AC9, AC10
- **Acceptance:**
  - Phase 0 table mirrors Install mode + Skills scan root + SoT evidence; markers−SoT ⇒ consumer (hard).
  - Phase 0 procedure resolves install mode, primary hub, **and** skills scan root with evidence notes.
  - §3 / §3b inventory is mode-aware (upstream `src/skills` / `src/skills/ws-*`; consumer `{skillsRoot}` / global).
  - Upstream dogfood lag under `.agents/skills` is informational only (not critical/warning inventory inflation).
  - Phase 4a find examples and Phase 4b dep↔disk paths are mode-parameterized; unrouted/phantom use skills scan root only.
  - Phase 3 item 7 stays upstream-only vs hashed SoT; consumer skip.
  - Optional AC10 verification note uses Install mode terminology.
  - No prose claiming `.agents/skills` is always the upstream disk SoT; en-us; portable paths only.
- **coderPrompt:** Edit only `src/skills/ws-check-harness/PHASES.md`. Implement refined plan Steps A–C (and E/G as needed): Phase 0 detection table + procedure; rewrite §3 Skills / §3b expected folders for mode-aware skills scan root; add upstream dogfood lag policy (AC4); parameterize Phase 4a/4b (and nearby Phase 2 / §3b shell examples) so upstream uses `src/skills` and consumer uses `{skillsRoot}` / `.agents/skills`. Preserve hub-literal `.agents/skills/...` only where install-path tables intentionally cite them. Confirm Phase 3 item 7 integrity wording. Optional short verification (mode) note for AC10. Docs-only; no product code; no dogfood mirror edits.

### T3 — REPORT-FORMAT.md header fields

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `src/skills/ws-check-harness/REPORT-FORMAT.md`
- **Plan steps:** D, F (local hygiene)
- **ACs:** AC7, AC9
- **Acceptance:**
  - Header keeps `**Mode:** [normal | dry-run]`.
  - Adds `**Install mode:** [upstream | consumer]` and `**Skills scan root:** […]`.
  - Execution vs install concepts stay unambiguous in nearby prose.
  - en-us; no absolute author-machine paths.
- **coderPrompt:** Edit only `src/skills/ws-check-harness/REPORT-FORMAT.md`. In the harness audit header, keep existing `Mode` (normal|dry-run). Add Install mode and Skills scan root fields beside it per refined plan §2 normative header. Do not rename `Mode`. Clarify install vs execution mode if nearby prose could confuse. Docs-only surgical edit.

## Out of DAG (optional / not DoD)

| Item | Reason |
|------|--------|
| Step H — `npm run sync-skills` dogfood mirror | Optional; lag not AC4/DoD failure |
| Step H — `evals/evals.json` assertion | Optional suggestion only |

## Handoff

Artifacts for `ws-implement-tasks`:

- `.agents/plans/check-harness-upstream-sot/step-03-check-harness-upstream-sot.plan.exec.md`
- `.agents/plans/check-harness-upstream-sot/step-03-check-harness-upstream-sot.exec.dag.json`
