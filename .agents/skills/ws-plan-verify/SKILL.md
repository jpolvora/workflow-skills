---
name: ws-plan-verify
description: Spec compliance scorer (0–10). Pipeline advances only at score ≥ `defaults.minVerifyScore` (default 9); below bar runs scoreAndRefine. Trigger for check-implementation or orch Step 5.
version: 0.3.57
disable-model-invocation: true
invocation_names:
  - plan-verify
  - ws-plan-verify
---

# ws-plan-verify

> When this skill is loaded, output "ws-plan-verify loaded."

> [!IMPORTANT]
> **Execution Directive (Action-First & Anti-Deliberation):**
> - **DO NOT calculate, simulate, or debate point arithmetic, caps, or scoring formulas in your reasoning.** Scoring is 100% deterministic and computed by `ac_ledger.cjs score`.
> - **DO NOT hypothesize or guess file locations or test names in reasoning.** Immediately run tools (`grep_search`, `view_file`, test runners) to observe actual ground truth.
> - Execute the mechanical 4-step verification flow directly without analytical prelude.

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Audit implementation deliverables against the specification and plan. 

Runs in two modes: **Quick Score** (code quality vs plan, no spec required) or **US Verification** (feature-by-feature match between spec, plan, and code).

**Canonical output:** `{us-dir}/step-05-{slug}.plan.report.md`. Optional Quick Score report shape: [`TEMPLATE.md`](TEMPLATE.md).

## Invocation

Standalone:

```
/plan-verify [spec-input] [plan-dir=<path>]
```

Workflow (ws-spec-to-pr Step 5): orchestrator passes `specPath`, `planDir`, optional `mode=quick|full`. Default `mode=quick`; escalate to `full` when quick score `< minVerifyScore`, orchestrator passes `mode=full`, or user passed `--strict`.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `spec-input` | (optional) | Path to `step-00-*.spec.md`, US number, or omit for Quick Score |
| `plan-dir` | `{us-dir}` | Optional override for `{us-dir}` (`{plansDir}/{slug}/`) |
| `mode` | `quick` (workflow) / `full` (standalone with spec) | Verification depth |

## Steps

1. **Resolve source**: search `{us-dir}` in order for `step-02-{slug}.plan.refined.md` (refined, primary), then `step-01-{slug}.plan.md` (fallback). In full mode, also resolve the primary evaluation source: the refined plan when present, else `step-00-{slug}.spec.md`.
   - Done when: the resolved plan (and, in full mode, spec) path is known.

2. **Evaluate**: Inspect code and tests using tools. Quick Score evaluates Completeness, Correctness & Style, and Testing. US Verification maps every plan feature and acceptance criterion to **Implemented**, **Not implemented**, or **Implemented differently**, each with file:line evidence. Also map spec **negative test** scenarios (`negativeScenarios` from Validation Notes / failing cases) to covering tests before advancing; missing negative coverage is a gap, not an implicit pass.
   - Optional `fable` integration: If `config.json.fable.enabled` and `autoAudit` are `true`, run [`ws-fable-judge`](../ws-fable-judge/SKILL.md) against `git diff` ground truth. Record verdict (`VERIFIED`, `VERIFIED WITH CAVEATS`, `REFUTED`) and fraud findings in the report.
   - Done when: every planned feature/AC and spec negative test scenario has a situation and evidence.

3. **Score**: Link observed evidence to `{us-dir}/ac-ledger.json` and derive the score via CLI:
   - Link verification aliases (`node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger {us-dir}/ac-ledger.json --event-id <id> --alias-result '{"alias":"...","command":"...","exitCode":0}'`). For skipped aliases (e.g. dirty baseline), set `"skipReason":"baseline-dirty"`.
   - Link AC status, files, and tests (`node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger {us-dir}/ac-ledger.json --event-id <id> --ac AC1 --status Implemented --file "path:L1-L20" --test '{"name":"...","sourceFile":"...","phase":"observed","exitCode":0}'`).
   - Link Negative & Failing Scenarios (`node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs link --ledger {us-dir}/ac-ledger.json --event-id <id> --negative NS1 --test '{...}'`).
   - **Regression Sabotage Check:** For bug-fix/regression tests, run `python {skillsRoot}/ws-testing/scripts/run_sabotage.py` with caller-authored invert patch. Record pass/fail/skipped+reason in the report. Link sabotage exit via `--sabotage-exit <code-or-0>`. Missing required sabotage fail-closes (`knownDefect` caps score at 8).
   - Optional `fable` integration: Link verdict and finding evidence before scoring (`REFUTED` floor blocks).
   - **Derive integer score (0–10):** Run `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs score --ledger {us-dir}/ac-ledger.json --boundary step5`. Read the derived score from JSON output; never author or override the numeric score.
   - Done when: integer score 0–10 is returned by `ac_ledger.cjs`.

4. **Write report**: save `{us-dir}/step-05-{slug}.plan.report.md` using [`TEMPLATE.md`](TEMPLATE.md) shape (frontmatter: `us`, `reportDate`, `score`, `sourcePlans`, `evalSource`; body sections Result by Feature, Additional Features, Gaps and Next Steps). Do not edit the reference plan/spec files.
   - Done when: the report file exists with `Score: N/10` near the top and every required section populated.

5. **Handoff**: return the score and report path.
   - Workflow: the orchestrator owns the gate after reading the report: score `>= defaults.minVerifyScore` (default 9) advances to Step 6 (optional `scoreAndRefine` second pass first when the flag is on — [`gates.md`](../ws-shared/gates.md) § Score & Refine); score below `defaults.minVerifyScore` runs `scoreAndRefine` (re-implement flagged tasks + re-verify) until `>= defaults.minVerifyScore` (default 9) (max 3 rounds per visit, then Pause). Do not auto-approve below `defaults.minVerifyScore`.
   - Standalone: apply the same `>= defaults.minVerifyScore` (default 9) / below-bar threshold; recommend `scoreAndRefine` until `>= defaults.minVerifyScore` (default 9) when below bar.
   - Done when: the caller has the score and report path.

## Subagent contract

- Inspect the immutable product snapshot and supplied AC ledger without changing product files.
- Link only observed semantic, file-line, test, alias, sabotage, and verdict evidence.
- Derive the score through `ac_ledger.cjs`; never author or override it.
- Write only the assigned verification report and return score plus findings.
- After step finish, orch persists `{us-dir}/handoff/step-{NN}.json`.

