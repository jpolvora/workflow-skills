---
slug: us-101
title: "Harness audit: consumer hub link targets, delivery checklist portability, doc sprawl"
status: "plan to be refined"
---

## 0. Summary & Business Rules
Address upstream audit findings from `check-harness` run on consumer test repo `jskills`:
1. Fix relative links in managed skill docs pointing to root `AGENTS.md` sections (`../../../AGENTS.md`) so they point to `shared/AGENTS.md` (or same-directory `AGENTS.md` in `shared/setup.md`).
2. Split delivery checklist in `shared/AGENTS.md` into **Upstream maintainers (workflow-skills)** and **Consumer projects**.
3. Update `check-harness/SKILL.md` Phase 4 prose to cite the resolved hub (`shared/AGENTS.md` in consumer mode) instead of assuming root `AGENTS.md`.
4. Update `configure-project/SKILL.md` heuristic to seed default `verification.backendTest` for harness-only / skills-only test projects when no traditional app stack is detected.

## 1. Definition of Ready & Scope
- AC1: `gabarito/README.md`, `08-ship-pr/PREPARE-CHECKLIST.md`, `shared/setup.md`, `spec-to-pr/README.md` have updated relative link targets pointing to `shared/AGENTS.md`.
- AC2: `shared/AGENTS.md` delivery checklist clearly demarcates upstream-only commands (`npm run build-site:bump`, `generate-integrity`, `verify-integrity`) from consumer verification.
- AC3: `check-harness/SKILL.md` Phase 4 prose explicitly uses the resolved hub per § Hub resolution.
- AC4: `configure-project/SKILL.md` includes fallback heuristic for harness-only repos.
- AC5: `npm run tests` and `check-harness` pass with 0 critical errors.

## 2. Technical Design & Architecture
- **Layer**: `.agents/skills` (workflow & pipeline skill docs, scripts, and hubs).
- **Files to modify**:
  - `.agents/skills/gabarito/README.md`
  - `.agents/skills/08-ship-pr/PREPARE-CHECKLIST.md`
  - `.agents/skills/shared/setup.md`
  - `.agents/skills/spec-to-pr/README.md`
  - `.agents/skills/shared/AGENTS.md`
  - `.agents/skills/check-harness/SKILL.md`
  - `.agents/skills/configure-project/SKILL.md`

## 3. Step-by-Step Plan
1. **Fix Consumer-facing Managed Doc Links**:
   - `gabarito/README.md`: replace `../../../AGENTS.md` with `../shared/AGENTS.md`.
   - `08-ship-pr/PREPARE-CHECKLIST.md`: replace `../../../AGENTS.md#external-dependencies` with `../shared/AGENTS.md#external-dependencies`.
   - `shared/setup.md`: replace `../../../AGENTS.md#external-dependencies` with `AGENTS.md#external-dependencies`.
   - `spec-to-pr/README.md`: replace `../../../AGENTS.md` link with `../shared/AGENTS.md`.
2. **Update `shared/AGENTS.md` Delivery Checklist**:
   - Separate the checklist into **Consumer projects** checklist vs **Upstream repo maintainers (jpolvora/workflow-skills)** checklist.
3. **Update `check-harness/SKILL.md`**:
   - Update Phase 4 prose to refer to the resolved hub (e.g. `shared/AGENTS.md` in consumer mode).
4. **Update `configure-project/SKILL.md`**:
   - Add fallback logic in step 4/5 detection heuristics: when no traditional application code is detected, seed `verification.backendTest` with `"python .agents/skills/check-workflows/scripts/check_workflows.py"`.
5. **Validation**:
   - Run `npm run tests`
   - Run `python .agents/skills/check-workflows/scripts/check_workflows.py`

## 4. Permissions, Tenancy & i18n
N/A (harness skills documentation and scripts).

## 5. Test Coverage
- AC1: File search for `../../../AGENTS.md` in managed skills ensures consumer-facing docs point to `shared/AGENTS.md`.
- AC2: Inspect `shared/AGENTS.md` checklist section.
- AC3: Inspect `check-harness/SKILL.md` Phase 4 text.
- AC4: Inspect `configure-project/SKILL.md`.
- AC5: Execute `npm run tests`.

## 6. Invariants (Do Not Violate)
- `commitPlanFilesOnlyAtStep8`: Do not stage `{plansDir}/` files into git commits before Step 8.
- Language: English (en-us) only.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Invariants verified.
- [x] Test cases cover all ACs.

## 8. Open Questions
None.
