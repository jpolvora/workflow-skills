---
slug: us-461
title: kanvas modal option to show full spec content in .md rendered
status: completed
step: 1
workflowId: wf-us-461
startedAt: "2026-09-29T19:45:02Z"
endedAt: "2026-09-29T19:52:00Z"
acRefs: []
---
## 0. Summary & Business Rules

Add a read-only spec-content viewer to the `ws-kanvas` card popup: a toggle control inside the
existing modal fetches the card's spec of record through a new `GET /api/spec?slug={slug}`
endpoint and renders its Markdown with a small dependency-free renderer. The viewer is look-only:
it never edits, saves, or commits anything, and the existing `GET /api/board`, `GET /api/card`,
and `POST /api/move` contracts are byte-identical.

Business rules:
- Content source is `card.links.spec` (the spec of record); resolution reuses `collectBoard` +
  `getCard` so the endpoint shares the collector's slug contract.
- Reads are confined to `{specsDir}`: lexical containment (`resolveInside`) plus realpath
  re-verification before read, so traversal segments, absolute paths, and symlinked escapes are
  refused with a typed error and the file is never read.
- Rendering HTML-escapes the spec text before formatting; raw HTML in the spec is visible escaped
  text, never executed.
- Zero new `package.json` dependencies; Node 22 stdlib only; loopback-only; self-contained page
  (no CDN).
- Missing/unreadable `links.spec` shows a bounded "spec unavailable" message with the typed error
  reason, never a crash or unhandled rejection.

## 1. Definition of Ready & Scope

**In scope (product edits):**
| File | Change |
|------|--------|
| `.agents/skills/ws-kanvas/scripts/collect.cjs` | New exported `readSpecMarkdown(roots, slug)` helper: resolves the card, confines the read to `{specsDir}` (lexical + realpath), returns `{ slug, path, markdown }` or a typed error; read-only, no network |
| `.agents/skills/ws-kanvas/scripts/server.cjs` | New `GET /api/spec?slug={slug}` route delegating to `readSpecMarkdown`; existing routes untouched |
| `.agents/skills/ws-kanvas/refs/board.html` | Popup toggle control + dependency-free synchronous pure `renderMarkdown` (string in, HTML string out) covering headings, emphasis, inline code, fenced code blocks, links, unordered/ordered lists, paragraphs; escaped HTML first |
| `test/test-kanvas-spec-viewer.js` (new) + `test/test-suites.json` | Endpoint contract, traversal/XSS/unknown-slug negatives, renderer subset + escape checks, renderer extracted from `board.html` for DOM-free unit testing |

**Out of scope:**
- `scripts/move.cjs`, board columns, drag-and-drop, `/api/card` payload shape.
- Editing/saving specs, full CommonMark/GFM, plan/state rendering, CDN libraries, attachment assets.

**Measurable ACs:** AC1–AC7 from `step-00-us-461.spec.md`, with negative scenarios NS1–NS7.

## 2. Technical Design & Architecture

Single layer `skills-sot` (`.agents/skills`) + `tests` (`test/`). No runtime/schema/installer change
beyond the integrity manifest that hashes the touched skill files.

Design:
- `readSpecMarkdown({ specsDir, plansDir, indexPath }, slug)`:
  1. Reject non-`isValidSlug` input as `{ error: { code: 'not-found', ... } }` (same typed shape as
     `getCard`; the server maps it to 404, mirroring `/api/card`).
  2. `collectBoard(roots)` then `getCard(board, slug)`; propagate its typed error.
  3. Map `card.links.spec` (a display path, repo-relative) back under `specsDir`: take the basename
     chain relative to the specs dir listing. Concretely: re-derive the spec file by scanning
     `discoverSpecs(specsDir, cwd)` for the matching slug instead of trusting the display string —
     this removes one traversal hop entirely.
  4. Containment: `resolveInside(specsDir, rel)` must be non-null, then `realpath` both the file's
     existing ancestor chain and `specsDir` and require the resolved file to start with the resolved
     root + separator (symlink-escape refusal per the 2026-09-21 write-containment trap — adapted to
     reads: refuse, never read).
  5. `fs.readFileSync`; strip a leading BOM for display consistency; return
     `{ slug, path: <repo-relative display path>, markdown }`.
  6. Missing/unreadable file → `{ error: { code: 'spec-unavailable', slug, message } }` (HTTP 404
     with a distinct code so the popup can render the bounded message).
- `server.cjs`: `if (url.pathname === '/api/spec')` branch after `/api/card`, same query-param
  handling (`slug` param, `isValidSlug` gate → 400 `{ code: 'not-found' }`, else helper result →
  200 or 404). No change to any other handler.
