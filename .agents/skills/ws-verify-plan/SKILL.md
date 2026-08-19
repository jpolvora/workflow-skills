---
name: ws-verify-plan
description: Plan & spec verification scorer — compares implemented code against spec acceptance criteria and emits an integer verification score (0–10).
version: 0.3.23
disable-model-invocation: true
invocation_names:
  - verify-plan
  - ws-verify-plan
---

# ws-verify-plan

> When this skill is loaded, output "ws-verify-plan loaded."

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

Audit implementation deliverables against the specification and plan. 

Runs in two modes: **Quick Score** (code quality vs plan, no spec required) or **US Verification** (feature-by-feature match between spec, plan, and code).

**Canonical output:** `{us-dir}/step-05-{slug}.plan.report.md`. Optional Quick Score report shape: [`TEMPLATE.md`](TEMPLATE.md).

## Invocation

Standalone:

```
/verify-plan [spec-input] [plan-dir=<path>]
```

Workflow (ws-spec-to-pr Step 5): orchestrator passes `specPath`, `planDir`, optional `mode=quick|full`. Default `mode=quick`; escalate to `full` when quick score < 7, orchestrator passes `mode=full`, or user passed `--strict`.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `spec-input` | (optional) | Path to `step-00-*.spec.md`, US number, or omit for Quick Score |
| `plan-dir` | `{us-dir}` | Optional override for `{us-dir}` (`{plansDir}/{slug}/`) |
| `mode` | `quick` (workflow) / `full` (standalone with spec) | Verification depth |

## Steps

1. **Resolve source**: search `{us-dir}` in order for `step-02-{slug}.plan.refined.md` (refined, primary), then `step-01-{slug}.plan.md` (fallback). In full mode, also resolve the primary evaluation source: the refined plan when present, else `step-00-{slug}.spec.md`.
   - Done when: the resolved plan (and, in full mode, spec) path is known.

2. **Evaluate**: Quick Score scores Completeness (40%), Correctness & Style (35%), Tests (25%), each 0-10. US Verification maps every plan feature and acceptance criterion to **Implemented**, **Not implemented**, or **Implemented differently**, each with file:line evidence.
   - Optional `fable` integration: If `config.json.fable.enabled` and `autoAudit` are `true`, run [`ws-fable-judge`](../ws-fable-judge/SKILL.md) against `git diff` ground truth. Record verdict (`VERIFIED`, `VERIFIED WITH CAVEATS`, `REFUTED`) and fraud findings in the report.
   - Done when: every planned feature/AC has a situation and evidence, and Quick Score's three metrics are each scored.

3. **Score**: compute the integer **0-10** score (weighted average for Quick Score; overall adherence for US Verification).
   - Optional `fable` integration: If `ws-fable-judge` returned `REFUTED` and `config.json.fable.auditVerdictsBlockShip` is `true`, cap score at < 7 to require remediation.
   - Done when: an integer score 0-10 is set.

4. **Write report**: save `{us-dir}/step-05-{slug}.plan.report.md` using [`TEMPLATE.md`](TEMPLATE.md) shape (frontmatter: `us`, `reportDate`, `score`, `sourcePlans`, `evalSource`; body sections Result by Feature, Additional Features, Gaps and Next Steps). Do not edit the reference plan/spec files.
   - Done when: the report file exists with `Score: N/10` near the top and every required section populated.

5. **Handoff**: return the score and report path.
   - Workflow: the orchestrator owns the gate after reading the report: score `>= 7` advances to Step 6; score `< 7` triggers user-gate (Refine / Replan / Respec / Approve-and-continue) and must not auto-approve below 7.
   - Standalone: apply the same `>= 7` / `< 7` threshold; recommend re-implementation or a full matrix when below 7.
   - Done when: the caller has the score and report path.

