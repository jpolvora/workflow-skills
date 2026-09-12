---
slug: website-wiki-page
title: "Dedicated GitHub Pages wiki site generated from {wikiDir}"
status: completed
step: 2
workflowId: website-wiki-page-20260912T152056Z
startedAt: "2026-09-12T15:25:00.000Z"
endedAt: "2026-09-12T15:35:00.000Z"
acRefs: []
interview: step-02-website-wiki-page.plan-interview.md
---
# Refined Implementation Plan — website-wiki-page

Interview closed GAP-1–GAP-16 (`resolutionSource` in `step-02-website-wiki-page.plan-interview.md`). This file is the plan of record. Do not edit `step-01-website-wiki-page.plan.md`.

## 0. Summary & Business Rules

Publish this package’s living wiki (`plans.wikiDir`, default `.agents/specs/wiki`) as a **build-time static HTML tree** under `docs/wiki/` so GitHub Pages visitors can read the current wiki in the browser. `{wikiDir}` markdown remains the authoring SoT (`ws-wiki`). `node bin/build-site.js` (with or without `--bump`) snapshots the tree in the same run as the landing page. `--check` fail-closes on stale wiki HTML when `index.wiki.md` exists.

**Chosen defaults (companion + interview):**

| Decision | Choice |
|----------|--------|
| Page model | Multi-page static `docs/wiki/**.html` (not SPA, not GitHub iframe) |
| Renderer | Small in-repo markdown subset; **no** `marked` / `markdown-it` / other npm markdown deps; **no** Python twin |
| Missing source | Skip wiki emit if `{wikiDir}` or `index.wiki.md` is absent; `--check` does not require `docs/wiki/` for that reason alone |
| Discovery | Landing **Wiki** nav + matching `.dot-nav` item `href="wiki/"` plus sitemap directory loc `.../wiki/` and per-page file locs |
| Orphans | Prune extra HTML under `docs/wiki/` on write; `--check` fails if extras remain (except when source wiki is skipped) |
| wikiDir | `config.plans.wikiDir` if set, else `.agents/specs/wiki` (this hub omits the key today) |

**Business rules**

- Wiki HTML is generated, not a second SoT. Humans edit markdown; rebuild writes HTML.
- Upstream GitHub Pages only. Do not ship wiki HTML in consumer skill packages.
- Relative links only in chrome and intra-wiki hrefs (Pages base `/workflow-skills/`). Sitemap uses `https://jpolvora.github.io/workflow-skills/`.
- Idempotent LF-normalized HTML (`html.replace(/\r\n?/g, '\n')`) so Windows `--check` does not flap (trap: build-site SKILL.md frontmatter CRLF). Apply the same LF policy to wiki HTML **and** rewritten `docs/sitemap.xml`.
- In `bin/build-site.js` template literals, mention path tokens with HTML `<code>` tags, never JS-template braces that look like `{wikiDir}` (trap: json-state-hub-whitelist-sanitizer).
- Do not load `ws-run-benchmark`. Later G2/product commits stage only this slug `files_touched` (trap: g2-code-slug-files-touched-only).
- Catalog/site copy that ships with `bin/` + `docs/` uses one `build-site:bump` per CATALOG Before-ship rules at ship time, not during this plan.
- Integrity regen only after final hashed `.agents/skills` edits. This feature is `bin/` / `docs/` / `test/` unless a skill body is touched.
- Mechanical Phase 5a script exits are not a full `ws-check-harness` Phases 0–5c walk (note on ship board).

**Security mitigations:** path containment under `{wikiDir}` (read) and `docs/wiki/` (write); HTML-escape untrusted markdown text and attributes; reject unknown CLI flags; local filesystem only (no network fetch to render); drop `javascript:` / `data:` / traversal links.

**Design intent:** Greenfield site surface. Existing `build-site.js` injects catalog/version into `docs/index.html` only. `git log -p -S "wiki.html"` on `bin/build-site.js` and `docs/` is empty; skip renderer archaeology.

