---
id: null
slug: website-wiki-page
title: "Dedicated GitHub Pages wiki site generated from {wikiDir}"
source: local
specDate: 2026-09-12
status: completed
step: 0
workflowId: website-wiki-page-20260912T152056Z
startedAt: "2026-09-12T15:21:29.358Z"
endedAt: "2026-09-12T15:21:29.358Z"
acRefs: []
---
# Specification — Dedicated GitHub Pages wiki site generated from {wikiDir}

## Description

The public GitHub Pages site for this package (`https://jpolvora.github.io/workflow-skills/`) is a single landing page (`docs/index.html`) rebuilt by `bin/build-site.js`. The living product wiki lives separately at `{wikiDir}` (`plans.wikiDir`, default `.agents/specs/wiki`): `index.wiki.md` plus domain feature pages `{domain}/{feature}.md`. Humans and browsers cannot read that wiki on the published site. They must open markdown in the repo.

This spec adds a **dedicated wiki section of the static site** that publishes the **current** `{wikiDir}` tree as browser-ready HTML:

1. **Build-time snapshot.** Every `node bin/build-site.js` run (with or without `--bump`) reads `{wikiDir}` markdown (index, relative links, domain subpages) and writes a matching HTML tree under `docs/wiki/`. Wiki HTML is not a hand-edited second source of truth.
2. **Stale check.** `node bin/build-site.js --check` fails if generated wiki HTML is missing or differs from regenerating from current `{wikiDir}` (same fail-closed pattern as stale `docs/index.html`).
3. **Navigation.** The landing page (`docs/index.html`) exposes a **Wiki** link to `wiki/` (repo Pages base `/workflow-skills/wiki/`). Wiki pages link back to the landing page. Intra-wiki markdown links (`*.md`, `index.wiki.md`) rewrite to the generated `.html` paths so in-browser navigation works.
4. **Presentation.** Generated pages reuse the existing restrained engineering CSS (`docs/assets/css/style.css`): readable typography, sidebar or in-page TOC from `index.wiki.md` domain catalog, article layout for feature pages, dark/light theme, keyboard-focusable links, no neon/marketing chrome. Reading must work with JavaScript disabled.
5. **Discovery.** `docs/sitemap.xml` lists the wiki index URL and each generated wiki HTML URL. `docs/robots.txt` continues to point at that sitemap.

This is **upstream GitHub Pages only**. It does not ship a consumer website, does not copy `{wikiDir}` into installable skill packages, and does not replace `ws-wiki` markdown as the authoring SoT.

### Design Intent

Greenfield site surface. Existing `build-site.js` injects catalog/version into `index.html` only; omitting wiki HTML is an accidental gap, not a prior constraint against publishing the wiki. Skip git archaeology of a wiki renderer: `git log -p -S "wiki.html"` on `bin/build-site.js` and `docs/` is empty.

### Prior Work Sweep

- Keyword + `git log` on `bin/build-site.js`, `docs/index.html`, `docs/sitemap.xml`, `.agents/specs/wiki/**`: site builder stamps catalog, packages, and footer version; sitemap has the landing page, `llms.txt`, and GitHub repo only. Wiki markdown exists (`docs(wiki): bootstrap…`, `feat(ws-wiki)`). No `docs/wiki/` HTML.
- Specs `0057-modern-website-revamp` (restrained UI, zero-dependency static Pages) and `0075`/`0076` (`ws-wiki` markdown + sweep) are complementary: 0075 authors `{wikiDir}`; this spec publishes it.
- `test/test-doc-sync.js` runs `build-site.js --check` and asserts landing headings. It does not yet assert wiki HTML.
- Package has **no** markdown-to-HTML npm dependency (`marked` / `markdown-it` absent). Keep zero extra runtime deps.
- GitHub: no open PR matching wiki website / wiki HTML site.

## Acceptance Criteria

