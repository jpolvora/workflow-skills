---
step: 6
slug: us-461
workflowId: wf-us-461
status: completed
startedAt: "2026-09-29T19:45:02Z"
endedAt: "2026-09-29T20:20:00Z"
acRefs: []
---
# Code review — us-461

**Base:** `develop` pre-change tip `6b5cf76f` (run baseline; PR head `develop` → base `main`)
**Diff:** `git diff 6b5cf76f...HEAD` (`90bac02b`)
**Scope:** 6 files
- `.agents/skills/ws-kanvas/refs/board.html` (M, additive viewer: CSS + renderer + toggle)
- `.agents/skills/ws-kanvas/scripts/collect.cjs` (M, `discoverSpecFiles` split + `isInsideSpecsDir` + `readSpecMarkdown`)
- `.agents/skills/ws-kanvas/scripts/server.cjs` (M, `GET /api/spec` branch only)
- `bin/skill-integrity.json` (M, regenerated hashes)
- `test/test-kanvas-spec-viewer.js` (A, V1–V7 suite)
- `test/test-suites.json` (M, one registration row)

## Verdict

Clean with one non-blocking suggestion — 0 Critical, 0 Warning, 1 Suggestion (declined by design, no fix commit).

## Phase 1 — Triage

Adversarial scan of the committed diff against the `node-skills-package` stack rule pack and AC1–AC7.
New surfaces: one loopback read-only route, one path-confined file reader, one escape-first renderer,
one popup toggle. No writes, no git, no network beyond loopback, no new dependency.

| Candidate hypothesis | Disposition |
|----------------------|-------------|
| Traversal via crafted slug reaches `fs` | Discarded: `isValidSlug` gates both the route (400) and the helper (typed `not-found`); the file is re-derived from discovery by slug, never from caller input; `resolveInside` + realpath re-verification refuse escapes before any read. |
| Symlinked/junctioned spec escapes `specsDir` | Discarded: junctions/symlinks report `isSymbolicLink()=true` so discovery never yields them as cards (probed: `discovered: []`); the realpath prefix check refuses them anyway at the unit level (`isInsideSpecsDir` → false). |
| Stored XSS via spec content in `innerHTML` | Discarded: `renderMarkdown` escapes `&<>"` before formatting; V5 asserts no `<script`/`<img` node survives and script-scheme hrefs are dropped; the error sink `esc()`s server text. All other `innerHTML` sinks are pre-existing and unchanged. |
| `javascript:` URL executes from a spec link | Discarded: scheme allowlist (`http`/`https`/`mailto`/relative/fragment); anything else renders as label text with the URL dropped (V5 + scheme tests). |
| `/api/board`, `/api/card`, `/api/move` contract drift | Discarded: server diff adds one branch after `/api/card`; no existing handler line changes; V6 probes all three contracts live; both existing kanvas suites green. |
| Double directory scan (`collectBoard` + `discoverSpecFiles`) | Suggestion S1 (below): retained as documented trade-off, no fix. |
| `package.json` dependency drift | Discarded: `git diff` on `package.json` is empty; require-graph scan asserts stdlib + relative only; no remote `<script src>` in the page. |
| Integrity manifest drift | Resolved in-diff: regenerated; `npm run verify-integrity` matches. |

## Phase 2 — Adversarial investigation

S1 (double scan): `readSpecMarkdown` runs `collectBoard` (for card existence/type parity with
`/api/card`) and then `discoverSpecFiles` (for the absolute path). Merging the two passes would
couple the security-critical path derivation to the display-path contract or duplicate `getCard`
semantics. Specs directories are small (tens of files); the extra scan is bounded, read-only, and
per-popup-open. Declined by design — no fix, no follow-up.

No hypothesis satisfied all four proof parts with a retained defect, so no fix commit was made.

## Generalize defect class

Sibling scan: `innerHTML =` sinks in `board.html` — the three new sinks are escaped/static (L207
renderer output, L211 `esc()`d error, L214 static); pre-existing sinks (L232/L272 `esc()`d,
L256/L310/L317 empty, L348/L365 static) are untouched. No sibling module duplicates the
slug→file resolution (single implementation in `readSpecMarkdown`; the endpoint delegates).
`move.cjs` has zero hunks.

## MEMORY sweep

Applicable compiled entries were folded before implementation: BOM stripping (`/^\uFEFF/` with an
explicit escape, applied to config-adjacent spec reads and to the new markdown payload),
ac-ledger `L`-prefix/`--test` space-form/one-file-per-call rules (all 25 link calls green),
scoreState boundary sequencing (`pre-step6` persisted with commit linkage), single-server-probe
invocations, and integrity regen after every skill edit. No violations found in the diff.

## Stack invariant compliance

| Check | Result |
|-------|--------|
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack node-skills-package` on the diff | 0 findings |
| Path confinement (new read surface) | lexical + realpath, refused-before-read, V3 battery |
| Output encoding (new HTML sink) | escape-first + scheme allowlist, V5 battery |
| Loopback-only / stdlib-only / no-new-dependency | unchanged; V7 guards |
| `config.json.invariants` (`commitPlanFilesOnlyAtStep8: true`) | Respected — product commit holds only the 6 product/test/manifest files |

## Diff quality

Surgical: every changed line traces to AC1–AC7. Additive except the `discoverSpecs` split (same
output shape, covered by the unchanged board suite). No adjacent code, comments, or formatting
touched; `package.json` untouched.

**Apply fixes?** No — clean (S1 declined by design).
