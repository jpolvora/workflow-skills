---
slug: us-459
title: "ws-kanvas board: add phase color coding and replace hardcoded grey/transparent styling"
status: completed
step: 1
workflowId: wf-us-459
startedAt: "2026-09-29T18:56:18Z"
endedAt: "2026-09-29T18:57:49.491Z"
acRefs: []
---
## 0. Summary & Business Rules

Restyle only the `<style>` block of `.agents/skills/ws-kanvas/refs/board.html` so the six board
columns carry a distinct, phase-keyed color cue and every surface (column, card, drop-target,
popup, popup backdrop) uses theme-aware colors instead of the hardcoded `#888` border and
`background: transparent` card fill. The board already stamps `section.dataset.columnId`, so cues
key off `.column[data-column-id="..."]` custom properties. The phase label text in each column
header stays the primary differentiator; color is a redundant cue.

Business rules:
- `color-scheme: light dark` is already declared, so styling must derive from system colors
  (`Canvas`, `CanvasText`, `Highlight`) and `color-mix()` derivations rather than fixed surfaces.
- One accent hue per phase; the same accent tints the column border, the header underline, the card
  surface, and the drop-target outline for that column (custom property inheritance).
- Plain system-color fallbacks precede every `color-mix()` declaration so unsupported engines
  degrade to legible Canvas/CanvasText rather than dropping the surface.
- Visual-only: no `<script>`, no `api/board` / `api/card` / `api/move` contract, no column-set or
  drag-and-drop change.

## 1. Definition of Ready & Scope

**In scope (product edit — 1 file, `<style>` block only):**
| File | Region |
|------|--------|
| `.agents/skills/ws-kanvas/refs/board.html` | the single `<style>` element (lines ~7–37); no line in the `<script>` block changes |

**Out of scope:**
- `<script>` block, `scripts/collect.cjs`, `scripts/move.cjs`, `scripts/server.cjs`, API payloads.
- Column set / workflow state model, user-configurable themes, new files or dependencies.

**Measurable ACs:** AC1–AC5 from `step-00-us-459.spec.md`, with negative scenarios NS1–NS5.

## 2. Technical Design & Architecture

Single layer `skills-sot` (`.agents/skills`). CSS-only; no runtime/schema/installer change beyond
the integrity manifest that hashes `board.html`.

Design:
- Define six phase accents as `--phase-accent` custom properties on `.column[data-column-id="…"]`
  (backlog, sprint, development, staging, production, abandoned): `#64748b`, `#3b82f6`, `#8b5cf6`,
  `#d97706`, `#16a34a`, `#dc2626`.
- `.column` sets fallbacks `--phase-accent: CanvasText`, `border: 1px solid CanvasText`,
  `background: Canvas`, then overrides with `border-color: color-mix(in srgb, var(--phase-accent) 55%, Canvas)`,
  `border-inline-start: 4px solid var(--phase-accent)`, and
  `background: color-mix(in srgb, var(--phase-accent) 6%, Canvas)`.
- `.column h2` gains `border-bottom: 2px solid var(--phase-accent)` (header accent, AC1).
- `.card` sets `border: 1px solid CanvasText` / `background: Canvas` fallbacks then
  `border-color: color-mix(in srgb, var(--phase-accent) 40%, Canvas)` and
  `background: color-mix(in srgb, var(--phase-accent) 10%, Canvas)`; `--phase-accent` is inherited
  from the parent column.
- `.column.drop-target` keeps `outline: 3px solid Highlight` as fallback and adds
  `outline-color: var(--phase-accent)` (AC4, palette-consistent per column).
- `#popup-backdrop` replaces `rgba(0,0,0,0.4)` (theme-blind) with `background: CanvasText` fallback
  then `background: color-mix(in srgb, CanvasText 45%, Canvas)`.
