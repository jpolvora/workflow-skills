---
superseded: true
supersededBy: step-02-website-wiki-page.plan.refined.md
slug: website-wiki-page
title: "Dedicated GitHub Pages wiki site generated from {wikiDir}"
status: completed
step: 1
workflowId: website-wiki-page-20260912T152056Z
startedAt: "2026-09-12T15:25:34.618Z"
endedAt: "2026-09-12T15:25:34.618Z"
acRefs: []
---
## 0. Summary & Business Rules

Publish this package’s living wiki (`plans.wikiDir`, default `.agents/specs/wiki`) as a **build-time static HTML tree** under `docs/wiki/` so GitHub Pages visitors can read the current wiki in the browser. `{wikiDir}` markdown remains the authoring SoT (`ws-wiki`). `node bin/build-site.js` (with or without `--bump`) snapshots the tree in the same run as the landing page. `--check` fail-closes on stale wiki HTML when `index.wiki.md` exists.

**Chosen defaults (companion, confirmed):**

| Decision | Choice |
|----------|--------|
| Page model | Multi-page static `docs/wiki/**.html` (not SPA, not GitHub iframe) |
| Renderer | Small in-repo markdown subset; **no** `marked` / `markdown-it` / other npm markdown deps |
| Missing source | Skip wiki emit if `{wikiDir}` or `index.wiki.md` is absent; `--check` does not require `docs/wiki/` for that reason alone |
| Discovery | Landing **Wiki** nav link plus `docs/sitemap.xml` locs |

**Business rules**

- Wiki HTML is generated, not a second SoT. Humans edit markdown; rebuild writes HTML.
- Upstream GitHub Pages only. Do not ship wiki HTML in consumer skill packages.
- Relative links only in chrome and intra-wiki hrefs (Pages base `/workflow-skills/`). Sitemap uses `https://jpolvora.github.io/workflow-skills/`.
- Idempotent LF-normalized HTML (`html.replace(/\r\n?/g, '\n')`) so Windows `--check` does not flap (trap: build-site SKILL.md frontmatter CRLF).
- In `bin/build-site.js` template literals, mention path tokens with HTML `<code>` tags, never JS-template braces that look like `{wikiDir}` (trap: json-state-hub-whitelist-sanitizer).
- Do not load `ws-run-benchmark`. Later G2/product commits stage only this slug `files_touched` (trap: g2-code-slug-files-touched-only).
- Catalog/site copy that ships with `bin/` + `docs/` uses one `build-site:bump` per CATALOG Before-ship rules at ship time, not during this plan.

**Security mitigations:** path containment under `{wikiDir}` (read) and `docs/wiki/` (write); HTML-escape untrusted markdown text and attributes; reject unknown CLI flags; local filesystem only (no network fetch to render).

**Design intent:** Greenfield site surface. Existing `build-site.js` injects catalog/version into `docs/index.html` only. `git log -p -S "wiki.html"` on `bin/build-site.js` and `docs/` is empty; skip renderer archaeology.

**Prior work on develop (commit `a1ea4049`):** spec + context + `index.PRD` + CHANGELOG. Product generator is **not** done. Current `docs/assets/css/style.css` has **no** `wiki-` article selectors. Do **not** treat CSS as AC12 complete; reuse existing theme tokens (`:root` / `[data-theme="light"]`) if any wiki-related rules appear on the branch, otherwise add article layout now.

**Fable domain adapters:** `fable.enabled` and `autoDetectDomain` are true, but this change is Node site generation (no IaC / K8s / Docker / DB migrations). Skip domain adapters.

## 1. Definition of Ready & Scope

**Stack:** `node-skills-package` (Node 22 JavaScript). Layers: `installer-cli` (`bin/`), static site under `docs/` (`stack.frontend.buildDir`), `tests/` (`test/`).

**In scope**

