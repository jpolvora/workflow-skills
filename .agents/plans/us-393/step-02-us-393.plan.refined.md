---
slug: us-393
step: 2
workflowId: us-393-20260922T080709Z
status: completed
supersedes: step-01-us-393.plan.md
startedAt: "2026-09-22T08:16:00Z"
endedAt: "2026-09-22T08:18:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8]
---

# Refined Implementation Plan — us-393

## 1. Goal

Harden the `ws-spec-multi` run-state queue contract: transitions update the existing row keyed by spec identity, duplicates fail closed, and the reported item count is frozen from the Phase 2 selection. Documentation contract plus one eval; no writer script.

## 2. Change set (files)

| File | Change | ACs |
|------|--------|-----|
| `.agents/skills/ws-spec-multi/STATE.md` | `totalItems` frontmatter; § Queue invariants; Resume Policy duplicate guard + completed-with-pending invalidation | AC1–AC7 |
| `.agents/skills/ws-spec-multi/SKILL.md` | Invariant 7 (keyed, idempotent queue writes) | AC1, AC2, AC3, AC7 |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 1 integrity-on-load; Phase 2 freeze `totalItems` + stable `#`; Phase 4 keyed in-place transition + guard + `updatedAt`; Phase 5 keyed update; Phase 6 one-terminal-row assertion | AC1–AC6 |
| `.agents/skills/ws-spec-multi/evals/evals.json` | Eval id 3 (duplicate-row scenario) | AC8 |

## 3. AC → verification map

| AC | Where satisfied | How verified |
|----|-----------------|--------------|
| AC1 | STATE § Queue invariants; PROTOCOL Phase 4/5 | Wording + eval id 3 assertion 1 |
| AC2 | STATE § Queue invariants (fail-closed guard) | eval id 3 assertion 2 |
| AC3 | STATE `totalItems`; PROTOCOL Phase 2/6 | eval id 3 assertion 3 |
| AC4 | STATE invariant; PROTOCOL Phase 6 | eval id 3 assertion 4 |
| AC5 | STATE Resume Policy rule 5 | eval id 3 assertion 4 |
| AC6 | STATE invariant; PROTOCOL Phase 4/5 | eval id 3 assertion 5 |
| AC7 | STATE § Queue invariants + Resume Policy | doc inspection |
| AC8 | evals.json id 3 | `bin/validate-evals.cjs`, `npm run test`, `test-harness-clean.js` |

## 4. Stack & Security Invariants Verification Plan

- No `.py`; no script touched → `scan_stack_invariants.cjs` not required for a docs-only change, but run `test-harness-clean.js` and `check_workflows.cjs`.
- Hashed skill content changed → `npm run generate-integrity` + `npm run verify-integrity`.
- Version bump once via `npm run build-site:bump` (package + `packageVersion` + site footer).

## 5. Risks

| Risk | Mitigation |
|------|-----------|
| Harness duplicate-content check on repeated invariant wording | Canonical block in `STATE.md`; other files reference it |
| Eval schema rejection | `bin/validate-evals.cjs` gate before commit |
