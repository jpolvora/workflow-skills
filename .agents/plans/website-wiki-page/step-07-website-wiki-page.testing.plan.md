---
slug: website-wiki-page
step: 7
workflowId: website-wiki-page-20260912T152056Z
status: active
startedAt: "2026-09-12T15:39:35Z"
planRef: step-02-website-wiki-page.plan.refined.md
specRef: step-00-website-wiki-page.spec.md
---
# Step 7 Testing Plan — website-wiki-page

## Scope

Pre-PR testing for the GitHub Pages wiki snapshot feature: `bin/build-wiki-site.js`, `bin/build-site.js` wiki wiring, generated `docs/wiki/**`, landing nav/sitemap, wiki CSS, and `test/test-site-wiki.js`.

**Out of scope this run:** browser/E2E (`skip-browser: true`), mutation testing (`defaults.skipMutationTesting: true`), DB seeds, API/RBAC, dev-server startup.

## Verification Commands

| Priority | Command | Alias / role | Maps to |
|----------|---------|--------------|---------|
| 1 | `node test/test-site-wiki.js` | wikiSiteTest | AC1–AC17, NS1–NS8 (fixture/temp dirs) |
| 2 | `node test/test-doc-sync.js` | buildSiteCheck (partial) | Landing headings, package version, real-tree `--check` |
| 3 | `node bin/build-site.js --check` | buildSiteCheck | AC8, AC9, AC10 stale detection on tracked tree |
| 4 | `npm run tests:harness-efficiency` | harness-efficiency | CI gate including wiki + doc-sync + validate-spec |
| 5 | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | stack scan | Path containment, HTML escape, CLI flags, sync fs |
| — | `npm run test` | backendTest | Full suite (optional/time-boxed; not required when focused gates green) |

## Unit & Coverage Gaps vs Changed Files

| Changed area | Coverage |
|--------------|----------|
| `bin/build-wiki-site.js` | Full via `test/test-site-wiki.js` (emit, renderer, links, check, sitemap locs, skip, sync, no-network) |
| `bin/build-site.js` | CLI unknown flags, integrated `--check`, sitemap rewrite via site-wiki + doc-sync |
| `docs/wiki/**` | Real-tree freshness via `build-site.js --check` and doc-sync |
| `docs/index.html` nav | `testLandingNavWikiHref` |
| `docs/assets/css/style.css` wiki selectors | `testWikiCssUsesThemeTokens` |
| `FEATURES.md`, `README.md` | `testDocsMentionPublishedWiki` |
| `.agents/specs/0077-website-wiki-page.spec.md` | `test-validate-spec` in harness-efficiency |

No uncovered AC rows per Step 5 ledger. No additional unit files required for Step 7.

## Integration / API / DB

| Surface | Plan |
|---------|------|
| HTTP API | **N/A** — static file generation only |
| DB seeds | **N/A** — no database |
| Cross-service | **N/A** |

## UI / E2E

| Check | Plan |
|-------|------|
| Browser navigation wiki → feature → home | **Skipped** (`skip-browser: true`; static HTML already asserted in unit tests) |
| JS-disabled content | Covered by `testContentPresentWithoutJs` |

## Feature-Quality AC Checklist

| AC | Observable outcome |
|----|-------------------|
| AC1 | `docs/wiki/index.html` + domain feature HTML emitted from markdown |
| AC2 | HTML5 chrome + depth-correct stylesheet paths |
| AC3 | Relative `.md` links rewrite to `.html`; external/mailto/`#` preserved |
| AC4 | Landing `.nav-links` and `.dot-nav` include `href="wiki/"` |
| AC5 | Wiki pages link back to landing (`../` / `../../`) |
| AC6 | XSS payloads escaped; no live `<script>` or `javascript:` href |
| AC7 | Path containment; no copy outside `docs/wiki/` |
| AC8 | Stale wiki makes `--check` non-zero; stderr names `docs/wiki` |
| AC9 | Fresh tree `--check` exit 0 |
| AC10 | Sitemap lists wiki directory + feature locs |
| AC11 | Headings, lists, code, links render in article layout |
| AC12 | Wiki CSS uses `--text-main`, `--accent-cyan`, etc.; no neon/glow |
| AC13 | Article body in static HTML without client fetch |
| AC14 | Unknown CLI flags still Usage + exit 1 |
| AC15 | `test-site-wiki.js` listed in harness-efficiency |
| AC16 | FEATURES/README mention published Wiki |
| AC17 | `validate_spec --mode=authoring` exit 0 |

## Accessibility / Contrast

Static wiki pages (no forms). Verify wiki article selectors use theme tokens with sufficient contrast:

- `.wiki-article` body text: `color: var(--text-main)` on `var(--bg-card)`
- Links: `color: var(--accent-cyan)` on card/body backgrounds
- Dark (`:root`) and light (`[data-theme="light"]`) token pairs already meet site-wide ≥4.5:1 targets; `testWikiCssUsesThemeTokens` asserts token usage (no ad-hoc low-contrast colors).

## Mutation

**Skipped.** `defaults.skipMutationTesting: true` and `verification.mutationTest` empty.

## Regression Sabotage

**Skipped.** Greenfield feature; AC ledger marks all rows `sabotage.status: not-required` (no caller-authored invert patches for defect-class regressions).

## Defect Threshold

Step 7 **fails** if any planned command exits non-zero, or mutation/sabotage (if enabled) reports `failed`.