- `bin/build-site.js` orchestration (default path, no extra required flag).
- New focused module `bin/build-wiki-site.js` imported by `build-site.js` (same ESM style; Node `fs` sync).
- Generated `docs/wiki/index.html` + `docs/wiki/{domain}/{feature}.html`.
- Landing nav Wiki link; `docs/sitemap.xml` rewrite in the same run.
- Tests (`test/test-site-wiki.js` + `package.json` `tests:harness-efficiency`; keep `test/test-doc-sync.js` `--check` green).
- FEATURES.md + README/FAQ copy that the published site includes a Wiki generated from the wiki dir.
- Minimal CSS using existing tokens for article + wiki home TOC.

**Out of scope:** replacing `{wikiDir}` as SoT; consumer website generation; SPA/client-only markdown; npm markdown libraries; React/Vue/Next; publishing `sweep.state.json` or `{plansDir}`; wiki CMS; changing `ws-wiki` ACs; host/IDE names in skill bodies.

**Measurable ACs:** AC1–AC17 (binary). Negative scenarios NS1–NS8 must have named tests (verify score fail-closes if uncovered).

**AC17:** Authoring validation of `0077-website-wiki-page.spec.md` already ran at Step 0; re-run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring --input .agents/specs/0077-website-wiki-page.spec.md` before ship to keep the gate green.

## 2. Technical Design & Architecture

### 2.1 `{wikiDir}` resolution

Read `.agents/skills/ws-shared/config.json` `plans.wikiDir` when set; else `.agents/specs/wiki` (`tools.md` token `{wikiDir}`). Resolve to an absolute path under repo root. Reject resolved paths that escape the repo (containment: `path.resolve` + prefix check with separator).

### 2.2 Module split (`installer-cli`)

| File | Role |
|------|------|
| `bin/build-wiki-site.js` | Export sync API, e.g. `buildWikiSite({ repoRoot, wikiDir, outDir, check })`. Walk markdown, render subset, write or compare HTML, return `{ skipped, pages, sitemapLocs, staleReasons }`. |
| `bin/build-site.js` | After landing HTML stamp (existing `--check` / write), call wiki builder. Keep argv contract: only `--bump` and `--check`; unknown args still Usage + exit 1. Print wiki page count or `wiki skipped`. |
| `docs/sitemap.xml` | Regenerated (or patched) in the same run: keep existing landing / `llms.txt` / GitHub loc; add wiki index + each generated page. |
| `docs/index.html` | Add Wiki href `wiki/` (relative) in `.nav-links` and matching `.dot-nav` item. FAQ copy for AC16. |
| `docs/assets/css/style.css` | Article + wiki-home TOC using existing `--text-main`, `--accent-*`, no neon/glow. |
| `docs/robots.txt` | Unchanged (already points at sitemap). |
| `test/test-site-wiki.js` | Isolated temp dirs; import builder; do not mutate tracked `{wikiDir}`. |
| `package.json` | Add `test/test-site-wiki.js` to `tests:harness-efficiency` (and `tests` if that suite must stay aligned). |
| `FEATURES.md`, `README.md` | Human mention of published Wiki. |

**Do not** add `--wiki-dir` / `--specs-dir` CLI. Tests inject paths via the exported function, not new flags (NS4/NS5).

### 2.3 Walk and mapping (AC1, AC7)

- If `index.wiki.md` missing: skip; no crash; `--check` does not fail solely because `docs/wiki/` is absent (NS6).
- Include: `{wikiDir}/index.wiki.md` → `docs/wiki/index.html`; `{wikiDir}/{domain}/{feature}.md` → `docs/wiki/{domain}/{feature}.html`.
- Exclude: `sweep.state.json`, non-`.md` files, anything whose resolved path is outside `{wikiDir}` (including `..` segments).
- Writes: only under `docs/wiki/`. Recommend deleting orphan HTML whose source markdown disappeared so `--check` stays deterministic.
- Depth: one domain folder (matches current wiki: `harness/`, `delivery/`, …). Do not recurse into unrelated trees.

### 2.4 Markdown subset renderer (AC11, AC6)

Implement a small function (headings, unordered/ordered lists, paragraphs, emphasis `*`/`_`, inline `` `code` ``, fenced code, markdown links). Wiki pages today are 3-section markdown plus catalog lists (see `index.wiki.md`).

**Escape first:** text and attribute values through HTML entity encoding (`&`, `<`, `>`, `"`, `'`). Fenced/inline code is escaped text inside `<code>`/`<pre>`, never raw HTML. Inline HTML in markdown is escaped, not executed (AC6, NS2).

