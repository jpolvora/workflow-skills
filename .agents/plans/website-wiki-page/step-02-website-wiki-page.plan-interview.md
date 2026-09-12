---
slug: website-wiki-page
title: Interview Registry — website-wiki-page
step: 2
status: completed
workflowId: website-wiki-page-20260912T152056Z
startedAt: "2026-09-12T15:25:00.000Z"
endedAt: "2026-09-12T15:35:00.000Z"
acRefs: []
autoMode: true
shared_understanding: confirmed
blocking_open: 0
round: 0
---
# Plan Interview & Audit Registry — website-wiki-page

## Summary of Plan Audit

Audited `step-01-website-wiki-page.plan.md` against `step-00-website-wiki-page.spec.md` (AC1–AC17, NS1–NS8), companion `0077-website-wiki-page.context.md`, High memory traps, and the live site pipeline (`bin/build-site.js`, `docs/index.html` nav/dot-nav, static `docs/sitemap.xml`, `test/test-doc-sync.js`, `{wikiDir}` tree, `docs/assets/css/style.css`). No Visual References on the spec. `autoMode: true`: sweep-miss blocking gaps would be model-inferred; none remained blocking after sweep + companion defaults.

**Sweep facts**

- `bin/build-site.js` is ESM (`package.json` `"type": "module"`). Argv allowlist is only `--bump` | `--check`. `--check` LF-normalizes and compares **only** `docs/index.html`, then exits; it does not touch sitemap or wiki.
- Landing rewrite is marker/section scoped (features grid, catalog, packages, badges, footer). `.nav-links` and `.dot-nav` are **not** regenerated; a static Wiki href survives rebuilds if tests assert it after `build-site.js`.
- `.dot-nav` exists (in-page hashes only). AC4 requires a matching Wiki entry when that nav is present.
- `docs/sitemap.xml` is a hand-maintained three-URL set (landing, `llms.txt`, GitHub). `docs/robots.txt` already points at it. No `docs/wiki/` tree exists yet.
- `{wikiDir}` live tree: `.agents/specs/wiki/index.wiki.md` plus one-level `{domain}/{feature}.md` (9 feature pages). `config.json` `plans` has **no** `wikiDir` key; schema default is `.agents/specs/wiki`.
- CSS has theme tokens (`:root` / `[data-theme="light"]`, `--text-main`, `--accent-cyan`) and **no** `wiki-` article selectors (commit `a1ea4049` did not ship generator CSS).
- `test/test-doc-sync.js` runs `build-site.js --check` and asserts landing headings; it does not assert wiki HTML. `tests:harness-efficiency` lists `test-doc-sync.js` and `test-validate-spec.js` (AC17 path).
- Traps folded: LF-normalize generated HTML; HTML `<code>` not `{wikiDir}` in JS backticks; no npm markdown deps; Node-only (no Python twin); path containment; G2 `files_touched` only; no harness benchmarks; Phase 5a is not a full harness walk.

## Interview registry

