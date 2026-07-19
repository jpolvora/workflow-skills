---
name: ws-verify-plan
description: Compares implementation quality and code deliverables against the spec (or plan when no spec) and acceptance criteria. Publishes a 0–10 score.
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 2.3
disable-model-invocation: true
invocation_names:
  - verify-plan
  - ws-verify-plan
  - 05-verify-plan
---

# 05-verify-plan

Responsible for auditing implementation deliverables against the specification and design blueprints. It runs in two modes:
- **Quick Score Mode:** Evaluates overall code quality, conventions, and test coverage on a 0–10 scale.
- **US Verification Mode:** Audits precise adherence between the primary evaluation source (refined spec when present, else `step-00-{slug}.spec.md`), the plan (`step-02-{slug}.plan.refined.md` or `step-01-{slug}.plan.md`), and the actual code, generating a feature-by-feature report.

## Persona

Act as a **Senior QA Engineer / SDET** who meticulously evaluates code deliverables against acceptance criteria, checks overall code quality, reviews test coverage, and ensures functional correctness.

---

## Invocation

### Standalone Mode

```
/verify-plan [spec-input] [plan-dir=<path>]
```

### Workflow Mode (Step 5 of spec-to-pr)

Dispatched by `spec-to-pr` at Step 5. Receives `specPath`, `planDir`, and optional `mode=quick|full` from the orchestrator.

**Default under workflow:** `mode=quick` (Quick Score). Escalate to full US Verification when quick score < 7, orch passes `mode=full`, or user passed `--strict`.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `spec-input` | String | (optional) | Path to `step-00-*.spec.md`, US number (e.g. `1474`), or omitted to trigger Quick Score mode. |
| `plan-dir=<path>` | String | `.cursor/plans/{slug}/` | Directory containing the plans and output report. |
| `mode` | `quick` \| `full` | `quick` in workflow; `full` when standalone with spec | Verification depth. |

---

## Primary evaluation source (workflow)

Score implementation **0–10** against:

1. **`step-02-{slug}.plan.refined.md`** when present (refined spec / shared-understanding plan — primary)
2. Else **`step-00-{slug}.spec.md`** (canonical spec fallback)

Cross-reference the active plan (`step-02-*` or `step-01-*`) for feature matrix and AC mapping. Publish the integer **score 0–10** in the report and Progress Board summary.

---

## Orchestrator-owned score gate (< 7)

When dispatched under workflow, **this skill does not** present the below-7 menu — the orchestrator owns it after reading `step-05-{slug}.plan.report.md`.

| Score | Orchestrator behavior |
|-------|----------------------|
| ≥ 7 | Complete Step 5; Advance to Step 6 |
| < 7 | AskQuestion: **Refine** (replay implement + re-check) / **Replan** (back to Step 1) / **Respec** (back to Step 0) / **Approve and continue** (log `check-approve-below-7`) |

`autoMode`: orchestrator must **not** auto-approve below 7 — Pause with score (fail closed).

Standalone `/verify-plan`: apply the same ≥ 7 / < 7 threshold; recommend re-implementation or full matrix when below 7.

---

## 1. Quick Score Mode (Without Spec)

When no specification is provided, evaluate the overall code status against the local plan and modified files:

### Evaluation Metrics

| Metric | Weight | Check Details |
|--------|--------|---------------|
| **Completeness** | 40% | Were all planned files and deliverables implemented? |
| **Correctness & Style** | 35% | Does the code respect project layer boundaries, multi-tenancy, and standards? |
| **Tests** | 25% | Were tests updated and do they execute successfully? |

Assign a 0-10 score to each metric. Approve the implementation if the weighted average score is `≥ 7`, otherwise suggest re-implementation.

Optional report shape for Quick Score: [`TEMPLATE.md`](TEMPLATE.md).

---

## 2. US Verification Mode (Full Workflow)

Audits adherence between the primary evaluation source (`step-02-*.plan.refined.md` when present, else `step-00-*.spec.md`), the plan (`step-02-*.plan.refined.md` or `step-01-*.plan.md`), and the modified code.

### Plan Resolution Order
Search the plan directory (`.cursor/plans/{slug}/`) in the following order:
1. `step-02-{slug}.plan.refined.md` (refined plan, primary)
2. `step-01-{slug}.plan.md` (initial plan, fallback)

---

## Output Report Format

Write the validation report to `{plan-dir}/step-05-{slug}.plan.report.md`. Include **`Score: N/10`** near the top (after frontmatter). The report must match the following format exactly:

```markdown
---
us: "{slug}"
reportDate: YYYY-MM-DD
score: N
sourcePlans: ["step-02-{slug}.plan.refined.md"]
evalSource: step-02-{slug}.plan.refined.md | step-00-{slug}.spec.md
githubSource: gh | none
---

# Implementation Report — {slug}

**Generated on:** YYYY-MM-DD
**Score:** N/10
**Evaluation source:** step-02-{slug}.plan.refined.md (or step-00-{slug}.spec.md)
**Reference Plan:** step-02-{slug}.plan.refined.md (or step-01-{slug}.plan.md)

## Result by Feature (Plan & ACs)

| Feature | Situation | Detail / Evidence |
|---------|-----------|-------------------|
| CRUD Accounts | **Implemented** | `AccountService.cs:L20-L45` |
| Tenancy Check | **Implemented differently** | Plan asked for filter X, implemented via ORM global filter Y. |
| List Sorting | **Not implemented** | Column headers are static; missing sorting logic. |

*Situation must be strictly one of: **Implemented**, **Not implemented**, or **Implemented differently**.*

## Additional Features Beyond Original Plan

| Feature / Extra Behavior | Location in Code | Note |
|--------------------------|------------------|------|
| (Optional extra) | `path:line` | (Contextual notes) |

## Gaps and Next Steps
- (List missing or incomplete tasks to resolve before PR approval)
```

---

## Rules of Engagement

- **Plan Immutability:** Do not edit the reference `*.plan.md` files. Write findings exclusively to the `step-05-{slug}.plan.report.md` file.
- **Accurate Evidence:** Always cite specific file paths and line numbers for implemented features.
- **Legacy artifact:** Do not write `step-06-{slug}.plan.report.md` on new runs (orchestrator may read for resume compatibility only).
