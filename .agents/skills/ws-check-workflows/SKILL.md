---
name: ws-check-workflows
description: Workflow FSM simulation runner — validates step continuity, state isolation, provider dispatch, and artifact transitions across standard, lite, and multi-spec pipelines.
version: 0.4.71
disable-model-invocation: true
invocation_names:
  - check-workflows
  - ws-check-workflows
---

# ws-check-workflows

> When this skill is loaded, output "ws-check-workflows loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

Run the workflow simulation script against standard, lite, and multi-spec orchestrators.

---

## Quick Start

Run deep simulation and validation against both workflows:

```bash
# Standard report execution
node {skillsRoot}/ws-check-workflows/scripts/check_workflows.cjs

# Save Markdown report to ws-check-workflows-report.md
node {skillsRoot}/ws-check-workflows/scripts/check_workflows.cjs --report

# Auto-fix mode (applies safe fixes; never prompts, even on a TTY)
node {skillsRoot}/ws-check-workflows/scripts/check_workflows.cjs --fix --yes

# Default is report-only (no fixes applied).
# For this invocation: exit 1 iff a CRITICAL issue exists, 0 otherwise (warnings alone exit 0).
node {skillsRoot}/ws-check-workflows/scripts/check_workflows.cjs
```

---

## Simulation & Validation Scope

The validation process performs end-to-end simulation across both orchestrators:

### 1. Workflow Simulation & Step Continuity
- **Standard (`ws-spec-to-pr`) Simulation**: Simulates stepping through Steps 0 to 9 (`ws-spec-write`, `ws-plan-write`, `ws-plan-interview`, `ws-plan-to-tasks`, `ws-implement-tasks`, `ws-plan-verify`, `ws-code-review`, `ws-testing`, `ws-ship-pr`, `ws-fix-pr`). Step 7 (`ws-testing`) may include optional mutation skip/pass/fail branches documented in `ws-testing` / `DIAGRAM.md` — FSM step count stays 0–9 (mutation is not a separate step).
- **Lite (`ws-spec-to-pr-lite`) Simulation**: Simulates stepping through Steps 0 to 5 (`ws-spec-write`, `ws-plan-write`, `ws-implement-tasks`, `ws-code-review`, `ws-ship-pr`, `ws-fix-pr`). Does **not** require `ws-testing` or mutation.
- **Linked Skill Check**: Verifies that every step links to an existing skill under `{skillsRoot}/<skill>/SKILL.md` (upstream SoT is `.agents/skills/`).

### 2. Script Syntax & Execution Check
- Checks Node.js scripts (`.cjs`/`.js`) via `node --check`.
- Flags syntax errors, invalid imports, or execution issues as critical broken steps.

### 3. Orchestrator Dependency Closure
- Asserts that all skills dispatched by `ws-spec-to-pr` and `ws-spec-to-pr-lite` are declared in `bin/skill-dependencies.json`.

### 4. Config Sharing & State Isolation
- Verifies that all provider scripts and state handlers target `.ws/config.json` (bootstrap, fixed).
- Confirms state handlers serialize `workflowType` (`standard` vs `lite`).

### 5. G2-code timing & path-scoped staging
- Standard dispatch/protocols require **G2-code after Step 5 before Step 6**.
- Lite SKILL requires **G2-code after Step 2 before Step 3**.
- `tools.md` `commit-code` is path-scoped `files_touched` (no `git add src/ web/ tests/`).
- `gates.md` auto-gate rows cover post-verify and post-review-fix save points.
- `ws-code-review` reviews committed `{base}...HEAD` vs `config.project.baseBranch` and does not commit.

---

## Report & Confirmation Flow

1. **Detailed Simulation Report**: Generates a structured breakdown of Full and Lite workflow simulation results, along with a table of detected issues and actionable **Suggested Fixes**.
2. **User Confirmation Gate**: `--fix` applies safe fixes only with explicit `--yes` (never prompts, even on a TTY). `--fix` without `--yes` exits 1 on a TTY without applying fixes whenever any issue exists — even warning-only; in non-TTY mode it proceeds as if `--yes` were passed. For the default report-only invocation and for `--fix --yes`, exit code is 1 iff a CRITICAL issue exists: warning-only findings exit 0 and apply no fixes. Never use bare `--fix` as a dry-run gate — the default invocation (no `--fix`) is the report-only gate. With zero detected issues, bare `--fix` is a silent no-op that exits 0. Exit code is 1 iff a CRITICAL issue exists; warning-only findings exit 0 and apply no fixes.

## Done when

- `node {skillsRoot}/ws-check-workflows/scripts/check_workflows.cjs` exits 0 (or `--report` wrote `ws-check-workflows-report.md` with 0 critical).
- If `--fix`: `--yes` passed and re-run exits 0.
