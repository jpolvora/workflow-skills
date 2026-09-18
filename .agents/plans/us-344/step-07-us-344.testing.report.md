---
step: 7
slug: us-344
workflowId: us-344-20260918T114109Z
status: completed
startedAt: "2026-09-18T11:41:09Z"
endedAt: "2026-09-18T18:35:00Z"
acRefs: []
---
# Testing Report — us-344 (change website cta / main slug/slogan)

## Verdict: PASS (AC7 Implemented)

Zero-diff docs-only KEEP of `From Spec to Delivery`. All Step 7 checks applicable to
this change class ran fresh and green. Full `npm run test` suite intentionally not run
(see § Backend suite scoping). Mutation, sabotage, and browser substeps skipped per
policy with machine evidence below.

## Scope

- Workflow `files_touched: []`, `commits: []` (state.json) — no product surface touched.
- AC7: "Site and docs verify green — site rebuild (as applicable) plus repo checks for
  touched areas pass with no new failures."
- Applicable execution for this class: slogan-consistency sweeps (AC2–AC6 ground truth
  re-run), static HTML validity of `docs/index.html`, read-only site-currency check.

## Checks Run (fresh this step)

| # | Check | Command | Exit | Result |
|---|-------|---------|------|--------|
| T1 | Losing-variant sweep | `grep -rni "from spec to ship" docs/ README.md AGENTS.md CATALOG.md FEATURES.md .agents/skills/ws-shared/AGENTS.md .agents/specs/wiki/` | 1 | Zero hits — no stale `Ship` variant anywhere |
| T2 | Delivery consistency sweep | `grep -rni "from spec to delivery" docs/ README.md AGENTS.md CATALOG.md FEATURES.md .agents/skills/ws-shared/AGENTS.md` | 0 | 10 hits, all expected (see below) |
| T3 | Wiki absence | `grep -rni "From Spec to" docs/wiki/ .agents/specs/wiki/` | 1 | Zero hits — nothing to sync |
| T4 | FEATURES history verbatim | `grep -n "From Spec to" FEATURES.md` | 0 | L300 only — historical 0.3.47 row |
| T5 | Hub/catalog absence | `grep -rni "From Spec to" AGENTS.md .agents/skills/ws-shared/AGENTS.md CATALOG.md` | 1 | Zero hits — in sync by absence |
| T6 | README + llms.txt lines | `grep -n "From Spec to" README.md docs/llms.txt` | 0 | README L3/L13 + llms.txt L3, all `Delivery` |
| T7 | HTML structure parse | `python3 html.parser` tag-balance probe over `docs/index.html` | 0 | Balanced, no errors, doctype + `</html>` present (212896 bytes) |
| T8 | JSON-LD validity | `python3` extract + `json.loads` both `application/ld+json` blocks | 0 | 2/2 valid; block0 description contains `delivery` |
| T9 | Site currency (read-only) | `node bin/build-site.js --check` | 0 | `Site is current: 54 skills across 5 layers`; wiki 11 pages |
| T10 | Docs tree clean | `git status --short -- docs/ README.md FEATURES.md docs/llms.txt` | 0 | No output — no drift |

### T2 Delivery hits (verbatim, 10 lines)

- `docs/llms.txt:3` — header
- `docs/index.html:6` — `<title>`
- `docs/index.html:7` — meta description
- `docs/index.html:11` — meta keywords
- `docs/index.html:16` — `og:title`
- `docs/index.html:20` — `twitter:title`
- `docs/index.html:39` — JSON-LD `description`
- `README.md:3` — tagline
- `README.md:13` — intro
- `FEATURES.md:300` — historical 0.3.47 release row (keep verbatim)

Head/hero inspection (`sed -n 1,45p` + `160,178p docs/index.html`): hero `h1`
`From Spec to <span>Delivery</span>`; subtitle is PR-handoff wording (no slogan);
CTA row `Install with npx` / `Explore the pipeline` (no slogan). Matches Step 5/6
evidence exactly — no drift since re-anchor.

### T4 FEATURES L300 (verbatim)

`| **0.3.47** | Aug 28 | **Docs/site:** LLM-agnostic From Spec to Delivery hero and CTAs; honest remaining-todo roadmap; DoR/TDD and spec-memo dual routing on FEATURES, README, and the public site |`

## Site Rebuild Note (AC7 "as applicable")

`bin/build-site.js` exists and regenerates `docs/index.html` generated regions
(features grid, catalog, footer version stamp) — but the slogan surfaces (head meta,
JSON-LD, hero `h1`) are hand-authored prose outside those regions. A full rebuild was
correctly NOT run: this workflow owns zero product lines, and a write-mode rebuild
would stamp foreign-batch drift (e.g. `v0.4.35`→`v0.4.36`) onto the file and dirty the
tree. The read-only `--check` mode (T9, exit 0) proves generated regions are current
without writes. No rebuild drift is attributable to this workflow.

## Backend Suite Scoping (Step 5 alias carried forward)

- Alias `backendTest` = `npm run test` (only non-empty verification alias in
  `config.json.verification`). Ledger `aliasResults[0]`: `exitCode 0`,
  `skipReason: not-applicable`, `commandHash 0c7ec4aa…9513b`.
- Justification (unchanged from Step 5): docs-only zero-diff change class — no backend
  surface exists to exercise; the full suite is long and the tree holds foreign-batch
  work, so a run would misattribute unrelated failures to this workflow.
- This step honors that skip: suite NOT re-run. AC7 is satisfied by T1–T10 above.

## Mutation

- Status: `skipped`.
- Reason: `verification.mutationTest` is empty AND `defaults.skipMutationTesting` is
  `true` (config.json L113, L126) — both skip rules fire. No engine to run.

## Regression Sabotage

- Status: `skipped` (not-applicable).
- Reason: zero-diff docs-only keep-decision; no regression assertion exists and no code
  path to invert. Ledger `sabotage.required: false`, `status: not-required` for all
  AC1–AC7. No invert patch authored; nothing to restore.

## Browser / UI-E2E

- Status: `skipped`.
- Reason: `hostBinding.browserTool: "none"` (state.json) and no UI behavior change
  (wording keep-decision; layout untouched). No authorized surface to drive.

## Accessibility / Contrast (form errors and alerts)

- N/A — no forms, validation errors, or alert indicators exist in this change class
  (static slogan prose; zero product lines touched).

## Memory Consult

- Local (`.agents/skills/ws-shared/MEMORY.md` + `memory/*.md`, grep
  `slogan|From Spec to`): zero hits.
- Vault (spec-memo MCP `search`, query `slogan testing docs-sync`, limit 5): `[]` —
  zero hits.
- Verdict: no blocking constraints; no new durable trap (standard verification rerun).

## Files Touched (this step)

- Created: `.agents/plans/us-344/step-07-us-344.testing.report.md` (this report)
- Modified: none. Deleted: none. Product tree untouched (read-only honored).

## Next Step

Ready for Step 8 ship gate. No defects found; no handoff to implement fix mode.
