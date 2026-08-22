---
slug: fix-pr-proactive-class-sweep
title: "ws-fix-pr: proactive same-category discovery before resolve"
status: active
interviewRound: 1
shared_understanding: confirmed
supersedes: step-01-fix-pr-proactive-class-sweep.plan.md
workflowId: fix-pr-proactive-class-sweep-20260822T162100Z
step: 2
startedAt: "2026-08-22T16:21:00Z"
endedAt: "2026-08-22T16:27:50.347Z"
acRefs: []
---
## 0. Summary & Business Rules

Extend the existing `ws-fix-pr` cooperative fix contract so that a validated review or CI thread does not stop at the anchored `file:line` or a shallow grep of already-named paths. After the defect class is named, the fixer must proactively search every available evidence source, apply the same surgical correction to any same-class sibling that is small enough to fix safely, and explicitly report any larger or ambiguous same-class hits that are skipped.

**Interview outcome:** the project-context sweep closed the open design gaps. Local config confirms `defaults.patternsBackend` and `defaults.patternsFrontend` are enabled, but there are no project `backend.md` / `frontend.md` files today, so those sources stay conditional at implementation time. Existing memory and step-dispatch evidence already treats missing `MEMORY.md` as consult-skipped, not fatal. The current `ws-fix-pr/evals/evals.json` exists and needs extension, not replacement.

Business rules:

- Keep the current sibling-sweep baseline from PR #223 intact. This change extends it; it does not replace it.
- Keep the contract portable and en-us only.
- Use only the local skill tree under `.agents/skills`; do not rely on any global install.
- Do not commit, push, or edit product code in this planning step.
- Preserve the current no-shim, no-duplicate-folder rule. One updated contract per behavior.
- Treat missing MEMORY or missing prior round reports as advisory context gaps, not hard failures.

## 1. Definition of Ready & Scope

### Ready evidence

- Canonical spec: `.agents/plans/fix-pr-proactive-class-sweep/step-00-fix-pr-proactive-class-sweep.spec.md`
- Existing memory trap: cooperative fix must sweep the defect class.
- Prior work baseline: `COOPERATIVE_FIX.md` sibling sweep already exists.
- Project config is present and points `{sharedDir}` at `.agents/skills/ws-shared`.
- `defaults.patternsBackend` and `defaults.patternsFrontend` are `true`, but no local `backend.md` or `frontend.md` files are present today. The plan should consume them only if they exist at implementation time.

### Scope boundaries

In scope:

- `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md`
- `.agents/skills/ws-fix-pr/SKILL.md`
- `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`
- `.agents/skills/ws-goal-fix-pr/SKILL.md`
- `.agents/skills/ws-fix-pr/evals/evals.json`
- Test coverage for the new proactive-discovery contract and the unchanged sabotage guardrail

Out of scope:

- SCM provider API changes
- New provider implementations
- Rewriting historical review artifacts
- Compatibility shims or dual contract folders
- Any product code outside the listed skill and test artifacts

## 2. Technical Design & Architecture

### Shared contract

Update `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` to define the new mandatory order:

1. Name the defect class in one line.
2. Search repo-wide code for the same pattern.
3. Consult `{sharedDir}/MEMORY.md` and matching `memory/*` entries when present.
4. Consult same-PR context sources when present: other open threads, prior round reports, and failed-check logs.
5. Consult `{sharedDir}/backend.md` and `{sharedDir}/frontend.md` only when those files exist and the layer matches.
6. Apply the same fix to any small, local same-class sibling in the same round.
7. Record every skip with `path + reason`.

Add the size gate explicitly:

- Fix now when the hit is local, surgical, and the same correction shape as the validated anchor.
- Skip when the hit requires a large refactor, crosses unrelated scope, or would expand the PR beyond the review round.

Add the report contract explicitly:

- `defectClass`
- `sourcesConsulted`
- `proactiveFixed`
- `proactiveSkipped`

The existing `siblingsFixed` / `siblingsSkipped` wording in the shared contract stays as the compatibility phrasing for resolution bodies, but the refined plan treats the proactive names above as the canonical plan-gate and resolution contract.

### Skill bindings

Update `ws-fix-pr/SKILL.md` step 5 and the confirmation gate so the plan-gate records the proactive pass before any thread is considered resolved. The step must forbid closing a blocking thread when same-class siblings remain unfixed and unskipped.

Update `ws-fix-pr/scripts/AUTO_FIX.md` so the CI runtime mirrors the same discovery order, same size gate, and same explanation fields.

