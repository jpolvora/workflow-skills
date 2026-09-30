---
id: 461
slug: us-461
title: kanvas modal option to show full spec content in .md rendered
source: github
specDate: 2026-09-29
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/461"
step: 0
workflowId: us-461
status: completed
startedAt: "2026-09-29T18:50:00.630Z"
endedAt: "2026-09-29T18:50:00.630Z"
acRefs: []
---
# Specification — kanvas modal option to show full spec content in .md rendered

## Description

The `ws-kanvas` board card popup (`.agents/skills/ws-kanvas/refs/board.html`) shows card metadata only (`Slug`, `Column`, `Phase`, `AC count`, `Plan step/status`, `Evidence`, `Links`). To read a card's spec the operator must open the file on disk. Add a popup option that loads the spec of record (the `*.spec.md` named by `card.links.spec`) through a new read-only server endpoint and renders its Markdown in the modal, without leaving the board.

Technical scope: a new `GET /api/spec?slug={slug}` handler in `scripts/server.cjs` that reuses `collectBoard` to resolve the card, confines the read to `{specsDir}`, and returns `{ slug, path, markdown }` or a typed error; a popup control plus a dependency-free Markdown-to-HTML renderer in `refs/board.html` that HTML-escapes content before formatting. The reader is look-only: it does not edit, save, or commit anything, and the existing `GET /api/board`, `GET /api/card`, and `POST /api/move` contracts are unchanged.

Boundaries: `scripts/collect.cjs` (`discoverSpecs` already exposes `file`) may gain a small exported read helper but keeps its read-only, no-network contract; `scripts/move.cjs` is untouched. Node 22 stdlib only, zero new `package.json` dependencies, loopback-only, self-contained page (no CDN).

## Acceptance Criteria

- AC1: The card popup offers a control (toggle button/link) that, when activated, displays the full text of that card's spec of record inside the modal and, when deactivated, hides it; pass when both states are observed with no page reload and no navigation away from the board.
- AC2: `GET /api/spec?slug={slug}` returns HTTP 200 with JSON `{ slug, path, markdown }` for a known slug and a typed not-found response for an unknown slug; pass when both responses are observed (`path` is the repo-relative spec path; `markdown` is the file text).
- AC3: The endpoint reads only inside `{specsDir}`; a slug that would resolve outside it (path traversal segment, absolute path, or a symlinked escape) is refused with a typed error and the file is never read; pass when crafted traversal slugs return an error and no content is returned.
- AC4: The rendered view shows Markdown structure — headings, emphasis, inline code, fenced code blocks, links, unordered and ordered lists, and paragraphs — as HTML; pass when a fixture spec containing each construct renders each as its corresponding element.
- AC5: Rendering HTML-escapes the spec text before formatting, so a spec containing `<script>` or other raw HTML tags renders them as visible escaped text and never executes; pass when an injected `<script>` fixture yields no script node and displays the tags as text.
- AC6: Existing behavior is preserved — the collect/card/move APIs, board columns, and drag-and-drop are unchanged, and `node test/test-kanvas-board.js` plus `node test/test-kanvas-drag-drop.js` pass; pass when both suites are green and the diff touches only `refs/board.html`, `scripts/server.cjs`, optional `scripts/collect.cjs`, and new/updated kanvas tests.
- AC7: No new runtime dependency is introduced; pass when `package.json` dependencies are unchanged and the server requires no module beyond Node 22 stdlib and the existing relative helpers.

## Original Issue Context

Original GitHub issue jpolvora/workflow-skills#461 (state: open, labels: none, comments: none). The issue body was empty; the title is preserved verbatim below. Scope above was derived by reading the `ws-kanvas` skill (`SKILL.md`, `refs/board.html`, `scripts/collect.cjs`, `scripts/server.cjs`).

**Title**

kanvas modal option to show full spec content in .md rendered

### Prior Work Sweep