**Links (AC3, NS3):**

- `http(s):` / `mailto:` unchanged (still attribute-escaped).
- `#fragment` only: keep.
- Relative `*.md` / `index.wiki.md` (optional `#anchor`): rewrite to `.html` with the same relative directory, then resolve against the source file directory; if the target file would leave `{wikiDir}`, drop or render inert text; never write that path under `docs/`.
- `index.wiki.md` → `index.html` (or `../index.html` from a feature page).

### 2.5 HTML document chrome (AC2, AC5, AC13)

Full HTML5: doctype, charset, viewport, `<title>` from first H1 else filename, stylesheet:

- wiki home: `../assets/css/style.css`
- feature page: `../../assets/css/style.css`

Site chrome: link labeled Home (or Wiki) back to landing:

- from `docs/wiki/index.html`: `../` (or `../index.html`)
- from feature pages: `../../`

Theme: `data-theme` / existing toggle script is **optional progressive enhancement**. Body article must be in the HTML payload (AC13). Do not fetch markdown in the browser.

LF-normalize before compare/write (same as landing `docs/index.html`).

### 2.6 `--check` (AC8, AC9, NS1)

Mirror landing: generate wiki HTML in memory (or temp), LF-normalize, compare to on-disk `docs/wiki/**`. Missing or differing files → exit non-zero; stderr must name wiki output (e.g. `docs/wiki`) not only `docs/index.html`. Fresh tree after a non-check build → exit 0 when landing **and** wiki match.

Sitemap: if wiki pages are required, sitemap must include those locs or `--check` fails (AC10).

### 2.7 Invariants from `config.json`

- `commitPlanFilesOnlyAtStep8`: true (plan dir not in product commits until ship).
- EF/tenancy keys: N/A.
- TypeScript-node pack: path traversal, CLI validation, no floating Promises, HTML injection. Auth/DTO/Angular subscriptions: N/A (static files, no HTTP API).

## 3. Step-by-Step Plan

### Step 1 — Wiki builder module (path walk, skip, emit)

- **ACs:** AC1, AC7, AC14 (no extra flag), skip rule NS6
- **Files:** `bin/build-wiki-site.js` (create)
- **Actions:** Resolve wiki dir; skip if no `index.wiki.md`; sync `fs` walk; containment; map paths; export API for tests.
- **Checks:** No `fetch`/`http` in the module (NS7). All fs calls sync (`readFileSync` / `writeFileSync` / `mkdirSync`) so no floating Promises (NS8).

### Step 2 — Markdown subset + XSS-safe HTML documents

- **ACs:** AC2, AC3, AC5, AC6, AC11, AC13
- **Files:** `bin/build-wiki-site.js`
- **Actions:** Renderer + document wrapper + link rewrite + LF normalize.
- **Checks:** Fixture with `<script>` and `javascript:` URLs; traversal links; H1 title; depth-correct CSS hrefs.

### Step 3 — Wire into `build-site.js` CLI and observability

- **ACs:** AC1, AC8, AC9, AC14
- **Files:** `bin/build-site.js` (modify)
- **Actions:** Import builder after landing stamp. `--check` ORs landing stale with wiki stale. Stdout: wiki page count or skipped. Unknown flags unchanged.
- **Checks:** `--wiki-only-typo` still Usage exit 1 and does not write wiki (NS5). `--bump` and `--check` still exclusive.