**Prior work on develop (commit `a1ea4049`):** spec + context + `index.PRD` + CHANGELOG. Product generator is **not** done. Current `docs/assets/css/style.css` has **no** `wiki-` article selectors. Reuse existing theme tokens (`:root` / `[data-theme="light"]`); add article layout now.

**Fable domain adapters:** `fable.enabled` and `autoDetectDomain` are true, but this change is Node site generation (no IaC / K8s / Docker / DB migrations). Skip domain adapters.

## 1. Definition of Ready & Scope

**Stack:** `node-skills-package` (Node 22 JavaScript). Layers: `installer-cli` (`bin/`), static site under `docs/` (`stack.frontend.buildDir`), `tests/` (`test/`). `package.json` `"type": "module"`.

**In scope**

- `bin/build-site.js` orchestration (default path, no extra required flag).
- New focused module `bin/build-wiki-site.js` imported by `build-site.js` (ESM; Node `fs` sync).
- Generated `docs/wiki/index.html` + `docs/wiki/{domain}/{feature}.html`.
- Landing `.nav-links` and `.dot-nav` Wiki links; `docs/sitemap.xml` rewrite in the same run.
- Tests (`test/test-site-wiki.js` created first as the red baseline + `package.json` `tests:harness-efficiency`; keep `test/test-doc-sync.js` `--check` green).
- FEATURES.md + README/FAQ copy that the published site includes a Wiki generated from the wiki dir (`tracking.featuresMdEnabled` is true).
- Minimal CSS using existing tokens for article + wiki home TOC.

**Out of scope:** replacing `{wikiDir}` as SoT; consumer website generation; SPA/client-only markdown; npm markdown libraries; React/Vue/Next; publishing `sweep.state.json` or `{plansDir}`; wiki CMS; changing `ws-wiki` ACs; host/IDE names in skill bodies; GFM tables/images as first-class HTML; client search; copying wiki into `llms.txt`.

**Measurable ACs:** AC1–AC17 (binary). Negative scenarios NS1–NS8 must have named tests (verify score fail-closes if uncovered).

**AC17:** Re-run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring --input .agents/specs/0077-website-wiki-page.spec.md` before ship (`test-validate-spec` already in harness-efficiency).

## 2. Technical Design & Architecture

### 2.1 `{wikiDir}` resolution

Read `.agents/skills/ws-shared/config.json` `plans.wikiDir` when it is a non-empty string; else `.agents/specs/wiki` (`config.schema.json` default; `{wikiDir}` in `tools.md`). Resolve to an absolute path under repo root. Reject resolved paths that escape the repo (`path.resolve` + `resolved === repoRoot || resolved.startsWith(repoRoot + path.sep)`). Tests inject `wikiDir` / `outDir` via the exported function, not new CLI flags (NS4/NS5).

### 2.2 Module split (`installer-cli`)

| File | Role |
|------|------|
| `bin/build-wiki-site.js` | Export **sync** API, e.g. `buildWikiSite({ repoRoot, wikiDir, outDir, check })`. Walk markdown, render subset, write or compare HTML, prune orphans on write, return `{ skipped, pages, sitemapLocs, staleReasons }`. |
| `bin/build-site.js` | After landing HTML stamp, call wiki builder with default dirs. Keep argv contract: only `--bump` and `--check`; unknown args still Usage + exit 1. Collect landing + wiki + sitemap stale reasons, then exit. Print wiki page count or `wiki skipped`. Rewrite sitemap in the same run. |
| `docs/sitemap.xml` | Regenerated each successful non-check run from fixed prefix (landing, `llms.txt`, GitHub repo) plus `https://jpolvora.github.io/workflow-skills/wiki/` and each feature HTML loc. |
| `docs/index.html` | Add Wiki `href="wiki/"` in `.nav-links` and `.dot-nav`. FAQ copy for AC16. Nav is **not** inside catalog/features replace regions, so the static href survives rebuilds; still assert after `build-site.js`. |
| `docs/assets/css/style.css` | `.wiki-page` / `.wiki-article` / `.wiki-toc` using `--text-main`, `--accent-*`, no neon/glow. |
| `docs/robots.txt` | Unchanged (already points at sitemap). |
| `test/test-site-wiki.js` | ESM; isolated temp dirs; `import { buildWikiSite } from '../bin/build-wiki-site.js'`; do not mutate tracked `{wikiDir}`. |
| `package.json` | Add `test/test-site-wiki.js` to `tests:harness-efficiency` (and `tests` if that suite must stay aligned). |
| `FEATURES.md`, `README.md` | Human mention of published Wiki. |

