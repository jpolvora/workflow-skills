---
name: matrix-view-patterns
description: Default Matrix patterns for new list/form screens (hash routing, cursor lists, filters, breadcrumbs, back navigation, shared UI). Use when writing implementation plans, vibe-coded UI prompts, or adding pages under web/src — especially admin/platform CRUD.
---

# Matrix view patterns

**When to load:** [AGENTS.md](../../../AGENTS.md) § Skill loading (before list/form/hash CRUD UI work). **Apply** on every new screen plan or UI implementation unless the user/spec names a different layout (wizard, single combined page, dashboard-only, tree canvas, etc.).

## Quick start

1. Find the **closest existing feature** in [STANDARDS.md](STANDARDS.md) and mirror its file split, API shape, and components.
2. **List + form → separate views** on one route; hash selects record (`#new` or `#<guid>`); row actions deep-link via hash.
3. Ship **list capabilities end-to-end**: search/filters (if needed), cursor pagination, row actions, i18n, integration tests for list API.

## Default layout: list vs form

| Piece | Responsibility |
|-------|----------------|
| `{Feature}Page.tsx` | Reads `useLocation().hash`, parses via `{feature}Hash.ts`, renders list **or** form |
| `{Feature}ListView.tsx` | Title, optional search/filters, `Card` + row grid, `LoadMoreButton`, links to form hash |
| `{Feature}FormView.tsx` | Create/edit/detail; loads by id; back link to list path (no hash) |
| `{feature}Hash.ts` | `parse*Hash`, `*ListPath`, `*CreatePath`, `*EditPath` — validate GUIDs; `#new` for create |

**Do not** embed full create/edit forms inside the list component unless explicitly requested.

### Hash conventions

- List: `/admin/members` (empty hash)
- Create: `/admin/plans#new`
- Edit: `/admin/members#<memberId>` (GUID only in hash; invalid hash → list)
- Register new hash kinds — see [BREADCRUMBS.md](BREADCRUMBS.md)

## Breadcrumbs & checklists

- **Placement (mandatory):** Always render breadcrumbs in the **current view content area** — never in the sticky topbar (`AppHeader`). Default path: `AdminLayout` → `PageView` → `Breadcrumb` above page content. Do not re-add crumbs to the header; custom layouts outside `AdminLayout` must include their own in-view trail.
- **Breadcrumbs & back:** [BREADCRUMBS.md](BREADCRUMBS.md) — required for every new route.
- **List / form / API:** [CHECKLISTS.md](CHECKLISTS.md)
- **Reference features & components:** [STANDARDS.md](STANDARDS.md)

## Member identity in the UI

- **Default:** show the per-company **member slug** (`company_members.Slug`, derived from email local-part, e.g. `john-doe`) — not `MemberId` / user GUIDs.
- **Routes and hash edit paths** may use slug or GUID; APIs resolve both via `MemberKeyResolver`.
- **Do not** surface raw member/user IDs in labels, tables, tree detail rows, or confirm dialogs unless the user or spec explicitly asks for technical IDs (support/debug).
- **API calls** may still use `member.id` (GUID) where the endpoint requires it (impersonation, admin activate, wallet); keep IDs internal when a slug-backed route exists.

## Consistency

- Read [DESIGN.md](../../../DESIGN.md) for tokens (`var(--color-*)`), typography, tree colors — not ad-hoc hex
- Reuse `web/src/components/ui/*` — do not duplicate button/card/input styles
- Match spacing rhythm of reference views: `h1` margin 0, `Card` `marginTop: 24`, search `maxWidth: 400`
- New routes: document in [README.md](../../../README.md); wire in app router same as sibling features

## Overrides

Follow explicit user/spec instructions when they conflict (combined list+form, modal drawer, member-facing page, read-only table). State the override in the plan.

## Plans and standards

When authoring `docs/superpowers/plans/*` or vibe-coded tasks: link this skill; name reference features from [STANDARDS.md](STANDARDS.md); list API params, hash routes, and breadcrumb/back deliverables. Project-wide UI rules go in STANDARDS.md, not Memories.
