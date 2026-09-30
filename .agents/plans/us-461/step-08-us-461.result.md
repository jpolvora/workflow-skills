---
slug: us-461
title: kanvas modal option to show full spec content in .md rendered
status: completed
step: 8
workflowId: wf-us-461
startedAt: "2026-09-29T19:45:02Z"
endedAt: "2026-09-29T20:40:00Z"
acRefs: []
---
# us-461 — Delivery Result

## Expected

A read-only spec-content viewer in the `ws-kanvas` card popup: a toggle loads the card's spec of
record through a new endpoint and renders its Markdown in the modal, with no navigation away:

- **AC1** — The popup offers a show/hide control for the full spec text; both states observed with
  no page reload and no navigation.
- **AC2** — `GET /api/spec?slug={slug}` returns 200 `{ slug, path, markdown }` for a known slug and
  a typed not-found for an unknown slug.
- **AC3** — Reads are confined to `{specsDir}`; traversal/absolute/linked escapes are refused with
  a typed error and never read.
- **AC4** — Headings, emphasis, inline code, fenced code blocks, links, ul/ol, and paragraphs render
  as HTML.
- **AC5** — Spec text is HTML-escaped before formatting; injected `<script>` renders as visible
  escaped text and never executes.
- **AC6** — Collect/card/move APIs, columns, and drag-and-drop unchanged; both existing kanvas
  suites green; diff confined to the allowlist.
- **AC7** — No new runtime dependency; stdlib + existing relative helpers only.

## Done

- `scripts/collect.cjs`: new exported `readSpecMarkdown(roots, slug)` — resolves the card via
  `collectBoard`+`getCard`, re-derives the file from discovery by slug, enforces lexical
  `resolveInside` plus realpath re-verification (`isInsideSpecsDir`), strips BOM, returns
  `{ slug, path, markdown }` or typed `not-found`/`spec-unavailable`/`outside-specs-dir`.
- `scripts/server.cjs`: new `GET /api/spec?slug={slug}` branch mirroring `/api/card` (400 malformed
  slug, 404 typed errors, 200 payload); all other handlers byte-identical.
- `refs/board.html`: synchronous pure `renderMarkdown` (escaped subset + scheme-allowlisted links)
  plus a "Show spec"/"Hide spec" popup toggle fetching `api/spec` into a scrollable `#spec-view`
  with a bounded "Spec unavailable" message; columns/DnD/move wiring untouched.
- `test/test-kanvas-spec-viewer.js` (new, registered in `test-suites.json`): live endpoint
  contract, traversal battery (plain/encoded/absolute/linked), XSS battery, renderer subset,
  scheme guard, toggle-wiring presence, contract-preservation probes, require-graph + no-CDN guards.
- Check-implementation: **10/10**, all seven ACs implemented with linked evidence; zero known defects.
- Code review: **clean** — 0 Critical / 0 Warning / 1 Suggestion declined by design (double-scan
  trade-off); no fix commit.
- Testing: **pass** — `npm run test` 145/145; all three kanvas suites ok; stack scan 0 findings;
  integrity matches; `package.json` diff empty.
- Ship preconditions: bumped **0.5.16 → 0.5.17**; `bin/skill-integrity.json` regenerated and verified;
  site rebuilt; wiki synced; `index.PRD` synced (`[x]`, spec + context filed to `completed/`);
  changelog appended.

## Next steps

- Batch master merges the `develop` → `main` PR (this run stops before merge per batch policy).
- Optional manual follow-up: open the board in a browser and toggle the spec view in both color
  schemes (not required by the ACs — renderer and endpoint checks already pass).
- Suggested follow-up (out of scope, AC6-frozen): document `GET /api/spec` in the `ws-kanvas`
  SKILL.md endpoint table via a docs-allowlist amendment.

## References

- Spec: `.agents/plans/us-461/step-00-us-461.spec.md`
- Plan: `.agents/plans/us-461/step-01-us-461.plan.md`
- Check: `.agents/plans/us-461/step-05-us-461.plan.report.md`
- Review: `.agents/plans/us-461/step-06-us-461.review.md`
- Testing: `.agents/plans/us-461/step-07-us-461.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | ~60m (single-worker run) |
| Steps executed | 9 (Step 2 skipped: interview-not-required) |
| Total tokens | 0 (not metered by the harness) |
| Lines added | +445 |
| Lines removed | -10 |
| Net LOC delta | +435 (product + tests + integrity manifest) |

### Step breakdown

| Step | Label | Model | Files changed |
|------|-------|-------|---------------|
| 0 | Spec | muse-spark | 2 (spec adopted + ledger init) |
| 1 | Planning | muse-spark | 1 |
| 2 | Interview | muse-spark | 0 (skipped) |
| 3 | Plan to tasks | muse-spark | 0 (gitignored disposable) |
| 4 | Implement | muse-spark | 6 |
| 5 | Verify | muse-spark | 1 + G2 product commit |
| 6 | Code review | muse-spark | 1 (clean, no fix) |
| 7 | Testing | muse-spark | 1 |
| 8 | Close + ship | muse-spark | 2 (delivery) + release sync |