- AC1: `node bin/build-site.js` (no `--bump`) writes `docs/wiki/index.html` from `{wikiDir}/index.wiki.md` and one HTML file per wiki markdown page under `docs/wiki/{domain}/{feature}.html` mirroring `{wikiDir}/{domain}/{feature}.md`.
- AC2: Generated wiki HTML is a full HTML5 document (doctype, charset, viewport, title from the page H1 or filename, stylesheet link to `../assets/css/style.css` or a depth-correct relative path to `docs/assets/css/style.css`).
- AC3: Relative markdown links to other wiki pages (including `index.wiki.md` and `*.md` with optional `#anchors`) become relative `.html` links that resolve to generated files; external `http(s):` / `mailto:` links stay unchanged; `#` in-page anchors stay.
- AC4: `docs/index.html` nav (and matching section-dot nav if present) includes a Wiki entry pointing at `wiki/` (or `wiki/index.html`) that works on GitHub Pages under the `/workflow-skills/` base path.
- AC5: Each generated wiki page includes a site chrome link back to `../` (landing `docs/index.html`) labeled Wiki or Home so users are not trapped in the wiki tree.
- AC6: Generated article HTML is escaped so raw wiki markdown cannot inject script tags or event-handler attributes (HTML text nodes / attribute encoding). Inline HTML in wiki markdown is not executed as live script.
- AC7: Build reads only files whose resolved path stays inside `{wikiDir}`; `sweep.state.json`, non-markdown files, and paths escaping `{wikiDir}` via `..` are not copied into `docs/wiki/`.
- AC8: When `{wikiDir}` exists and contains `index.wiki.md`, a missing or stale `docs/wiki/**` tree makes `node bin/build-site.js --check` exit non-zero with a message that names the wiki output (not only `docs/index.html`).
- AC9: `node bin/build-site.js --check` with a fresh wiki tree (after a non-check build) exits 0 when both landing HTML and wiki HTML match regeneration.
- AC10: `docs/sitemap.xml` includes `https://jpolvora.github.io/workflow-skills/wiki/` (or `.../wiki/index.html`) and one `<loc>` per generated wiki HTML page; `node bin/build-site.js` rewrites that sitemap in the same run as wiki HTML.
- AC11: Feature wiki pages render headings, lists, fenced code, inline code, and markdown links in a readable article layout; `index.wiki.md` domain catalog remains navigable as a table of contents on the wiki home page.
- AC12: Wiki pages share the existing dark/light theme tokens (no new neon/glow chrome). Contrast for body text and links remains usable in both themes (target ≥ 4.5:1 for body text).
- AC13: Wiki article content is visible without executing JavaScript (no client-only markdown fetch as the only renderer).
- AC14: Unknown CLI flags on `build-site.js` remain rejected (existing `--bump` / `--check` exclusive usage). Wiki generation does not add a required extra flag for the default update path.
- AC15: Tests cover AC1, AC3, AC6, AC7, AC8, and AC10: either extend `test/test-doc-sync.js` or add `test/test-site-wiki.js` listed in `package.json` `tests:harness-efficiency` (or the suite `test-doc-sync` already runs). Fixture or temp `{wikiDir}` plus `--check` stale detection must not mutate the tracked wiki without restore.
- AC16: `FEATURES.md` (when `tracking.featuresMdEnabled` is not false) and human/site docs (`README.md` site/docs mention, or FAQ/nav copy) state that the published site includes a Wiki page generated from `{wikiDir}`.
- AC17: Authoring validation for this specification exits 0.

## Original Issue Context

Standalone `/ws-spec-write` (2026-09-12), free-text:

> create for this repo a dedicated page in website for rendering the current wiki version
>
> when updating website, also updates the wiki page
> the wiki page will renders current wiki in {wikiDir} pages (index, links, subpages, etc) in a nice format that is ready for web/browsers

## Notes

