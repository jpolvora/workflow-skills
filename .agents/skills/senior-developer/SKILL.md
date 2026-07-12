---
name: senior-developer
description: >
  Senior .NET 10 / C# engineering standards for the Matrix repo: CLEAN CODE, SOLID,
  EF Core entity classes, CLI-only migrations, layered architecture, and project conventions.
  Tests for every new feature, regression test for every bug fix, code-review proof before completion,
  mandatory docs sync when implementation changes product or domain context (see DOCS-SYNC.md),
  and read/write of learned knowledge in MEMORY.md (pre-read before implement; append via learning on completion).
  Load with gabarito, karpathy-guidelines, caveman full, and matrix-view-patterns per AGENTS.md § Skill loading.
  Apply on every task in this repository—backend, tests, infrastructure, and cross-cutting changes.
---

# Senior Developer — Matrix

**Auto-activated every response** unless the user opts out in-thread (`skip senior-developer`). **Layer 1 load order:** [AGENTS.md](../../../AGENTS.md) § Skill loading. Karpathy wins on diff size; this skill wins on Matrix architecture.

## Session marker (first reply only)

Openers, opt-outs, precedence: [AGENTS.md](../../../AGENTS.md) § Skill loading and § Precedence. Karpathy wins on diff size; this skill wins on Matrix architecture. Apply implicitly; do not lecture about the marker.

## Learned knowledge ([MEMORY.md](../../../MEMORY.md))

**Read before you implement.** Root `MEMORY.md` is the cross-session log of decisions, test patterns, and pitfalls ([learning](../learning/SKILL.md) appends on completion). Before new features, bug fixes, or non-trivial refactors:

1. **Grep or skim** entries related to the task — feature name, slice, area (`withdraw`, `outbox`, `AuthContext`, mobile CSS, tenancy, etc.).
2. **Apply** recorded decisions and helpers (e.g. `DrainNotificationOutboxAsync`, `RunInactiveMemberWithdrawCancelJobAsync`, breakpoint constants).
3. **Avoid** mistakes already documented (race conditions, `permissionsLoaded` traps, inline-style media queries, orphan-route assumptions).

| Phase | Action |
|-------|--------|
| Session start / task kickoff | Read task-related `MEMORY.md` entries ([AGENTS.md](../../../AGENTS.md) § Skill loading) |
| Stuck or repeating a failure | Re-check `MEMORY.md` for the same symptom |
| Task complete | Append new insight via [learning](../learning/SKILL.md); cite in proof `**Learning:**` line |

Q&A with no implementation: pre-read optional; completion still uses `Learning: N/A` when nothing new was learned.

## Stack

| Layer | Project | Role |
|-------|---------|------|
| Core | `Matrix.Core` | Entities (`class`), DTOs (`record` OK), interfaces |
| Infrastructure | `Matrix.Infrastructure` | EF, configurations, migrations, services |
| API | `Matrix.Api` | Controllers, pipeline |
| Tests | `Matrix.Tests` | Unit + integration |

**.NET 10.** Thin controllers; domain in services. Read `docs/superpowers/specs/2026-05-27-matrix-saas-design.md` (+ activation spec when touching plans/ledger).

## EF & API

- Entities: **`class`** + `IEntityTypeConfiguration<>` in Infrastructure.
- **Migrations (VERY IMPORTANT):** never create or edit `Migrations/*` by hand; never substitute raw SQL for normal schema work. Always use `dotnet ef` (see [ef-migrations.mdc](../../../.cursor/rules/ef-migrations.mdc)).

```bash
dotnet ef migrations add <Name> -p src/Matrix.Infrastructure -s src/Matrix.Api
dotnet ef database update -p src/Matrix.Infrastructure -s src/Matrix.Api
```

- Tenancy: global filters + `CompanyId`; `IgnoreQueryFilters()` only on vetted `/api/v1/platform/*`.
- **3×3 BFS** placement, child-count locking, UTC timestamps, **ProblemDetails**, secrets from env.
- Test **tenant isolation** on cross-tenant paths.
- **Authorization attributes:** `Program.cs` has `FallbackPolicy = RequireAuthenticatedUser` — all endpoints require auth by default. Use `[AllowAnonymous]` only on explicitly public actions (login, register, public site). Use `[RequirePermission(...)]` on actions/controllers for RBAC. Use `[RequireGlobalAdmin]` on platform controllers. Use `[RequireFeatureFlag(...)]` for gated features. Minimal-API endpoints (`MapGet`, `MapOpenApi`) need `.AllowAnonymous()` if public.

## Testing (mandatory)

Full policy: [TESTING.md](TESTING.md). Summary: feature → new test; bug fix → regression test + run `dotnet test` / `npm test` this session; never delete tests to silence failures.

## Code review proof (before “done”)

```markdown
## Code review proof

**Scope:** …
**Karpathy check:** …
**Spec / tenancy:** …
**Tests:** [files; regression name if bug fix; `dotnet test` / `npm test` — Passed: N, Failed: 0]
**Docs sync:** [files updated] | N/A — see [DOCS-SYNC.md](DOCS-SYNC.md)
**Learning:** [MEMORY.md entry title] | N/A (no new project knowledge) — see [learning](../learning/SKILL.md)
**Changelog:** [CHANGELOG.md entry] | N/A (no implementation/change history needed) — see [changelog](../changelog/SKILL.md)
**Findings fixed:** …
**Residual risk:** … (optional)
```

Checklist: lines trace to request; EF via CLI; tenancy/placement; feature or regression tests run this session; `npm run build` if UI touched; **[learning](../learning/SKILL.md) run** — append `MEMORY.md` or justify N/A in proof; **[changelog](../changelog/SKILL.md) run** for implementation/change history.

Escalate multi-file work to code-reviewer subagent when available.

## Docs sync

When product/API/routes/terms change: [DOCS-SYNC.md](DOCS-SYNC.md) — same session, proof line required.

## Frontend

Load [matrix-view-patterns](../matrix-view-patterns/SKILL.md) per **AGENTS.md** § Skill loading. `DESIGN.md`, `tokens.css`, reuse `web/src/components/ui/`. `npm run build` (and `npm test` for locale). Manual check in proof if no automated test.

## Do not

Hand-written migrations; `record` entities; unvetted `IgnoreQueryFilters()`; new libraries without need; generic UoW; controllers/actions without proper auth attributes (`[RequirePermission]`, `[RequireGlobalAdmin]`, or `[AllowAnonymous]` — FallbackPolicy covers auth-required baseline, but RBAC must be explicit); start implementation without checking task-related [MEMORY.md](../../../MEMORY.md) entries; complete without Karpathy + tests + proof + [learning](../learning/SKILL.md); fix bugs via Memories/chat rules instead of code ([AGENTS.md](../../../AGENTS.md) § Implementation errors).