**Do not** add `--wiki-dir` / `--specs-dir` CLI.

### 2.3 Walk and mapping (AC1, AC7)

- If `index.wiki.md` missing: skip; no crash; `--check` does not fail solely because `docs/wiki/` is absent or leftover (NS6, GAP-11).
- Include: `{wikiDir}/index.wiki.md` → `docs/wiki/index.html`; `{wikiDir}/{domain}/{feature}.md` → `docs/wiki/{domain}/{feature}.html` (exactly one domain folder; live tree: `harness/`, `delivery/`, `providers/`, `specs/`, `quality/`, `memory/`, `engineering/`, `documentation/`).
- Exclude: `sweep.state.json`, non-`.md` files, deeper nests, anything whose resolved path is outside `{wikiDir}` (including `..` segments).
- Writes: only under `docs/wiki/`. On write, delete orphan HTML whose source markdown disappeared. On `--check`, extras vs generated set are stale.
- Depth: do not recurse into unrelated trees.

### 2.4 Markdown subset renderer (AC11, AC6)

Implement a small function (headings, unordered/ordered lists, paragraphs, emphasis `*`/`_`, inline `` `code` ``, fenced code, markdown links). Wiki pages today are 3-section markdown plus catalog lists (`index.wiki.md`). Tables/images: escaped text or omitted (not live HTML).

**Escape first:** text and attribute values through HTML entity encoding (`&`, `<`, `>`, `"`, `'`). Fenced/inline code is escaped text inside `<code>`/`<pre>`, never raw HTML. Inline HTML in markdown is escaped, not executed (AC6, NS2).

**Links (AC3, NS3, GAP-6):**

- `http(s):` / `mailto:` unchanged (still attribute-escaped).
- `#fragment` only: keep.
- Relative `*.md` / `index.wiki.md` (optional `#anchor`): rewrite to `.html` with the same relative directory, then resolve against the source file directory; if the target would leave `{wikiDir}`, drop or render inert text; never write that path under `docs/`.
- `index.wiki.md` → `index.html` (or `../index.html` from a feature page).
- `javascript:`, `data:`, and other non-allowlisted schemes: drop or inert text.

### 2.5 HTML document chrome (AC2, AC5, AC13)

Full HTML5: doctype, charset, viewport, `<title>` from first H1 else filename, stylesheet:

- wiki home: `../assets/css/style.css`
- feature page: `../../assets/css/style.css`

**Minimal** site chrome (not the landing hash nav): link labeled Home (or Wiki) back to landing:

- from `docs/wiki/index.html`: `../` (or `../index.html`)
- from feature pages: `../../`

Theme: `data-theme` / existing toggle script is **optional progressive enhancement**. Body article must be in the HTML payload (AC13). Do not fetch markdown in the browser.

LF-normalize before compare/write (same as landing `docs/index.html`).

### 2.6 `--check` (AC8, AC9, NS1)

Mirror landing: generate wiki HTML in memory (or temp), LF-normalize, compare to on-disk `docs/wiki/**`. Missing, differing, or extra files (when source wiki is required) → stale. **Do not** `process.exit` on the first landing mismatch before wiki runs; collect reasons, then one non-zero exit. Stderr must name wiki output (e.g. `docs/wiki`) when wiki is stale, not only `docs/index.html`. Fresh tree after a non-check build → exit 0 when landing **and** wiki **and** sitemap match.

Sitemap: if wiki pages are required, sitemap must include directory `/workflow-skills/wiki/` plus each feature loc or `--check` fails (AC10). Compare LF-normalized sitemap bytes.

