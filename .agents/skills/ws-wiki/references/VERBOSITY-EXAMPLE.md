# Verbosity before/after (`condensed` vs `detailed`)

Both examples use the new conditional template. `condensed` is the default. `detailed` disables terse rewriting for wiki bodies.

## Condensed (default)

```markdown
# User Management

> Provenance: `README.md`, `src/users/*`, spec `0001-user-management.spec.md`.

## Feature

Manages user accounts. Covers signup, profile view, role assignment.

## How it works

User signs up with email. Email unique per tenant. Admin assigns role.

## Backend

Model `UserEntity`. Route `POST /api/v1/users`. Validates email format.
```

## Detailed (rich)

```markdown
# User Management

> Provenance: `README.md`, `src/users/*`, spec `0001-user-management.spec.md`.

## Feature

User Management lets workspace administrators onboard people, keep profiles accurate, and control who can do what. It covers self-service signup, the admin user list with search, the profile form, and role assignment. This page omits `Frontend` details for the batch import job and keeps `Third-party services` only where an external mail provider is involved.

## How it works

Users sign up feature by feature: they submit email and password on the signup screen, the application service checks email uniqueness per tenant and password length, then creates the account in a pending state. Administrators review the queue, approve or reject with a reason, and assign one of `viewer`, `editor`, or `admin`. Approval publishes a domain event that provisions default preferences. Rejected signups stay listed for audit but cannot sign in.

## Backend

The `User` aggregate persists via `UserEntity` with a unique index on `(tenantId, email)`. `UserAppService` exposes `POST /api/v1/users`, `GET /api/v1/users/{id}`, and `POST /api/v1/users/{id}/approve`. DTOs validate email format and role membership. Side effects include a welcome email and an audit row. Concurrency uses optimistic revision on profile updates.

## Frontend

The Angular `users` page mirrors the backend states with a searchable table, a profile drawer, and role chips guarded by the `manage-users` permission. Form errors surface per-field messages without clearing typed input.

## Third-party services

Omitted here: no external provider participates in this flow. A fiscal integration page would keep this section (for example, the invoice issuer and its retry policy).
```

## Notes

- Each conditional section (`Backend`, `Frontend`, `Third-party services`) is written only when it makes sense; omit with no placeholder.
- Legacy 3-section pages map as: `Feature Overview` into `Feature`; `Business Rules & Logic` into `How it works` + `Backend`; `Technical Architecture` into `Backend` / `Frontend` / `Third-party services`.
