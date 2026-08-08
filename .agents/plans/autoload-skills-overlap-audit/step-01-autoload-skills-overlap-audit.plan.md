---
slug: autoload-skills-overlap-audit
title: "Overlap audit and simplification of autoload utility skills"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Audit the five Always-applied utility skills (`ws-senior-developer`, `ws-self-learning`, `ws-changelog`, `ws-fable-method`, `ws-tdah`) for overlapping instructions, duplicated responsibility, and conflicts when loaded together via `{sharedDir}/autoload.md`. Produce evidence-backed recommendations (Keep / Thin / Merge / Demote), then apply approved surgical skill/hub edits so everyday and orch workflows face fewer competing gates without losing MEMORY vs CHANGELOG, delivery proof, fable loop, or reply-shape ownership.

**Business rules**

- Prefer thin + cross-link over merge unless >50% shared agent-facing obligations and no distinct artifact remains.
- Do not redesign orch FSM beyond one-line hub notes if a merge lands.
- Autoload membership wiring remains owned by `shared-autoload-md` (recommend-only here).
- en-us; portable paths/tokens; no host product names.

## 1. Definition of Ready & Scope

**Ready when**

- Spec registered: `{us-dir}/step-00-autoload-skills-overlap-audit.spec.md`
- Classifier: `finalPipeline: standard`; complexity: `standard`
- Related context: `.agents/specs/shared-autoload-md.spec.md`, `{sharedDir}/autoload.md`

**In scope**

- Read five `SKILL.md` (+ short refs only if needed for evidence)
- Write `{plansDir}/autoload-skills-overlap-audit/overlap-matrix.md` and `recommendations.md`
- Apply approved thins/cross-links/merges under `.agents/skills/ws-*` and hub precedence text
- Re-run `ws-check-harness` Phase 5b/5c (or equivalent) on the set
- If merge approved: dependency graph, hubs, integrity, tests, autoload defaults

**Out of scope**

- Implementing `ws-configure-project --section autoload` / root AGENTS generation (`shared-autoload-md` open ACs)
- Rewriting `ws-karpathy-guidelines` unless a conflict blocks simplification
- Removing MEMORY/CHANGELOG consumer semantics
- Inventing a sixth mega-skill without matrix evidence

**ACs (measurable)**

| AC | Done when |
|----|-----------|
| AC1 | `overlap-matrix.md` (+ citeable evidence) exists under `{us-dir}` |
| AC2 | Duplication inventory with owner vs defer per theme |
| AC3 | Per-skill and per-cluster Keep/Thin/Merge/Demote with rationale |
| AC4 | Prioritized edit list mapped to matrix findings |
| AC5 | Post-edit: single owner for MEMORY / CHANGELOG / proof / fable loop / reply-shape |
| AC6 | Hub / `autoload.md` precedence consistent with recommendations |
| AC7 | Harness 5b/5c: no new criticals; unresolved conflicts mitigated in audit |
| AC8 | Documented workflow simplification (footprint / gates / fable-vs-senior rule) |
| AC9 | Merge path only: graph + integrity + tests + autoload updated together |

## 2. Technical Design & Architecture

**Layers touched** (from `config.json` / STACK)

| Layer | Path | Edits |
|-------|------|-------|
| skills-sot | `.agents/skills` | Five utility `SKILL.md` (+ optional short refs); possibly hub `ws-shared/AGENTS.md`, `autoload.md` |
| installer-cli | `bin` | Only if merge retires an id (`skill-dependencies.json`, integrity) |
| tests | `test/` | Only if merge / installer contract changes |

**No** DB, frontend, migrations, or app runtime.

**Architecture approach**

1. **Audit-first:** evidence matrix before any skill body edit.
2. **Gate approved recommendations** before mutating skill SoT (user-gate on Merge vs Thin clusters).
3. **Ownership invariants (target end-state):**
   - MEMORY write/compile → `ws-self-learning` only
   - CHANGELOG append → `ws-changelog` only
   - Code review proof checklist → `ws-senior-developer` only
   - 7-step loop → `ws-fable-method` only
   - Reply-shape → `ws-tdah` only
4. Cross-links replace copied rules; hub precedence documents load order.

**Seed tensions to verify (not pre-judge)**

- senior vs fable (plan/classify/verify)
- senior vs tdah (proof vs compression)
- self-learning vs changelog (completion gates)
- tdah MEMORY judgment vs self-learning protocol
- karpathy co-load (note only if blocks five-skill simplify)

## 3. Step-by-Step Plan

### Step A — Evidence harvest (skills-sot read-only)

- Read each of the five `SKILL.md` fully; note Done-when / completion gates / opt-outs.
- Optional: skim hub precedence in `ws-shared/AGENTS.md` + `autoload.md` Always-applied.
- **Files:** five skill paths under `.agents/skills/ws-{senior-developer,self-learning,changelog,fable-method,tdah}/`
- **Check:** keyword Grep for MEMORY, CHANGELOG, user-gate, surgical, verify, plan, proof.