### Step 4 — Sitemap rewrite

- **ACs:** AC10
- **Files:** `bin/build-site.js` and/or `bin/build-wiki-site.js`; `docs/sitemap.xml` (generated)
- **Actions:** Same run as wiki HTML. Locs: `https://jpolvora.github.io/workflow-skills/wiki/` plus one `<loc>` per generated HTML (`.../wiki/{domain}/{feature}.html`). Preserve existing three URLs unless they would duplicate.
- **Checks:** `docs/robots.txt` still references `sitemap.xml` (no edit required unless broken).

### Step 5 — Landing navigation and FAQ copy

- **ACs:** AC4, AC16
- **Files:** `docs/index.html` (nav + FAQ); keep `build-site.js` replacements from destroying the Wiki link (Wiki is static chrome, not a catalog inject — place it outside replaced sections, or re-inject Wiki in the builder if the full `<nav>` is ever rewritten).
- **Actions:** `.nav-links` add `<a href="wiki/">Wiki</a>`. `.dot-nav` add matching Wiki item (`href="wiki/"`, tooltip Wiki). Relative `wiki/` (not `/wiki/`) so Pages project site `/workflow-skills/wiki/` resolves.
- **Checks:** After `node bin/build-site.js`, Wiki link still present (test-doc-sync or test-site-wiki assert).

### Step 6 — Theme/article CSS (do not skip)

- **ACs:** AC12, AC11
- **Files:** `docs/assets/css/style.css`
- **Actions:** Inspect `git show a1ea4049 -- docs/assets/css/style.css` for any wiki rules; if none (current tree has none), add `.wiki-page` / `.wiki-article` / `.wiki-toc` using existing tokens. Body text and links must use `--text-main` / `--accent-cyan` (or equivalent) so contrast stays ≥ 4.5:1 in dark and `[data-theme="light"]`. No neon, glow, or new marketing chrome.
- **Checks:** Visual/token review in Step 6 code review; no new color palette.

### Step 7 — Tests without mutating tracked wiki

- **ACs:** AC15 plus AC1, AC3, AC6, AC7, AC8, AC10; NS1–NS8
- **Files:** `test/test-site-wiki.js` (create); `package.json` (modify `tests:harness-efficiency`); optionally a few assertions in `test/test-doc-sync.js` (Wiki href + `--check` still 0 on the real tree after implementation).
- **Actions:** Temp `wikiDir` + temp `docs/wiki` via imported `buildWikiSite`. Restore nothing on the tracked wiki because tests never write there.
- **Checks:** See §5. Mutation unset → no `run_sabotage.py` required (greenfield, not defect-class regression). Sibling sweep N/A (no prior wiki renderer).

### Step 8 — Human/site inventory copy

- **ACs:** AC16
- **Files:** `FEATURES.md` (e.g. under Distribution / site); `README.md` GitHub Pages sentence; FAQ in `docs/index.html` if not already covered in Step 5.
- **Actions:** State that the published site includes a Wiki page generated from `{wikiDir}` (prose may say “project wiki dir” / `.agents/specs/wiki` so JS templates stay sanitizer-safe).