- `board.html`:
  - `renderMarkdown(md)`: synchronous pure function. Pipeline: split into fenced code blocks first
    (placeholder-protect), escape HTML (`&<>"`), then block-parse headings (`#{1,6}`), unordered
    (`- `, `* `) and ordered (`N. `) lists, paragraphs; inline-parse `code`, `**bold**`, `*em*`,
    `[text](url)` with URL-scheme allowlist (`http:`, `https:`, `mailto:`, `#`, relative — anything
    else renders as text). Expose as `window.__kanvasRenderMarkdown` for the test harness (guarded
    `typeof window` so the IIFE stays DOM-free-testable via extraction).
  - Popup: a "Show spec" / "Hide spec" toggle button after the `<dl>`; on show, `fetch` the endpoint,
    render into a `#spec-view` container (max-height + scroll); on error show the bounded message;
    on hide collapse. No page reload, no navigation.
  - AC1 toggle observability without a browser: the test extracts the `<script>` block, stubs a
    minimal DOM/fetch harness is overkill — instead the test asserts (a) the toggle control markup
    and handler wiring exist in the page source, (b) `renderMarkdown` show/hide state transitions via
    the pure renderer plus a tiny extracted state helper, and (c) the live endpoint round-trip.

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true`; no entities, migrations,
tenancy, EF. `board.html`/`server.cjs`/`collect.cjs` are hashed install content, so
`npm run generate-integrity` must run before ship. Stack scan:
`scan_stack_invariants.cjs --stack node-skills-package` (spec DoR names this stack id).

## 3. Step-by-Step Plan

1. `collect.cjs`: add `readSpecMarkdown` + export it; keep `discoverSpecs` read-only contract.
   (`skills-sot`) — satisfies AC2, AC3 (`collect.cjs`).
2. `server.cjs`: add the `GET /api/spec` branch mirroring `/api/card` error shapes. — AC2, AC3.
3. `board.html`: add `renderMarkdown` + popup toggle + `#spec-view` container + bounded error text.
   — AC1, AC4, AC5.
4. New `test/test-kanvas-spec-viewer.js`: endpoint 200/not-found, traversal variants refused,
   XSS escape, renderer subset constructs, URL-scheme guard, toggle wiring presence, missing-file
   bounded error; register in `test/test-suites.json`. — AC1–AC5, NS1–NS4.
5. Behavior guards: `node test/test-kanvas-board.js` + `node test/test-kanvas-drag-drop.js` green;
   diff touches only the four allowed paths; `package.json` dependencies byte-identical. — AC6, AC7,
   NS5–NS7.
6. Stack-invariant scan: `scan_stack_invariants.cjs --stack node-skills-package` → no new findings.
7. Regenerate integrity manifest for the changed skill hashes (ship precondition).

## 4. Permissions, Tenancy & i18n

N/A — no RBAC, tenancy, route guard, or i18n string. Popup labels are en-us literals matching the
existing board vocabulary ("Show spec", "Hide spec", "Spec unavailable").

## 5. Test Coverage

| AC | Named check |
|----|-------------|
| AC1 | `V1` toggle control + show/hide wiring present in `board.html`; renderer show/hide round-trip with no reload (source + pure-function assertions); missing-file bounded message |
| AC2 | `V2` live `GET /api/spec?slug=<known>` → 200 `{ slug, path, markdown }`; unknown slug → typed non-200 not-found |
| AC3 | `V3` traversal slugs (`../`, absolute, encoded separators, symlink escape fixture) → typed error, no `markdown` field |
| AC4 | `V4` fixture spec with heading/emphasis/inline-code/fence/link/ul/ol/paragraph renders each as its element |
| AC5 | `V5` `<script>` + `<img onerror>` fixture → escaped visible text, no script node, no event-handler attribute in output |
| AC6 | `V6` `test-kanvas-board.js` + `test-kanvas-drag-drop.js` exit 0; `git diff --stat` allowlist |
| AC7 | `V7` `package.json` dependencies diff empty; server/collect require-graph is stdlib + relative helpers only |
| NS1 | `V3` traversal battery (incl. encoded + symlink) |
| NS2 | `V5` XSS battery |
| NS3 | `V2` unknown-slug case |
| NS4 | `V1` missing-file case → bounded message, no throw |
| NS5 | `V6` diff allowlist (no column/DnD/move hunks) |
| NS6 | `V6` existing kanvas suites |
| NS7 | `V7` dependency guard |

## 6. Stack & Security Invariants Verification Plan

Touched boundaries: path-confinement reads (new endpoint), HTML output encoding (new renderer),
loopback-only server surface (new route on the existing loopback server).
- `path-traversal`: `readSpecMarkdown` enforces lexical `resolveInside` + realpath re-verification;
  `V3` battery covers traversal/absolute/encoded/symlink variants; file is never read on refusal.
- `xss / output-encoding`: renderer escapes `&<>"` before formatting; `V5` asserts no `<script>` node
  and no `on*=` handler survives; link URLs are scheme-allowlisted.
- `loopback-only`, `stdlib-only`, `no-new-dependency`: no new `require` beyond `node:`/relative;
  `V7` guards `package.json`; server still binds 127.0.0.1 only.
- Verification: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack node-skills-package` reports no new findings.

## 7. Pre-PR Checklist

- [x] Layer boundaries respected (`skills-sot` + `tests` only).
- [x] No domain entity / mapping changes (N/A).
- [x] No schema migration (N/A).
- [x] No authorization surface (N/A).
- [x] Stack & security invariants verified (§6 + scan).
- [x] No i18n keys introduced.
- [x] Test cases cover all ACs (AC1–AC7) and negatives (NS1–NS7).
- [ ] Integrity manifest regenerated.

## 8. Open Questions

None — the spec's Assumptions table delegates endpoint shape and renderer depth to the implementer
within the stated constraints; both are resolved above (`GET /api/spec`, escaped minimal subset).