### 2.7 Invariants from `config.json`

- `commitPlanFilesOnlyAtStep8`: true (plan dir not in product commits until ship).
- EF/tenancy keys: N/A.
- TypeScript-node pack: path traversal, CLI validation, no floating Promises, HTML injection. Auth/DTO/Angular subscriptions: N/A (static files, no HTTP API).

## 3. Step-by-Step Plan

### Step 1 — Red test file (AC15 baseline)

- **ACs:** AC15 scaffolding; named methods in §5 start failing
- **Files:** `test/test-site-wiki.js` (create); `package.json` (`tests:harness-efficiency`)
- **Actions:** ESM suite with temp `wikiDir` + temp `outDir`. Import `buildWikiSite`. Never write tracked `.agents/specs/wiki`. List the file in harness-efficiency so CI runs it.
- **Checks:** Suite is listed; temp dirs only.

### Step 2 — Wiki builder module (path walk, skip, emit)

- **ACs:** AC1, AC7, AC14 (no extra flag), skip rule NS6
- **Files:** `bin/build-wiki-site.js` (create)
- **Actions:** Resolve wiki dir; skip if no `index.wiki.md`; sync `fs` walk; containment; map one-level domain pages; orphan prune on write; export API for tests.
- **Checks:** No `fetch`/`http` in the module (NS7). All fs calls sync (`readFileSync` / `writeFileSync` / `mkdirSync` / `unlinkSync` / `rmSync` as needed) so no floating Promises (NS8). `testEmitsIndexAndFeatureHtml`, `testPathContainment`, `testSkipWhenIndexWikiMissing` turn green.

### Step 3 — Markdown subset + XSS-safe HTML documents

- **ACs:** AC2, AC3, AC5, AC6, AC11, AC13
- **Files:** `bin/build-wiki-site.js`
- **Actions:** Renderer + document wrapper + link rewrite + LF normalize + minimal chrome.
- **Checks:** Fixture with `<script>` and `javascript:` URLs; traversal links; H1 title; depth-correct CSS hrefs. Matching §5 tests green.

### Step 4 — Wire into `build-site.js` CLI and observability

- **ACs:** AC1, AC8, AC9, AC14
- **Files:** `bin/build-site.js` (modify)
- **Actions:** Import builder after landing stamp. Collect landing stale **and** wiki stale, then exit. Stdout: wiki page count or skipped. Unknown flags unchanged.
- **Checks:** `--wiki-only-typo` still Usage exit 1 and does not write wiki (NS5). `--bump` and `--check` still exclusive.

### Step 5 — Sitemap rewrite

- **ACs:** AC10
- **Files:** `bin/build-site.js` and/or `bin/build-wiki-site.js`; `docs/sitemap.xml` (generated)
- **Actions:** Same run as wiki HTML. Locs: `https://jpolvora.github.io/workflow-skills/wiki/` plus one `<loc>` per generated **feature** HTML (`.../wiki/{domain}/{feature}.html`). Do not duplicate `wiki/index.html`. Preserve existing three URLs.
- **Checks:** `docs/robots.txt` still references `sitemap.xml`. `--check` fails if wiki locs missing when wiki was emitted.

### Step 6 — Landing navigation and FAQ copy

- **ACs:** AC4, AC16
- **Files:** `docs/index.html` (nav + dot-nav + FAQ)
- **Actions:** `.nav-links` add `<a href="wiki/">Wiki</a>`. `.dot-nav` add matching Wiki item (`href="wiki/"`, tooltip Wiki). Relative `wiki/` (not `/wiki/`) so Pages project site `/workflow-skills/wiki/` resolves. Place Wiki outside replaced catalog/features sections (already true for current nav).
- **Checks:** After `node bin/build-site.js`, Wiki link still present (`testLandingNavWikiHref`).

### Step 7 — Theme/article CSS (do not skip)

