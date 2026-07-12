# TDD / SDD / DDD Reviewer — Reference

Backend (.NET/C#) and frontend (React/TypeScript) audit criteria for Matrix. Read [senior-developer](../senior-developer/SKILL.md) for authoritative Matrix architecture.

---

## Matrix conventions (check first)

These override generic DDD/CQRS advice when they conflict.

| Area | Matrix rule |
|------|-------------|
| **Entities** | `class` in `Matrix.Core` with public `{ get; set; }` for EF Core — **not** `record` entities |
| **DTOs** | `public record` in `Matrix.Core/DTOs` (primary-constructor records OK) |
| **EF** | `IEntityTypeConfiguration<>` in Infrastructure; CLI migrations only — no hand-written migrations |
| **Layers** | Core ← Infrastructure ← Api; domain logic in Infrastructure services implementing Core interfaces |
| **CQRS / MediatR** | **Not used.** Thin controllers → scoped services → `DbContext`. Do not flag absence of MediatR |
| **Tenancy** | Global `CompanyId` filters; `IgnoreQueryFilters()` only on vetted `/api/v1/platform/*` |
| **Placement** | BFS at activation; max 3 children; advisory lock / transactional child count |
| **API** | RFC 7807 `ProblemDetails`; secrets from environment |
| **Tests** | New behavior + bug fixes need tests per senior-developer; tenant isolation on cross-tenant paths |
| **Frontend i18n** | Keys in **both** `pt-BR` and `en-US` when strings change |
| **Frontend fetch** | Existing patterns: `AuthContext`, `useCursorList`, custom hooks — not TanStack Query |

---

## TDD / SDD / DDD rules

### SDD (spec-driven design)

- Changed behavior must match the relevant spec under `docs/superpowers/specs/`.
- Domain terms in code/comments match [`CONTEXT.md`](../../../CONTEXT.md) (glossary only — do not duplicate product rules there).

### DDD (Matrix-aligned)

- **Separation:** `Matrix.Core` has zero references to Infrastructure, EF, or ASP.NET.
- **Entities:** EF-mapped `class` entities; validation/business invariants in services or dedicated validators — do not require private setters on EF entities.
- **Services:** Infrastructure implements `Matrix.Core` interfaces (`IActivationService`, etc.); controllers stay thin.
- **Domain events:** Use existing `IDomainEventLogger` / audit patterns — do not introduce new event buses without spec.

### TDD

- **Testability:** Flag static time, hidden singletons, or DB-in-constructor patterns that block unit/integration tests.
- **Frontend:** Prefer `@testing-library/react` queries by role/label; avoid testing implementation details.

### React frontend alignment

- **Contracts:** TS types match backend DTOs (`AuthDtos`, cursor list payloads, etc.).
- **Hooks:** Reuse `web/src/hooks/*` and layout patterns from [matrix-view-patterns](../matrix-view-patterns/SKILL.md) for new screens.
- **State:** Clear loading/error handling in fetch paths; flag stale `useEffect` closures when they cause bugs.

---

## Backend audit criteria (C# .NET)

Apply within the [code-review](../code-review/SKILL.md) touch set (whole changed files + one-hop references). Flag systemic layer violations even outside the diff hunk.

### Modern syntax (suggestions on touched code)

- Prefer collection expressions `[1, 2]` over verbose `new List<int> { … }` when editing nearby code.
- Prefer file-scoped namespaces when creating new files.
- DTOs: keep `public record`; do not convert entities to `record`.

### Performance and memory

- Flag LINQ over-enumeration (`.Any()` then loop on same `IEnumerable`).
- Suggest `Span<T>` only for hot paths — not drive-by refactors.
- `sealed` on new middleware/services is a nice-to-have, not a review blocker.

### Async / await

- **No** `async void` except UI/event handlers.
- **No** `.Result`, `.GetAwaiter().GetResult()`, or `.Wait()` on async paths.
- New/changed API actions should accept and propagate `CancellationToken`.
- **ConfigureAwait:** Do not require `.ConfigureAwait(false)` in ASP.NET Core app code (Api/Infrastructure hosted services). Optional in portable library code outside this repo.

### DI and quality

- Flag captive dependencies (Singleton injecting Scoped `DbContext`).
- NRT compliance on new/changed code paths.
- `using var` for short-lived disposables.

### Defensive security (architecture angle)

- EF: LINQ or `FromSqlInterpolated` only — no string-concat SQL.
- `RandomNumberGenerator` for security tokens — not `System.Random`.
- No hardcoded secrets — use `IConfiguration` / env.

For exploit-focused review, use [security-review](../security-review/SKILL.md).

---

## Frontend audit criteria (React and TypeScript)

- **No `any`** on props, API responses, or state touched by the diff.
- **`useMemo` / `useCallback`:** Flag only when missing memo causes measurable re-render bugs or unstable deps — not blanket requirements.
- **Data fetching:** Loading, error, and empty states handled; align with existing hooks (`useCursorList`, `AuthContext`, etc.).
