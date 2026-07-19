---
name: ws-integration-validation
description: Plans and executes pre-PR testing — unit tests, integration/E2E, coverage, testing quality, and feature quality.
upstream: jpolvora/workflow-skills — this skill is a spec-to-pr pipeline dependency. Improvements must be submitted upstream to https://github.com/jpolvora/workflow-skills
version: 2.3
disable-model-invocation: true
invocation_names:
  - integration-validation
  - ws-integration-validation
  - 07-integration-validation
---

# 07-integration-validation (Testing)

Responsible for planning and executing the pre-PR **testing** battery. Scope includes unit tests, integration and E2E flows, coverage signals, testing quality (assertions, fixtures, flakiness), and feature quality against acceptance criteria. It serves as the final safety net before branch updates are pushed.

## Persona

Act as a **Release Engineer / QA Lead** who plans and executes a comprehensive testing battery, verifies end-to-end user flows, checks RBAC permissions, and guarantees database schema stability.

---

## Invocation

### Standalone Mode

```
/integration-validation <plan-path> [spec=<spec-path>] [skip-browser]
```

### Workflow Mode (Step 7 of spec-to-pr)

Dispatched by `spec-to-pr` at Step 7. Receives `planPath` and `specPath` from the orchestrator state. UI browser testing requires explicit authorization.

**Auto-skip (orchestrator):** Step 7 is skipped when `skipTesting` or legacy `skipIntegration` is set, or when there is no meaningful test surface and unit tests are already green. This skill does not decide skip — the orchestrator does.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `<plan-path>` | String | (required) | Path to refined plan (`step-02-*.plan.refined.md`) or draft plan (`step-01-*.plan.md`). |
| `spec=<spec-path>` | String | (optional) | Path to `step-00-*.spec.md`. Inferred from folder if omitted. |
| `skip-browser` | Flag | `false` | Skip browser-agent/UI testing and only run backend/API tests. |

---

## Prerequisites

Check the following before starting testing:
- `config.json` — resolves local dev server URLs (e.g. `apiHost`, `devHost`), locales list, and DB seed keys.
- Ensure the codebase builds cleanly (backend + frontend).
- Confirm database migrations have been successfully applied.

---

## Phase 1 — Testing Plan

Generate `step-07-{slug}.testing.plan.md` containing:
1. **Unit & coverage:** Commands from `config.json.verification`, target areas, coverage gaps vs changed files.
2. **Target Hosts & Ports:** Resolves URLs and credentials using stack settings.
3. **Database State & Seeding:** Minimum seed datasets required per AC, and database rollback actions.
4. **API Contracts:** Expected HTTP status codes, Bearer JWT authorization headers, and error shapes.
5. **RBAC & Tenancy Isolation:** Systematic checking of access control across roles, and data segregation filters.
6. **Integration & E2E paths:** Cross-service flows, UI/browser routes, form fields, and translation checks.
7. **Feature quality:** AC checklist mapped to observable outcomes (not only happy-path API 200s).
8. **Defect Thresholds:** Test case pass/fail metrics.

---

## Phase 2 — Execution & Reporting

1. **Verify Base Build:** Execute build and core test commands from `config.json.verification`.
2. **Unit tests:** Run project unit test suites; note failures and missing coverage on touched code.
3. **Apply Database Seeds:** Verify seed constraints and cleanups.
4. **Run API / integration checks:** Probe endpoints using `curl` or script runners.
5. **UI / E2E validation:** Run browser automation or visual checks unless `skip-browser` is active.
6. **Report Output:** Write the results to `step-07-{slug}.testing.report.md`.

---

## Outputs

- **Plan:** `step-07-{slug}.testing.plan.md`
- **Report:** `step-07-{slug}.testing.report.md`

**Legacy names (do not write on new runs):** `step-11-{slug}.integration-test.plan.md`, `step-11-{slug}.integration-test.report.md` — orchestrator may read for resume compatibility only.

---

## Rules of Engagement

- **No Code Fixes:** This skill does not make code edits. If verification checks fail, report the gaps and transition back to [04-implement-tasks (fix mode)](../04-implement-tasks/SKILL.md).
- **A11y & Contrast:** Verify form validation errors and alert indicators are visible and high-contrast.