### Step B — Build audit artifacts

- Write `{us-dir}/overlap-matrix.md`: responsibility map + pairwise matrix (`none`/`complementary`/`duplicated`/`conflict`) with ≥1 evidence cite per non-none cell.
- Write `{us-dir}/recommendations.md`: duplication inventory (owner vs defer), cluster options, prioritized edit list, workflow-impact note (orch Steps + free-text).
- **Files created:** `overlap-matrix.md`, `recommendations.md`
- **Maps:** AC1–AC4, AC8 (draft simplification claim)

### Step C — Recommendation gate (user)

- Present Keep/Thin/Merge/Demote summary; **Recommended** default = thin+cross-link unless matrix proves merge.
- Wait for user-gate before SoT edits.
- **Check:** no skill body edits before approval.

### Step D — Apply approved surgical edits

- Thin/cross-link skill bodies; update hub precedence / `autoload.md` if membership or order changes.
- If Merge approved: consolidate into survivor skill; retire id from hubs, `autoload.md`, `bin/skill-dependencies.json`; regenerate integrity; update tests.
- **Files:** approved list from recommendations (expect subset of five SKILL.md + `ws-shared/AGENTS.md` ± `autoload.md` ± `bin/*`)
- **Maps:** AC5, AC6, AC9 (conditional)

### Step E — Verify harness + simplification proof

- Run `ws-check-harness` focusing Phase 5b/5c (auto-load conflicts) + Phase 2 paths on touched hubs.
- Record mitigation for any accepted residual conflict in `recommendations.md`.
- Document AC8 proof (line footprint delta and/or single fable-vs-senior rule).
- **Commands:** harness skill / scripts as documented; `npm run test` if graph/integrity changed.
- **Maps:** AC7, AC8

### Step F — Delivery prep (orch later)

- Plan + audit artifacts committed at Step 8 with result; skill SoT commits earlier only if G2-code policy allows skill edits mid-pipeline (this repo: skill edits are product code under `.agents/skills` — commit at implement/review gates per orch, plan files at Step 8).

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, tenancy, or i18n surfaces. Skill language remains en-us only.

## 5. Test Coverage

| AC | Verification |
|----|----------------|
| AC1 | File exists; matrix has 5×5 (or upper triangle) cells; non-none cells cite skill path + quote/paraphrase |
| AC2 | Theme list; each theme has owner skill + defer skill(s) |
| AC3 | Each of five skills has Keep/Thin/Merge/Demote; each conflict cluster has recommendation |
| AC4 | Edit list entries reference matrix finding ids |
| AC5 | Grep five skills: no second skill redefines MEMORY write, CHANGELOG append, proof checklist, fable loop, or tdah shape |
| AC6 | Diff hub/`autoload.md` matches recommendations |
| AC7 | Harness report: 0 new criticals from this change; warnings mitigated or listed |
| AC8 | Short “simplification proof” section in `recommendations.md` |
| AC9 | If merge: `npm run test` + `npm run verify-integrity` exit 0; retired id absent from router/autoload |

No app unit tests; package tests only when installer/graph changes.

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8: true` — do not commit `{plansDir}/` plan/audit artifacts before Step 8 delivery (skill SoT under `.agents/skills` is implementable product content).
- Portability: no absolute paths; use `{skillsRoot}` / `{sharedDir}` / `{plansDir}` in prose.
- Harness-neutral: no IDE/agent product names in skill bodies.
- Managed skill scripts: launchers `python` / `node` / `bash` only; no silent consumer refactors.
- Do not overwrite consumer-owned `config.json` / MEMORY / STACK / CHANGELOG from this work.

## 7. Pre-PR Checklist

- [ ] Audit artifacts complete (matrix + recommendations)
- [ ] User approved recommendation set before SoT edits
- [ ] AC5 ownership invariants hold post-edit
- [ ] Hub / autoload precedence aligned
- [ ] Harness 5b/5c clean or mitigated
- [ ] AC8 simplification proof written
- [ ] If merge: deps + integrity + tests green; retired ids gone
- [ ] en-us; no host product coupling
- [ ] Related `shared-autoload-md` not accidentally expanded beyond recommend-only

## 8. Open Questions

1. **Default bias:** Confirm Recommended = Thin + cross-link for all clusters unless evidence forces Merge (yes / case-by-case)?
2. **Demote from Always-applied:** May recommendations change `autoload.md` Always-applied membership (e.g. demote `ws-fable-method` to on-demand), or membership changes deferred entirely to `shared-autoload-md` workflow?
3. **Merge candidates:** If senior↔fable or tdah↔self-learning show >50% overlap, is Merge in-scope for this PR or report-only with follow-up US?
4. **Karpathy:** Treat as out-of-scope note only unless a Critical conflict with the five — confirm?

*(Interview Step 2 expected if any remain blocking after skim.)*