- **ACs:** AC12, AC11
- **Files:** `docs/assets/css/style.css`
- **Actions:** Add `.wiki-page` / `.wiki-article` / `.wiki-toc` using existing tokens. Body text and links use `--text-main` / `--accent-cyan` (or equivalent) so contrast stays ≥ 4.5:1 in dark and `[data-theme="light"]`. No neon, glow, or new marketing chrome on wiki surfaces.
- **Checks:** `testWikiCssUsesThemeTokens`; visual/token review in Step 6 code review.

### Step 8 — Remaining tests and real-tree `--check`

- **ACs:** AC15 plus leftover §5 rows; NS1–NS8
- **Files:** `test/test-site-wiki.js`; optionally `test/test-doc-sync.js` (Wiki href + `--check` still 0 on the real tree after implementation)
- **Checks:** See §5. Mutation unset → no `run_sabotage.py`. Sibling sweep N/A.

### Step 9 — Human/site inventory copy

- **ACs:** AC16
- **Files:** `FEATURES.md` (e.g. under Distribution / site); `README.md` GitHub Pages sentence; FAQ in `docs/index.html` if not already covered in Step 6.
- **Actions:** State that the published site includes a Wiki page generated from the wiki dir (prose may say “project wiki dir” / `.agents/specs/wiki` so JS templates stay sanitizer-safe).

### Step 10 — Authoring validation leftover

- **ACs:** AC17
- **Files:** none (spec of record already registered)
- **Actions:** Re-run `validate_spec.cjs --mode=authoring` on `.agents/specs/0077-website-wiki-page.spec.md`.

## 4. Permissions, Tenancy & i18n

N/A. Static file generation, no HTTP API, no RBAC, no tenant field, `frontend.i18n.framework` is `none`. Wiki chrome labels stay English (`Wiki`, `Home`) matching the public site.

## 5. Test Coverage

Prefer `test/test-site-wiki.js` methods below. Import `buildWikiSite` with temp directories. Real-repo `--check` remains `test/test-doc-sync.js` (`assert.strictEqual(build.status, 0)`).

| AC / NS | Test (method / assertion) |
|---------|---------------------------|
| AC1 | `testEmitsIndexAndFeatureHtml` — temp wiki with `index.wiki.md` + `harness/sample.md` writes `index.html` and `harness/sample.html` |
| AC2 | `testHtml5ChromeAndStylesheetDepth` — doctype/charset/viewport/title; home CSS `../assets/css/style.css`; nested `../../assets/css/style.css` |
| AC3 | `testRewritesWikiMarkdownLinks` — `index.wiki.md` and `foo.md#anchor` become `.html` hrefs; `https://` and `mailto:` unchanged; `#only` kept |
| AC4 | `testLandingNavWikiHref` — `docs/index.html` contains `href="wiki/"` (or `wiki/index.html`) in `.nav-links` and `.dot-nav`; after rebuild still present |
| AC5 | `testWikiChromeLinkHome` — generated pages include Home/Wiki href to `../` or `../../` |
| AC6 / NS2 | `testEscapesScriptPayload` — markdown `<script>alert(1)</script>` does not produce an executable `<script>` node; `javascript:` href not live |
| AC7 / NS3 | `testPathContainment` — `..` in filenames/links does not copy `package.json`; no write outside outDir; traversal href dropped or inert |
| AC8 / NS1 | `testCheckFailsOnStaleWikiHtml` — after mutating source md without writing HTML, `check: true` non-zero and message includes `docs/wiki` |
| AC9 | `testCheckPassesWhenFresh` — generate then check → 0 (landing covered by existing `test-doc-sync`) |
| AC10 | `testSitemapListsWikiLocs` — returned locs / temp sitemap include `/workflow-skills/wiki/` and each feature HTML loc; no duplicate `wiki/index.html` |
| AC11 | `testRendersHeadingsListsCodeLinks` — fixture with `#`, lists, fence, `` `code` ``, `[x](y.md)` readable in article HTML; index catalog links work |
| AC12 | `testWikiCssUsesThemeTokens` — wiki CSS rules reference existing variables (no new glow/neon class names) |
| AC13 | `testContentPresentWithoutJs` — article body contains heading text in static HTML (not empty shell waiting on fetch) |
| AC14 / NS4 / NS5 | `testUnknownFlagsStillUsage` — `node bin/build-site.js --wiki-only-typo` exit 1, stderr Usage, wiki outDir unchanged; `--specs-dir` not accepted |
| AC15 | Suite listed in `package.json` `tests:harness-efficiency`; temp dirs only |
| AC16 | `testDocsMentionPublishedWiki` — FEATURES.md and README (or FAQ) mention Wiki generated from the wiki dir |
| AC17 | Documented `validate_spec --mode=authoring` exit 0 via existing `test-validate-spec` / harness-efficiency |
| NS6 | `testSkipWhenIndexWikiMissing` — no `index.wiki.md` → skip, no throw; check does not require outDir |
| NS7 | `testNoNetworkInWikiBuilder` — `build-wiki-site.js` source does not contain `https.request` / `fetch(` (static scan) |
| NS8 | Review + `testWikiBuilderIsSync` — exported API is synchronous; no un-awaited Promise in walk (grep `async ` / `.then(` if any) |

