---
name: ws-spec-format
description: Specification schema & validator — defines canonical *.spec.md format, section hierarchy, and acceptance criteria rules.
version: 0.3.56
invocation_names:
  - spec-format
  - ws-spec-format
---

# ws-spec-format

> When this skill is loaded, output "ws-spec-format loaded."

Create, review, or format `*.spec.md`. Canonical format SoT — other skills **reference** this skill; they do not duplicate frontmatter/sections. Schema: [`FORMAT.md`](FORMAT.md). Language: **en-us**.

**Specs family:** Role = schema + validate/reshape. Free-text draft → [`ws-spec-write`](../ws-spec-write/SKILL.md) (writes `{specsDir}`); register → [`ws-spec-provider-local`](../ws-spec-provider-local/SKILL.md). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

## Modes

| Mode | When | Output |
|------|------|--------|
| **create** | Feature / tracker without local spec | New canonical `*.spec.md` |
| **review** | Gaps or format drift | Gap report + proposed fixes (edit only with approval) |
| **format** | Valid content, nonstandard shape | Reformatted file or proposed diff |

Infer mode or ask. Triggers: `/ws-spec-format`, `@ws-spec-format`, create/review/format/validate phrasing.

CLI: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs [--help] [--mode=authoring|compat] <spec>`. Default **compat** (historical files: warn on missing closure / DoR / Validation Notes, do not fail). **authoring** is required for new `ws-spec-write` writes (Out of Scope + Assumptions tables, plus non-empty `## Definition of Ready (DoR)` and `## Validation & Observation Notes`).

## Review (Done when report emitted; no edit without approval)

1. Read `*.spec.md` (or `{us-dir}/`).
2. Validate frontmatter, required sections, AC quality per [`FORMAT.md`](FORMAT.md). Tracker specs (`github` / `azure-devops`) must include `### Prior Work Sweep` when sweep ran. Modification/bugfix specs must include `### Design Intent` or documented greenfield skip. New specs: authoring-mode closure (`## Out of Scope`, `## Assumptions & Open Questions`, `## Definition of Ready (DoR)`, `## Validation & Observation Notes`).
3. Cross-check architecture docs when present (`CONTEXT.md`, stack file, `config.json.domain`).
4. Emit check table (Frontmatter / Description / ACs → OK|FAIL + fix).
5. Edit only on explicit `apply fixes` / `format`.

## Create (Done when path confirmed)

1. Collect title, description, ACs (or provider fetch).
2. Free-text local draft → [`ws-spec-write`](../ws-spec-write/SKILL.md) → `{specsDir}/{slug}.spec.md` (not `{plansDir}`).
3. GitHub issue → `ws-spec-provider-github` `fetch-to-spec` (fetches raw issue, runs `ws-spec-write` to reformulate/enhance for agentic work while preserving original human context, then registers via `ws-spec-provider-local`).
4. ADO WI → `ws-spec-provider-azure-devops` `fetch-to-spec` (fetches raw WI, runs `ws-spec-write` to reformulate/enhance, then registers via `ws-spec-provider-local`).
5. Existing hand-written `*.spec.md` → `ws-spec-provider-local` register/normalize (no invented tracker fields).
6. Confirm path with complete frontmatter + sections (`{specsDir}` for standalone; `{us-dir}/step-00-` after register/workflow).

## Downstream

`ws-spec-to-pr`, `ws-plan-write`, `ws-plan-interview`, `ws-plan-verify`, `ws-testing` read **`{us-dir}/step-00-{slug}.spec.md`** only — never live tracker APIs or `*.issue.json`. See [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md).

Providers: [ws-spec-provider-github](../ws-spec-provider-github/SKILL.md) · [ws-spec-provider-azure-devops](../ws-spec-provider-azure-devops/SKILL.md) · [ws-spec-provider-local](../ws-spec-provider-local/SKILL.md) · [ws-spec-write](../ws-spec-write/SKILL.md). Hub: [`AGENTS.md`](../ws-shared/AGENTS.md).