Update `ws-goal-fix-pr/SKILL.md` so every act round must run the proactive class sweep before resolve/push, not merely the older sibling-sweep one-liner.

### Evals and proof

Extend `ws-fix-pr/evals/evals.json` with at least one case where the same defect class appears in a second path outside the anchor, plus a case where the same-class hit is intentionally skipped with a reason. Add a dedicated MEMORY consult-skipped case so the evaluator proves missing `MEMORY.md` is advisory and still gets recorded in `sourcesConsulted`.

Keep the existing sabotage regression contract intact. The implementation should not weaken or bypass the `run_sabotage.py` expectation used by the broader harness checks.

## 3. Step-by-Step Plan

### Step 1 — Tighten the shared contract

Files:

- `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md`

Actions:

- Add the proactive discovery sequence after class naming.
- Spell out all required evidence sources and the advisory behavior when a source is missing.
- Add the size gate and the explicit skip reporting fields.
- Preserve the current sibling-sweep language so the new contract reads as an extension, not a replacement.

Checks:

- Manual diff review against the spec text.
- Confirm every new requirement is represented in the contract wording.

### Step 2 — Bind the runtime entry points

Files:

- `.agents/skills/ws-fix-pr/SKILL.md`
- `.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md`
- `.agents/skills/ws-goal-fix-pr/SKILL.md`

Actions:

- Update fix-pr step 5 and the plan-gate wording to require proactive discovery before resolve.
- Update Auto-Fix order of operations and explanation text to carry `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped`.
- Update the goal loop act round so it cannot resolve or push until the proactive pass is done or every skip is recorded.

Checks:

- Verify the three entry points use the same field names and the same stop condition.
- Confirm no SCM provider behavior changed.

### Step 3 — Extend eval and regression coverage

Files:

- `.agents/skills/ws-fix-pr/evals/evals.json`
- `test/test-fix-pr-proactive-class-sweep.js` or an equivalent focused regression test
- `test/test-hermes-spec-to-pr-enhancements.js` if the sabotage guardrail needs an assertion update

Actions:

- Add an eval that forces a second same-class hit outside the anchor to be fixed or explicitly skipped.
- Add an eval that checks the skip path records a reason instead of pretending the class is cleared.
- Add an eval or focused regression for missing `MEMORY.md` being consult-skipped, not fatal, with that fact reflected in `sourcesConsulted`.
- Keep the sabotage-focused guardrail intact so mutation-unset verification remains covered by the broader harness.

Checks:

- The new test should fail if a sibling same-class occurrence is left unfixed without a recorded exemption.
- The eval fixture should assert the proactive report fields are present.

### Step 4 — Ship-readiness verification

Files:

- No new product files beyond the skill and test artifacts above

Actions:

- Run the targeted regression test(s) for the proactive sweep.
- Run the existing integrity verification for hashed skill content.
- Run `ws-check-harness` for the affected skill docs once the wording is updated.

Checks:

- `npm run generate-integrity && npm run verify-integrity`
- `npm run test`
- `ws-check-harness`

## 4. Permissions, Tenancy & i18n

- No tenancy or RBAC behavior changes are expected.
- No external service mutations are part of this work.
- No new secrets, tokens, or auth flows are introduced.
- Skill and harness prose remain en-us.
- The new report fields are internal workflow metadata, not user-facing localized text.

## 5. Test Coverage

Command-level checks:

- `npm run test`
- `npm run generate-integrity && npm run verify-integrity`
- `ws-check-harness`

Proposed focused test file:

- `test/test-fix-pr-proactive-class-sweep.js`

Planned test methods and AC mapping:

| AC | Test case / method | Notes |
|---|---|---|
| AC1 | `testSharedContractRequiresProactiveDiscoverySources` | Confirms code grep, MEMORY, same-PR context, and optional pattern docs are all named as discovery sources. |
| AC2 | `testFixPrStepFiveRequiresProactivePassBeforeResolve` | Confirms `ws-fix-pr/SKILL.md` step 5 forbids closing a thread after only the anchor is fixed when same-class siblings remain. |
| AC3 | `testSharedContractImplementsSizeGateAndSkipReason` | Confirms local/surgical hits are fixed and large or architectural hits are recorded with `path + reason`. |
| AC4 | `testPlanGateAndResolutionBodiesCarryProactiveFields` | Confirms plan-gate and resolution bodies include `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped` or equivalent fields. |
| AC5 | `testAutoFixMirrorsProactiveDiscoveryAndReports` | Confirms `AUTO_FIX.md` requires the same order of operations and explanation fields. |
| AC6 | `testGoalFixPrActRoundRequiresClassSweepBeforePush` | Confirms the goal loop act round requires the proactive class sweep before resolve/push. |
| AC7 | `testEvalsIncludeSecondPathAndExplicitSkip` | Confirms `ws-fix-pr/evals/evals.json` contains both a second-path same-class case and an explicit skip case. |
| AC8 | `testMissingMemoryIsConsultSkipped` | Confirms missing MEMORY or missing prior round reports do not fail the fix-pr flow and are only reflected in `sourcesConsulted`. |
| AC9 | `testNoCompatibilityShimsOrDualFolders` | Confirms the contract remains a single updated source under `ws-fix-pr/scripts/COOPERATIVE_FIX.md`. |
| AC10 | `testIntegrityAndHarnessStillPass` | Confirms hashed skill content still passes integrity and the harness reports zero critical findings. |