| ID | Class | Section | Gap | Status | Resolution | Resolution Source | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GAP-1 | Discovery | §2.6 / §8 Q1 | Sitemap loc style for wiki index | Closed | Use directory URL `https://jpolvora.github.io/workflow-skills/wiki/` plus one `<loc>` per generated feature HTML. Do **not** also emit `.../wiki/index.html` (duplicate). Preserve existing three locs. | project | AC10 first option; current `docs/sitemap.xml` shape; companion discovery decision |
| GAP-2 | Idempotency | §2.3 / §8 Q2 | Orphan HTML when markdown is deleted | Closed | Write mode: delete HTML under `docs/wiki/` whose source markdown disappeared. `--check`: extra on-disk HTML vs generated set is stale (fail). When source wiki is skipped (no `index.wiki.md`), do **not** require or prune leftover `docs/wiki/` (NS6). | assumed-default | Spec skip rule NS6; `--check` determinism in §0 |
| GAP-3 | Navigation | §3 Step 5 / §8 Q3 | Dot-nav Wiki vs hash-only dots | Closed | Add `<a href="wiki/" class="dot-nav-item">` with tooltip Wiki. Landing `.nav-links` Wiki `href="wiki/"` remains required. Hash dots stay for in-page sections. | project | AC4 “matching section-dot nav if present”; `docs/index.html` `.dot-nav` exists L81–90 |
| GAP-4 | Config | §2.1 | `plans.wikiDir` missing on this hub | Closed | Resolve `config.plans.wikiDir` if a non-empty string; else schema default `.agents/specs/wiki`. Containment: resolved path must stay inside repo root (`=== root` or `startsWith(root + sep)`). Do not add `--wiki-dir` CLI. | project | `config.json` plans has no `wikiDir`; `config.schema.json` default; `test/test-wiki.js` containment |
| GAP-5 | Architecture | §2.2 / sitemap | Sitemap not generated today | Closed | After wiki emit, rewrite `docs/sitemap.xml` in the same `build-site.js` run from a fixed prefix (landing, `llms.txt`, GitHub) plus wiki locs from the builder return value. `--check` compares LF-normalized sitemap bytes. Tests use temp sitemap / returned `sitemapLocs`, not a mutation of tracked XML without restore. | project | `bin/build-site.js` never writes sitemap today; AC10; `robots.txt` Sitemap line |
| GAP-6 | Security | §2.4 | Unsafe URL schemes in markdown links | Closed | `http(s):` / `mailto:` unchanged (attribute-escaped). `#fragment` kept. Relative wiki `.md` / `index.wiki.md` rewritten. `javascript:`, `data:`, and other non-allowlisted schemes: drop or inert text (same as traversal). | model-inferred | AC6 event-handler / script; Step 2 fixture already mentioned `javascript:` |
| GAP-7 | Presentation | §2.5 | Wiki chrome vs full landing hash nav | Closed | Wiki documents get a **minimal** chrome: Home (or Wiki) back to landing (`../` / `../../`), optional theme-toggle progressive enhancement, no landing `#features` hash nav. Article body is in the HTML payload (AC13). Optional `data-theme` script must not be the only renderer. | project | AC5 labels; AC13; landing nav hashes would 404 on wiki pages |
| GAP-8 | CLI / check | §2.6 | Early exit hides wiki stale | Closed | Run landing compare **and** wiki/sitemap compare; collect stale reasons; then exit non-zero. Stderr must name `docs/wiki` when wiki is stale, even if `docs/index.html` is also stale. | project | AC8 “not only docs/index.html”; current `--check` `process.exit(1)` at landing mismatch L613–615 |
| GAP-9 | Tests | §3 / DoR TDD | Builder steps did not name a red test in-step | Closed | Create `test/test-site-wiki.js` (ESM, temp dirs, import `buildWikiSite`) **before** wiring writes; keep named methods in §5 failing until the matching builder behavior exists. Add the file to `package.json` `tests:harness-efficiency` (and `tests` if that script must stay aligned). Do not mutate tracked `{wikiDir}`. | project | Interview DoR: failing test baseline; AC15; `test/test-wiki.js` / `test-doc-sync.js` ESM pattern |
| GAP-10 | Walk | §2.3 | Recursion depth vs live wiki | Closed | Include only `{wikiDir}/index.wiki.md` and `{wikiDir}/{domain}/{feature}.md` (exactly one directory segment). Skip `sweep.state.json`, non-`.md`, nested extra trees, and paths that escape `{wikiDir}`. | project | Live `.agents/specs/wiki/**` layout; AC1 mapping |
| GAP-11 | Skip leftovers | §2.3 / NS6 | Behavior when source wiki absent but `docs/wiki/` exists | Closed | Skip emit; `--check` does not fail solely because `docs/wiki/` is present or absent. Do not write wiki HTML. Do not treat leftover HTML as required. | project | Spec assumption “Missing `{wikiDir}` / missing `index.wiki.md`” |
| GAP-12 | Ship / traps | §7 | Integrity, benchmarks, Phase 5a, G2 staging | Closed | No `ws-run-benchmark` / `npm run benchmark`. Integrity regen only if hashed `.agents/skills` files change (this work is `bin/` `docs/` `test/` unless skills are touched). Ship checklist notes mechanical Phase 5a ≠ full Phases 0–5c. Product commits: this slug `files_touched` only. Node-only module (no Python twin). | project | Memory traps listed in dispatch; `commitPlanFilesOnlyAtStep8`; dual-runtime trap |
| GAP-13 | Renderer | §2.4 | Tables/images (deferred) | Closed | Out of subset: do not add npm GFM. Tables/images render as escaped text or omitted; not live HTML. Companion deferred ideas stay deferred. | project | `0077-website-wiki-page.context.md` Deferred Ideas |
| GAP-14 | CSS | §3 Step 6 | Wiki article selectors missing | Closed | Add `.wiki-page` / `.wiki-article` / `.wiki-toc` using existing `--text-main` / `--accent-*`. No new neon/glow palette. Landing timeline glows stay on the landing page only. | project | `docs/assets/css/style.css` has tokens, no `wiki-` rules; AC12 |
| GAP-15 | Stack N/A | §4 / §6 | Auth / DTO / subscriptions / i18n | Closed | Remain N/A with reason: static files, no HTTP API, `frontend.i18n.framework` is `none`. English chrome labels. | project | Spec DoR; `config.json` stack.frontend |
| GAP-16 | Concurrency | probes | Soft-delete / rate-limit / list size | Closed | N/A HTTP. Analog: orphan prune (GAP-2). Sync `fs` only (NS8). Wiki tree is small (~10 pages); no pagination. | project | Spec auth/rate N/A; live wiki file count |

## Shared Understanding

`shared_understanding: confirmed` (orchestrator End refinement / autoMode). `blocking_open: 0`. Round 0 (no user-gate). Plan of record: `step-02-website-wiki-page.plan.refined.md`. `step-01` untouched.