Provider `sweep-prior-work` ran with `--issue 461`, keywords `kanvas modal spec content markdown render`, and `--files .agents/skills/ws-kanvas/refs/board.html .agents/skills/ws-kanvas/scripts/server.cjs`. Result: zero exact open PR for this tracker id; the three returned PRs (#370, #270, #223) are loose `#461` text/merge matches, not implementations. Prior commits touching the two files are the board's original build and its review rounds (`4e13f401`, `200cdafe`, `f7f62964`, `441d2eff`, `9669794a`, `7bcaf9dd`, `5bf9a048`) — none adds a spec-content viewer. No blocking or reusable in-flight work found; proceed.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editing or saving spec content from the modal | Read-only viewer; the board never mutates specs |
| Full CommonMark/GFM compliance | A small safe subset covers spec files without a dependency |
| Rendering the plan/state or other Markdown files | Only the spec of record named by `card.links.spec` |
| Server-side writes, git operations, or network calls | Loopback read-only endpoint |
| CDN scripts or external Markdown libraries | Self-contained page; zero new dependencies |
| Rendering visual-attachment assets inline | Markdown text only; assets out of scope |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Endpoint shape | New `GET /api/spec?slug={slug}` | Keeps `/api/card` lean; mirrors the existing `/api/card` query contract | n |
| Renderer depth | Minimal dependency-free subset (headings, emphasis, code, links, lists, paragraphs; escaped HTML) | Skill rule forbids new dependencies; spec files need no more | n |
| Control placement | A toggle inside the existing card popup | Keeps the board grid unchanged and reuses the modal | n |
| Content source | `card.links.spec` (spec of record) | Popup already links it; single source of truth | n |
| Missing/unreadable `links.spec` | Show a bounded "spec unavailable" message with the typed error reason | Avoids a blank modal; matches the board's warning style | n |
| Absent requirement dimensions | N/A for retries, persistence, auth, concurrency, data lifecycle, or state transitions (read-only view) | Keeps the spec bounded without invented criteria | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Changes limited to `refs/board.html`, `scripts/server.cjs` (and optional `scripts/collect.cjs` read helper) plus tests | `git diff` shows no other product files |
| Atomic criteria | AC1-AC7 each carry an explicit pass condition | Re-read AC list; every AC names its check |
| Failure modes | Traversal, XSS, unknown slug, and suite regressions are named red states | Negative scenarios below cover each |
| Observation telemetry | Endpoint, render, security, and suite signals are named | Telemetry list below |
| Zero open blockers | Endpoint shape and renderer depth are implementer-chosen within constraints | Assumptions table records both; no external input needed |
| Stack invariants (node-skills-package) | Loopback-only, stdlib-only, path-confined reads, no new dependencies | `scan_stack_invariants.cjs --stack node-skills-package` reports no new findings |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `curl "http://127.0.0.1:4173/api/spec?slug=us-461"` (or the kanvas test client) returns 200 JSON with `slug`, `path`, and non-empty `markdown`.
- An unknown slug returns a typed not-found error with a non-200 status.
- A traversal slug (`../`, absolute path, encoded separators) returns a typed error and no file content.
- A fixture spec with `<script>` renders as escaped visible text (no script node) in the popup.
- `node test/test-kanvas-board.js` and `node test/test-kanvas-drag-drop.js` pass; a new kanvas spec-viewer test covers the endpoint and renderer.
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack node-skills-package` reports no new findings.
- Full `npm run test` stays green as the non-regression gate.

### Negative & Failing Test Scenarios

- Traversal: `/api/spec?slug=..%2f..%2fetc%2fpasswd` (and variants) must be refused with a typed error and must not read outside `{specsDir}` (covers AC3).
- XSS: a spec body containing `<script>alert(1)</script>` and `<img onerror=...>` must render as escaped text, and no script/event handler node may be created (covers AC5).
- Unknown slug: `/api/spec?slug=us-does-not-exist` returns a typed not-found (non-200), never a 200 with empty content (covers AC2).
- Missing file: a card whose `links.spec` file was removed shows a bounded "spec unavailable" message, not a crash or an unhandled promise rejection (covers AC1/AC6).
- Behavior guard: any hunk touching board columns, drag-and-drop, or the move API payload shape fails the AC6 visual-only/behavior-preserved rule.
- Suite regression: a failing run of either existing kanvas suite blocks the change until behavior is restored.
- Dependency guard: adding a runtime dependency to `package.json` fails AC7.

## Notes

- Reuse `discoverSpecs`' `toDisplayPath`/`resolveInside` conventions so the endpoint shares one containment rule with the collector instead of re-implementing path safety.
- Read the file with `fs.readFileSync` and size-bound the response only if a spec exceeds a sane limit; spec files are small, so no cap is required unless the test surface shows otherwise.
- Keep the renderer synchronous and pure (string in, HTML string out) so `test-kanvas-board.js` can unit-test it without a DOM.
- Do not add a second Markdown renderer elsewhere; this viewer is the only one in `ws-kanvas`.