## 6. Stack & Security Invariants Verification Plan

Stack pack: `{sharedDir}/runtime/stacks/typescript-node.md`. Scan after implementation:

`node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`

Touched boundaries:

| Boundary | Applies? | Verification |
|----------|----------|--------------|
| **Path containment / injection** | Yes | Resolve wikiDir and every markdown path; `path.resolve` + prefix with separator. Writes only under `docs/wiki/`. Tests: AC7, NS3. No `child_process.exec` with wiki paths. |
| **HTML escape / XSS** | Yes (untrusted file input) | Escape text and attributes before string-concat HTML. Inline HTML in markdown not live. Drop `javascript:` / `data:`. Tests: AC6, NS2. Treat wiki markdown as untrusted input (invariant 3 + 4). |
| **CLI flags** | Yes | Keep allowlist `--bump` \| `--check`. Unknown including `--wiki-only-typo` / `--specs-dir` → Usage exit 1, no partial wiki write. Tests: AC14, NS4, NS5. |
| **Concurrency & async** | Yes | Prefer sync `fs` in builder and `build-site.js` call site. If any Promise is introduced, `await` or return it; no floating Promises. Tests: NS8. |
| **Authorization / endpoint protection** | N/A | No HTTP server, no route guards. |
| **DTO / network schema** | N/A | No request bodies. CLI argv already validated. Config JSON read is trusted repo file. |
| **Subscription / lifecycle** | N/A | No Angular/UI subscriptions. Sync file handles; no leftover streams. |
| **TypeScript `any`** | N/A | Plain JS; do not add TS `any`. |

**Config invariants:** `commitPlanFilesOnlyAtStep8` — do not commit `{plansDir}` in G2-code. `skipQualityGates` false — keep `npm run test` / harness-efficiency.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`bin/` generator, `docs/` snapshot, `test/` coverage; no consumer skill package copy of wiki HTML).
- [ ] Domain entities and mappings encapsulated — N/A (no ORM).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied — N/A (static site).
- [ ] Stack & security invariants verified (path containment, HTML escape, CLI flags, sync fs / no floating Promises).
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs and NS1–NS8.
- [ ] Wiki CSS uses existing theme tokens (AC12 not assumed done).
- [ ] LF-normalized generated wiki HTML and sitemap.
- [ ] No `{wikiDir}` inside JS backtick templates; use `<code>` if the site HTML must mention the token.
- [ ] No new npm markdown dependencies; no Python wiki renderer.
- [ ] Product commits later: only `files_touched` (not `git add -A`).
- [ ] Do not run harness benchmarks.
- [ ] `npm run generate-integrity` only if hashed skill files changed.
- [ ] Ship caveats: mechanical Phase 5a ≠ full Phases 0–5c walk.

## 8. Open Questions

None. Companion gray areas and interview nits (sitemap directory loc, orphan prune, `.dot-nav` Wiki href) are closed. Next: `ws-plan-to-tasks` / Step 3.
