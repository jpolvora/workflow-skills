---
id: null
slug: continuous-ai-verification-quality-gates
title: "Continuous AI Verification & Advanced Quality Gates Engine"
source: local
specDate: 2026-07-27
---

# Specification — Continuous AI Verification & Advanced Quality Gates Engine

## Description

Design and implement a continuous AI verification engine and hardened quality gates across `workflow-skills`. This feature automates pre-ship adversarial diff audits, introduces continuous workflow CI integration, adds dynamic spec complexity classification for orchestrator routing, shifts left static code shields before LLM turns, and captures execution metrics telemetry.

### Goals

- **Automated Pre-PR Adversarial Gate (`ws-fable-judge`)**: Enforce a mandatory `ws-fable-judge` adversarial audit pass during Step 8 (`ws-ship-pr`) to detect the 4 classic AI frauds (Weakened Checks, False Completion, Scope Creep, Unauthorized Action) and block PR push/creation if refuted.
- **Continuous Workflow CI Suite (`ws-check-workflows`)**: Provide a GitHub Action workflow definition to run `ws-check-workflows` and `ws-check-harness` headlessly on every pull request to ensure skill and FSM integrity.
- **Dynamic Spec Complexity Classifier (`ws-multi-spec`)**: Add automated complexity scoring based on spec criteria depth and target file diff scope to auto-assign tasks between `standard` (`ws-spec-to-pr`) and `lite` (`ws-spec-to-pr-lite`) orchestrator workers.
- **Shift-Left Static Quality Shield**: Execute deterministic static checks (`ws-secrets-leak-review`, AST linters, type checks) before LLM code review turns in `ws-code-review`.
- **Execution Telemetry & Metrics**: Record structured run metrics (step duration, retry loops, verification scores, audit verdicts) to `.agents/plans/metrics.json` for continuous quality monitoring.

---

## Technical Specifications

### 1. Pre-PR Adversarial Gate (`ws-ship-pr`)

Integrate `ws-fable-judge` into `ws-ship-pr` Step 2 (Prepare to PR) preflight checklist:

| Check | Tool / Skill | Action on Failure |
|-------|--------------|-------------------|
| **Adversarial Diff Audit** | `ws-fable-judge` | Evaluate `git diff` against spec. If verdict is `REFUTED`, output audit report and halt PR creation (`exit 1`). |
| **Secrets & Credential Shield** | `ws-secrets-leak-review` | Scan changed files for PII and secrets before commit. Halt if leaks found. |

---

### 2. Dynamic Spec Complexity Classifier (`ws-multi-spec`)

Add a classification function in `ws-multi-spec` to dynamically route incoming specs:

```json
{
  "complexityScore": {
    "criteriaCountWeight": 0.4,
    "fileScopeWeight": 0.4,
    "breakingChangeWeight": 0.2
  },
  "thresholds": {
    "liteMaxScore": 4.0,
    "standardMinScore": 4.1
  }
}
```

- **Score $< 4.0$**: Dispatch `ws-spec-to-pr-lite` for rapid sequential execution.
- **Score $\ge 4.0$**: Dispatch full `ws-spec-to-pr` FSM with formal interview and task DAG decomposition.

---

### 3. Execution Telemetry Schema (`.agents/plans/metrics.json`)

Append execution metrics upon completing any `ws-spec-to-pr` or `ws-spec-to-pr-lite` run:

```json
{
  "runId": "20260727-130500",
  "specSlug": "continuous-ai-verification-quality-gates",
  "workflowMode": "standard",
  "durationSeconds": 142,
  "stepsExecuted": ["00", "01", "02", "03", "04", "05", "06", "07", "08"],
  "codeReviewRetries": 1,
  "verificationScore": 9.2,
  "fableAuditVerdict": "VERIFIED",
  "secretsScanPassed": true
}
```

---

## Verification Criteria

1. **Automated Unit & Integration Tests**:
   - `npm run test`: Pass all test suites including installer CLI, integrity digests, and tree verification.
2. **Workflow Simulation**:
   - `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`: 100% pass across all FSM simulation paths with 0 errors.
3. **Harness Integrity Audit**:
   - `ws-check-harness`: Exit 0 with zero critical findings.
4. **Digest Parity**:
   - `npm run generate-integrity` && `npm run verify-integrity`: Integrity checksums pass validation.