### Step 9 — Authoring validation leftover

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
| AC4 | `testLandingNavWikiHref` — `docs/index.html` contains `href="wiki/"` (or `wiki/index.html`) in nav; after rebuild still present |
| AC5 | `testWikiChromeLinkHome` — generated pages include Home/Wiki href to `../` or `../../` |
| AC6 / NS2 | `testEscapesScriptPayload` — markdown `<script>alert(1)</script>` does not produce an executable `<script>` node (escaped entities or absent) |
| AC7 / NS3 | `testPathContainment` — `..` in filenames/links does not copy `package.json`; no write outside outDir; traversal href dropped or inert |
| AC8 / NS1 | `testCheckFailsOnStaleWikiHtml` — after mutating source md without writing HTML, `check: true` non-zero and message includes `docs/wiki` |
| AC9 | `testCheckPassesWhenFresh` — generate then check → 0 (landing covered by existing `test-doc-sync`) |
| AC10 | `testSitemapListsWikiLocs` — sitemap includes `/workflow-skills/wiki/` and each feature HTML loc after build |
| AC11 | `testRendersHeadingsListsCodeLinks` — fixture with `#`, lists, fence, `` `code` ``, `[x](y.md)` readable in article HTML; index catalog links work |
| AC12 | `testWikiCssUsesThemeTokens` — wiki CSS rules reference existing variables (no new glow/neon class names); optional contrast note for review |
| AC13 | `testContentPresentWithoutJs` — article body contains heading text in static HTML (not empty shell waiting on fetch) |
| AC14 / NS4 / NS5 | `testUnknownFlagsStillUsage` — `node bin/build-site.js --wiki-only-typo` exit 1, stderr Usage, wiki outDir unchanged; `--specs-dir` not accepted |
| AC15 | Suite listed in `package.json` `tests:harness-efficiency`; temp dirs only |
| AC16 | `testDocsMentionPublishedWiki` — FEATURES.md and README (or FAQ) mention Wiki generated from the wiki dir |
| AC17 | `testSpecAuthoringStillValid` or documented `validate_spec --mode=authoring` exit 0 (may live in existing `test-validate-spec` / harness-efficiency) |
| NS6 | `testSkipWhenIndexWikiMissing` — no `index.wiki.md` → skip, no throw; check does not require outDir |
| NS7 | `testNoNetworkInWikiBuilder` — `build-wiki-site.js` source does not contain `https.request` / `fetch(` (static scan) |
| NS8 | Review + `testWikiBuilderIsSync` — exported API is synchronous; no un-awaited Promise in walk (grep `async ` / `.then(` if any) |

## 6. Stack & Security Invariants Verification Plan

Stack pack: `{sharedDir}/runtime/stacks/typescript-node.md`. Scan after implementation:

`node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`

Touched boundaries:

| Boundary | Applies? | Verification |
|----------|----------|--------------|
| **Path containment / injection** | Yes | Resolve wikiDir and every markdown path; `path.resolve` + `startsWith(wikiRoot + sep)`. Writes only under `docs/wiki/`. Tests: AC7, NS3. No `child_process.exec` with wiki paths. |
| **HTML escape / XSS** | Yes (untrusted file input) | Escape text and attributes before string-concat HTML. Inline HTML in markdown not live. Tests: AC6, NS2. Treat wiki markdown as untrusted input (invariant 3 + 4). |
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
- [ ] LF-normalized generated wiki HTML.
- [ ] No `{wikiDir}` inside JS backtick templates; use `<code>` if the site HTML must mention the token.
- [ ] No new npm markdown dependencies.
- [ ] Product commits later: only `files_touched` (not `git add -A`).

## 8. Open Questions

Companion gray areas are **confirmed**. Remaining interview nits (non-blocking defaults below):

1. **Sitemap loc style:** use directory URL `.../wiki/` plus file locs `.../wiki/{domain}/{feature}.html` (recommended; matches AC10 first option). Alternative `.../wiki/index.html` is acceptable if interview prefers explicit index.
2. **Orphan HTML prune:** recommended yes when a markdown page is deleted so `--check` does not keep extra files. Confirm if interview wants keep-orphans (not recommended).
3. **Dot-nav Wiki:** AC4 requires matching section-dot nav if present. Plan adds `href="wiki/"` on `.dot-nav` even though other dots are in-page hashes. Interview may drop the dot if it feels inconsistent; landing `.nav-links` Wiki stays required.

No blockers. Next: `ws-plan-interview` (`runInterview: true`).
