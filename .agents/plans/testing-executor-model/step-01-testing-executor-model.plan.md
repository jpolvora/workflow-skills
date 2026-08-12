---
slug: testing-executor-model
title: "Add testingModel (test executor) to LLM model config"
status: "plan to be refined"
---

## 0. Summary & Business Rules

Add optional `defaults.testingModel` (test executor) beside `plannerModel` / `executionModel` / `reviewerModel`. Standard Step 7 in `autoMode` uses non-empty `testingModel`, else `executionModel`, else the active session model. Narrow `reviewerModel` from Steps 5–7 to Steps 5–6. Lite does not read or apply `testingModel`. Empty or omitted `testingModel` is valid; no installer rewrite of consumer configs.

## 1. Definition of Ready & Scope

**In scope:** schema + example; orch dispatch docs; tools.md; configure-project interview; ws-testing model note; lite explicit non-use; tests + integrity.

**Out of scope:** lite testing step; changing planner/execution step ranges; new host switch APIs; rewriting consumer `config.json` on update.

**ACs:** AC1–AC2 schema/example; AC3–AC5 Step 7 resolve + docs; AC6 interview; AC7 lite; AC8 ws-testing; AC9 omitted-key fallback.

## 2. Technical Design & Architecture

| Layer | Files |
|-------|--------|
| Config | `config.schema.json`, `config.json.example` |
| Standard orch | `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md` |
| Shared tools | `ws-shared/tools.md` |
| Interview | `ws-configure-project/INTERVIEW.md` |
| Lite orch | `ws-spec-to-pr-lite/SKILL.md` (explicit non-use) |
| Testing skill | `ws-testing/SKILL.md` |
| Tests | `test/test-testing-executor-model.js`, `package.json` scripts |

No JSON Schema `default` that copies another property. Resolve at dispatch time.

## 3. Step-by-Step Plan

1. **Schema + example** — optional string `testingModel`; empty/omitted valid; narrow reviewerModel copy to Steps 5–6.
2. **Standard orch docs** — STEP-DISPATCH + SKILL.md: Steps 5–6 reviewer; Step 7 testingModel resolve chain.
3. **tools.md** — add Testing Phase; lite does not apply testingModel.
4. **Interview** — prompt testingModel after reviewerModel; Recommended empty (same as execution); same host canonical strings.
5. **Lite + ws-testing** — lite does not read/apply testingModel; ws-testing documents orch-supplied model; standalone `/testing` does not switch.
6. **Tests + integrity** — surface checks for AC1–AC9; `npm run generate-integrity && npm run verify-integrity`; `npm run test`.

## 4. Permissions, Tenancy & i18n

N/A (harness config/docs; no RBAC, tenancy, or i18n).

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1 | schema `testingModel` string; example `""`; omitted not required |
| AC2 | schema reviewerModel description Steps 5-6 not 5-7 |
| AC3 | STEP-DISPATCH Step 7 resolve; unit resolve helper in test |
| AC4 | STEP-DISPATCH / SKILL.md Steps 0–3 planner, 4 execution, 5–6 reviewer |
| AC5 | STEP-DISPATCH, SKILL.md, tools.md mention testingModel + narrowed range |
| AC6 | INTERVIEW.md includes testingModel + Recommended empty |
| AC7 | lite SKILL.md does not apply testingModel; Step 3 remains reviewerModel |
| AC8 | ws-testing orch-supplied model; standalone does not switch |
| AC9 | omitted testingModel falls back to executionModel then session |

## 6. Invariants (Do Not Violate)

- Never `git add -A` (MEMORY High: untracked plans).
- Do not mix into PR 194 / `develop`. Stay on `feature/testing-executor-model`.
- Do not rewrite consumer `config.json` values.
- Lite must not gain a testing step or testingModel mapping.
- `commitPlanFilesOnlyAtStep8`.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (skills SoT + tests).
- [x] Domain entities and mappings encapsulated (N/A).
- [x] Schema migrations created (N/A).
- [x] Authorization checks applied (N/A).
- [x] i18n keys declared (N/A).
- [x] Test cases cover all ACs.

## 8. Open Questions

None. Complexity gate: standard (not simple, not complex). Interview skipped (no open questions, not complex).