- `#popup` replaces `border: 1px solid #888` with `border: 1px solid CanvasText` fallback then
  `border-color: color-mix(in srgb, CanvasText 30%, Canvas)`; keeps `background: Canvas; color: CanvasText`.

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true`; all others N/A (no
entities, migrations, tenancy, EF, or secrets surface). `board.html` is hashed install content, so
`npm run generate-integrity` must run before ship.

## 3. Step-by-Step Plan

1. Replace the `.column`, `.card`, `#popup`, and `#popup-backdrop` surface literals and add the six
   `.column[data-column-id]` `--phase-accent` definitions + `.column h2` header accent in the
   `<style>` block. (`skills-sot`) — satisfies AC1, AC2, AC3, AC4 (`board.html`).
2. Literal guard: confirm zero `#888` and zero `background: transparent` remain inside `<style>`
   (AC2, NS2).
3. Diff guard: confirm the `board.html` hunk range intersects only the `<style>` block and the
   `<script>` block is byte-identical (AC5, NS3).
4. Behavior suites: `node test/test-kanvas-board.js` and `node test/test-kanvas-drag-drop.js` stay
   green (AC5, NS4).
5. Stack-invariant scan: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs
   --stack typescript-node` reports no new findings (NS5).
6. Contrast check: verify body text (#CanvasText on the tinted surfaces) stays ≥ 4.5:1 in both
   schemes, and accent hues are pairwise distinguishable in light and dark (AC1, AC3, NS1).
7. Regenerate integrity manifest for the changed `board.html` hash (ship precondition).

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, tenancy, route guard, or i18n string. Labels remain the server-provided column
titles unchanged; language is en-us.

## 5. Test Coverage

| AC | Named check |
|----|-------------|
| AC1 | Six `.column[data-column-id="…"]` `--phase-accent` values present and pairwise distinct; header underline uses the accent; `V1` render-cue check in light + dark |
| AC2 | `rg -n "#888" .agents/skills/ws-kanvas/refs/board.html` → 0 in `<style>`; `rg -n "background:\s*transparent"` → 0 (`V2` literal search) |
| AC3 | `V3` contrast probe: body-text ratio ≥ 4.5:1 on tinted Card/Column surfaces in both schemes; every `.column h2` retains its text label |
| AC4 | `V4` drop-target renders with `outline-color: var(--phase-accent)`; `#popup`/`#popup-backdrop` use Canvas/CanvasText mixes |
| AC5 | `V5` `node test/test-kanvas-board.js` + `node test/test-kanvas-drag-drop.js` exit 0; `git diff` on `board.html` touches only `<style>` |
| NS1 | Palette rejection rule: any candidate hue failing the AC3 ratio is reworked before ship |
| NS2 | `V2` literal regression guard fails on a reintroduced `#888`/`transparent` surface |
| NS3 | `V5` behavior guard: any `<script>` hunk fails the visual-only rule |
| NS4 | `V5` suite regression blocks the change |
| NS5 | `scan_stack_invariants.cjs --stack typescript-node` → no new findings |

## 6. Stack & Security Invariants Verification Plan

Touched boundaries: none of authorization, concurrency/async safety, DTO validation, or
subscription/lifecycle cleanup — the diff is CSS text inside a static HTML reference file, so
`strict-type-safety`, `floating-promise`, `boundary-validation`, `path-traversal`, and
`resource-leak` hold by non-contact. Verification: `git diff` proves zero `<script>` lines changed;
`node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`
reports no new findings.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (single `skills-sot` file).
- [x] No domain entity / mapping changes (N/A).
- [x] No schema migration (N/A).
- [x] No authorization surface (N/A).
- [x] Stack & security invariants verified by non-contact (`scan_stack_invariants.cjs`).
- [x] No i18n keys introduced.
- [x] Test cases cover all ACs (AC1–AC5).
- [ ] Integrity manifest regenerated.

## 8. Open Questions

None — the spec's Assumptions table delegates palette hues and cue form to the implementer within
the contrast budget; both are resolved above (mid-tone hex accents, border/header-underline cue).