The sabotage guardrail remains covered by the existing broader regression test that exercises `run_sabotage.py` with mutation unset. That check must stay green after the contract wording changes.

## 6. Invariants (Do Not Violate)

1. Keep the cooperative-fix contract singular and portable.
2. Do not add compatibility shims, duplicate folders, or legacy fallback wording.
3. Do not weaken the current sibling-sweep rule; this work only extends it.
4. Do not make missing MEMORY or missing prior round reports fatal.
5. Do not skip the size gate. Small local hits are fixed; large hits are skipped with a reason.
6. Do not resolve a thread without recording the proactive pass in the report fields.
7. Do not change SCM provider APIs or thread transport behavior.
8. Do not touch the global skill tree.
9. Keep all docs and tests en-us.
10. Do not commit, push, or stage anything in this planning step.

## 7. Pre-PR Checklist

- [ ] Every AC maps to at least one step in this plan.
- [ ] Every AC maps to at least one test case in section 5.
- [ ] The shared contract, fix-pr skill, Auto-Fix, and goal-fix-pr all use the same proactive field names.
- [ ] The size gate distinguishes fix-now vs skip-with-reason.
- [ ] Missing MEMORY and missing prior round reports remain advisory.
- [ ] The eval set includes a second-path same-class case, an explicit skip case, and a MEMORY consult-skipped case.
- [ ] The sabotage regression guardrail remains intact.
- [ ] Integrity verification passes after any hashed skill doc change.
- [ ] `ws-check-harness` returns zero critical findings for the updated skill docs.
- [ ] No global install, commit, push, or destructive git action was used in this step.

## 8. Open Questions

None.

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence | dependsOn |
|---|---|---|---|---|---|---|---|---|
| G-01 | non-blocking | 0 | Whether pattern docs are mandatory in this repo | resolved | Local config enables `patternsBackend` / `patternsFrontend`, but `backend.md` and `frontend.md` do not exist in the project today, so the plan keeps them conditional at implementation time. | project | `.agents/skills/ws-shared/config.json`; repo-wide glob sweep for `backend.md` / `frontend.md` returned no hits | - |
| G-02 | non-blocking | 2 | How to phrase missing MEMORY behavior in the contract | resolved | Missing `MEMORY.md` should be consult-skipped, not fatal; record the skip in `sourcesConsulted` and proceed with other evidence sources. | project | `.agents/skills/ws-shared/MEMORY.md`; `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` memory consult behavior; `ws-spec-to-pr` memory advisory precedent | G-01 |
| G-03 | non-blocking | 2 | What the canonical report fields should be | resolved | Use `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped` as the canonical plan-gate / resolution fields; keep `siblingsFixed` / `siblingsSkipped` as legacy phrasing only where the current shared contract already uses them. | model-inferred | `step-00` spec AC4; `COOPERATIVE_FIX.md`; `ws-fix-pr/SKILL.md`; `AUTO_FIX.md` | G-02 |
| G-04 | non-blocking | 3 | Whether the eval set needs new cases or a replacement | resolved | Extend the existing `ws-fix-pr/evals/evals.json` with new proactive-discovery cases instead of replacing the current baseline. | project | `.agents/skills/ws-fix-pr/evals/evals.json` exists with 3 baseline evals | G-03 |
| G-05 | non-blocking | 3 | Whether MEMORY consult-skipped needs explicit proof | resolved | Add a dedicated eval/regression for missing `MEMORY.md` being consult-skipped and recorded in `sourcesConsulted`. | model-inferred | `step-00` AC8; memory advisory traps in `.agents/skills/ws-shared/MEMORY.md`; existing `ws-spec-to-pr` memory consult contract | G-04 |

blocking_open: 0
shared_understanding: confirmed
