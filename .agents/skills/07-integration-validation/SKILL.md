---
name: 07-integration-validation
description: Plans and executes a pre-PR integration test battery. Detects stack via config.json; generates pass/fail report by AC. Stack-agnostic.
version: 2.0
disable-model-invocation: true
---

# integration-validation

Final integration validation before opening a PR — last deterministic safety net before delivery.

## Mandatory pre-reading

- `config.json` + `tools.md` + `stack.md` (`.agents/skills/us-workflow/`)
- `AGENTS.md` — hub routing

## Input

- `*.plan.md` required
- `specPath` or `*.spec.md` — canonical source of ACs
- US number (optional; to resolve spec via GitHub)

## Step 1 — Test plan

Read plan, ACs from `*.spec.md`, verification/delivery reports. Generate `*.integration-test.plan.md` with 8 sections:

1. **Prerequisites** — URLs (from `config.json.stack.backend.apiHost` + `config.json.stack.frontend.devHost`), credentials, migrations (`migrations-apply`), seed (`seed-db`)
2. **Data seed** — entities, seed strategy, minimum dataset per AC, cleanup between iterations
3. **Build & tests** — `build-backend`, `test-backend`, `build-frontend` (+ `test-frontend` if i18n/UI)
4. **API / backend** — REST endpoints, auth headers (Bearer JWT), status codes, ProblemDetails
5. **Permissions & security** — RBAC matrix × expected result; tenancy (`config.json.domain.tenancyField`)
6. **UI / browser** — routes, navigation, forms, visible i18n (all locales from `config.json.stack.frontend.i18n.locales[]`)
7. **Evidence** — screenshots, network responses, command outputs
8. **Exit criteria** — all ACs pass; defects logged with severity

## Step 2 — Execute

1. Ensure clean working tree (warn the invoker)
2. Run build + automated tests (§3)
3. Populate seed (§2); confirm prerequisites (§1)
4. Run API checks (§4) and permissions (§5)
5. **UI/browser (§6):** only when authorized (user confirms, or orchestrator is normal/non-auto/non-dry-run). Otherwise, skip and note.
6. Write `*.integration-test.report.md`: pass/fail per AC

## Output

- `*.integration-test.plan.md`
- `*.integration-test.report.md`

## References

- AC format: `spec-format`
- Guardrails: `config.json.rules` + project
- Architecture spec: `config.json.domain.architectureSpec`

## Code of conduct

- **Never decide browser on its own** — explicit authorization
- **Does not fix code** — report gaps; fix is `implement-tasks` (fix)
- Maximum **3 iterations** of validation

## Triggers

- `@[integration-validation] us-{id}.plan.md`
- Dispatch workflow — Step 11