- Stack: `node-skills-package`. New helpers in `bin/` (or a focused `bin/build-wiki-site.js` required from `build-site.js`) stay Node 22 ESM/CJS consistent with `bin/build-site.js`. Prefer a small in-repo markdown subset renderer; do not add npm markdown packages.
- `{wikiDir}` resolution: `config.json` `plans.wikiDir` else `.agents/specs/wiki`, same as `tools.md`.
- CRLF: LF-normalize generated HTML like `docs/index.html` (`html.replace(/\r\n?/g, '\n')`) so Windows `--check` does not flap (trap: build-site CRLF frontmatter; apply the same LF policy to wiki HTML).
- Template strings in `build-site.js` that mention path tokens must use HTML `<code>` not JS-template braces that look like `{wikiDir}` inside backticks (trap: json-state-hub-whitelist-sanitizer).
- Do not load `ws-run-benchmark` for this work.
- Catalog-only later copy fixes may rebuild without bump; this feature changes `bin/` + `docs/` so the ship PR uses one `build-site:bump` per CATALOG Before-ship rules.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing `{wikiDir}` markdown as the wiki SoT | `ws-wiki` remains the authoring contract; HTML is a publish snapshot |
| Generating wiki HTML for consumer installs | `build-site.js` is this package’s GitHub Pages pipeline, not a consumer skill |
| SPA / client-side markdown fetch as the only renderer | Must work without JS; static HTML matches zero-dep Pages |
| Adding `marked`, `markdown-it`, or other npm renderers | Site stays zero-dependency |
| React / Vue / Next wiki app | Same as 0057: static HTML/CSS only |
| Publishing `sweep.state.json` or plan folders | Scratch / `{plansDir}` are not wiki pages |
| Live edit / wiki CMS on the website | Public site is read-only generated docs |
| Changing `ws-wiki` init/sync/sweep ACs | Orthogonal; this spec only publishes existing markdown |
| Host/IDE product names in skill bodies | This change is site/bin/tests, not a new portable skill |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Output layout | Multi-page static tree `docs/wiki/**.html` | Mirrors `{wikiDir}` links; GitHub Pages serves folders; no JS required | y |
| Renderer | Small in-repo markdown subset (headings, lists, links, code, emphasis, paragraphs) | Zero new deps; wiki pages are constrained 3-section markdown | y |
| Missing `{wikiDir}` / missing `index.wiki.md` | Skip wiki emit; `--check` does not require `docs/wiki/` when source wiki is absent | Protects accidental empty trees; this repo always has a wiki | y |
| Auth / rate limits / tenancy | N/A because static file generation, no HTTP API | Stack HTTP/auth dimensions do not apply | y |
| Idempotency | Re-running build with unchanged wiki yields byte-stable HTML (LF) | `--check` must be deterministic | y |
| Base URL | Relative links only (no hardcoded `file://`); sitemap uses `https://jpolvora.github.io/workflow-skills/` | Matches current sitemap and Pages project site | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `bin/build-site.js` (+ optional `bin/build-wiki-site.js`), `docs/wiki/**`, nav/sitemap, tests, FEATURES/README mention | Diff vs current `docs/` + `bin/build-site.js` |
| Atomic criteria | AC1–AC17 binary | `test-doc-sync` / `test-site-wiki` + `validate_spec --mode=authoring` |
| Failure modes | Stale wiki HTML, path escape, XSS markdown, missing wiki source, unknown flags | Negative tests in AC15 |
| Observation telemetry | `--check` stderr names wiki output; build stdout reports wiki page count | Run `node bin/build-site.js` / `--check` |
| Open blockers | None; gray-area defaults in companion | `0077-website-wiki-page.context.md` |
| Stack: path traversal | Wiki reader and writer contain paths under `{wikiDir}` and `docs/wiki/` | Unit tests with `..` in link targets |
| Stack: CLI input | Existing unknown-flag rejection preserved | `build-site.js` usage test |
| Stack: async | Sync `fs` or awaited Promises; no floating Promises | Code review |
| Stack: HTML injection | Escape untrusted markdown text before inner HTML | XSS fixture (AC6) |
| Stack: auth / DTO / subscriptions | N/A because no HTTP API, no Angular | Skip with reason |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node bin/build-site.js` prints a wiki line: page count written under `docs/wiki/` (or skipped if no `{wikiDir}`).
- `node bin/build-site.js --check` exit 0 when landing + wiki HTML match; non-zero stderr includes `docs/wiki` when wiki is stale.
- `docs/sitemap.xml` contains `/wiki/`.
- `npm run tests:harness-efficiency` (or the named wiki site test) exit 0.
- Browser: open `docs/wiki/index.html` locally or via Pages; follow a domain link to a feature page and back.

### Negative & Failing Test Scenarios

- Stale `docs/wiki/index.html` after editing `{wikiDir}/index.wiki.md` without rebuild: `--check` exit non-zero.
- Wiki markdown containing `<script>alert(1)</script>`: generated HTML does not include an executable script element from that payload (escaped or stripped).
- Relative link `../../package.json` or `../../../etc/passwd` in a wiki page: generator does not write outside `docs/wiki/`; link is dropped or rendered as inert text.
- `--specs-dir` / invented wiki-root CLI that resolves outside repo: rejected or ignored; default remains contained `{wikiDir}`.
- Unknown `node bin/build-site.js --wiki-only-typo`: still exit 1 with Usage (no partial wiki write as a new silent flag).
- Missing `index.wiki.md`: no crash; skip wiki generation; `--check` does not demand `docs/wiki/` solely for that reason.
- Unauthenticated network fetch during build to render wiki: must not ship; renderer is local filesystem only.
- Floating Promise in async markdown walk: fail review / test if unhandled rejection can occur.
