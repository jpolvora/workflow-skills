---
id: null
slug: fable-skills-integration
title: "Opt-in Integration of fable-* Skills with spec-to-pr Workflows"
source: local
specDate: 2026-07-24
---

# Specification — Opt-in Integration of fable-* Skills with spec-to-pr Workflows

## Description

Define and implement an opt-in integration mechanism connecting the `fable-*` skill family ([`fable-judge`](../.agents/skills/fable-judge/SKILL.md), [`fable-domain`](../.agents/skills/fable-domain/SKILL.md), [`fable-method`](../.agents/skills/fable-method/SKILL.md)) with the `spec-to-pr` and `spec-to-pr-lite` delivery workflows.

### Goals

- **Default Integration**: Default `config.json.fable.enabled` to `true` in fresh `config.json.example` while treating missing `fable` blocks in legacy configs as disabled.
- **Adversarial Audit Gate (`fable-judge`)**: Run adversarial checks against `git diff` ground truth during plan verification (`05-verify-plan`), code review (`06-code-review`), and pre-ship checks (`08-ship-pr`). Detect the 4 classic frauds (Weakened Checks, False Completion, Scope Creep, Unauthorized Action) and block ship when verdicts yield `REFUTED`.
- **Domain Context Resolution (`fable-domain`)**: Automatically inspect project stack signals (IaC `*.tf`, Kubernetes `*.yaml`, Docker, DB migrations, Data scripts) during plan generation (`01-write-plan`) to inject mandatory primary sources & domain observation rules.
- **Harness & Integrity Parity**: Keep `skill-dependencies.json`, `skill-integrity.json`, and site catalog (`docs/index.html`) in sync with all updated skill manifests.

---

## Technical Specifications

### 1. Configuration & Resolution Schema

Add `"fable"` configuration schema to `.agents/skills/shared/config.json.example` and document resolution rules in `.agents/skills/shared/config-resolution.md`:

```json
"fable": {
  "_comment": "Opt-in integration for fable-* skills within spec-to-pr / spec-to-pr-lite workflows. Master toggle must be true to enable automatic calls.",
  "enabled": true,
  "autoAudit": true,
  "autoDetectDomain": true,
  "auditVerdictsBlockShip": true
}
```

#### Field Resolution:
- `fable.enabled` (`boolean`): Master toggle. Default `false` when absent.
- `fable.autoAudit` (`boolean`): When `true` and master enabled, auto-run `fable-judge` at Step 5 (`ws-verify-plan`), Step 6 (`ws-code-review`), and Step 8 (`ws-ship-pr`).
- `fable.autoDetectDomain` (`boolean`): When `true` and master enabled, auto-consult `fable-domain` at Step 1 (`ws-write-plan`) for specialized stack signals.
- `fable.auditVerdictsBlockShip` (`boolean`): When `true` and master enabled, `REFUTED` verdict caps verification scores and halts `ws-ship-pr` delivery.

---

### 2. Workflow Pipeline Integration Points

| Step Skill | Integration Point | Behavior |
|------------|-------------------|----------|
| **[`01-write-plan`](../.agents/skills/01-write-plan/SKILL.md)** | Step 1 (Context Load) | Auto-detect domain files (IaC `*.tf`, K8s `*.yaml`, Docker, DB migrations). Consult `fable-domain` to append binding primary sources into plan sections 2/6. |
| **[`05-verify-plan`](../.agents/skills/05-verify-plan/SKILL.md)** | Steps 2 & 3 (Evaluate & Score) | Execute `fable-judge` adversarial audit on `git diff` ground truth. Record verdict & fraud audit. Cap score < 7 if `REFUTED` and `auditVerdictsBlockShip` is enabled. |
| **[`06-code-review`](../.agents/skills/06-code-review/SKILL.md)** | Step 6 (Check Invariants) | Run `fable-judge` to detect Weakened Checks or Scope Creep. Escalate findings to Critical/Warning to trigger `04-implement-tasks mode=fix` substep. |
| **[`08-ship-pr`](../.agents/skills/08-ship-pr/SKILL.md)** | Step 1 (Preflight) | Verify `fable-judge` audit verdict is not `REFUTED`. Stop PR push/creation if `REFUTED`. |
| **[`spec-to-pr`](../.agents/skills/spec-to-pr/SKILL.md)** / **[`spec-to-pr-lite`](../.agents/skills/spec-to-pr-lite/SKILL.md)** | Core Invariants | Document `fable` integration invariant across orchestrator FSM steps. |

---

## Verification Criteria

1. **Automated Test Suites**:
   - `npm run test`: Pass all 6 test suites (CLI help, interactive installer, non-interactive installer, tree integrity, FSM simulation, doc sync).
2. **Workflow Simulation**:
   - `python .agents/skills/check-workflows/scripts/check_workflows.py`: Pass all FSM simulations (`spec-to-pr` & `spec-to-pr-lite`) with 0 errors.
3. **Skill Integrity Parity**:
   - `npm run generate-integrity` & `npm run verify-integrity`: Checksums verify 100% match.
