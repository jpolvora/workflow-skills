---
step: 6
slug: website-wiki-page
workflowId: website-wiki-page-20260912T152056Z
status: completed
startedAt: "2026-09-12T15:38:47.576Z"
endedAt: "2026-09-12T15:38:47.576Z"
acRefs: []
---
# Code Review Report — website-wiki-page (round 1)

Reviewed committed snapshot only: `git diff main...HEAD` at `499b5125 feat(website-wiki-page): verified implementation`. Dirty `{plansDir}` is out of scope.

## Status: Clean (No feedback)

No Critical, Warning, or Suggestion findings with complete four-part proof. Step 6 may Advance. Do not start a fix loop.

### Diff scope (in-scope product)

- `bin/build-wiki-site.js` (new)
- `bin/build-site.js` (wiki orchestration + sitemap rewrite)
- `test/test-site-wiki.js` (new; listed in `package.json` `tests:harness-efficiency`)
- `docs/wiki/**.html`, `docs/index.html` Wiki nav, `docs/sitemap.xml`, `docs/assets/css/style.css` wiki tokens
- `FEATURES.md`, `README.md`

### Phase 1 hypotheses dropped in Phase 2

| Hypothesis | Read evidence | Why dropped |
|------------|---------------|-------------|
| XSS via wiki markdown | `escapeHtml` L17–24; `renderInline` L146–190; `javascript`/`data` drop L105–107 | Script/event payloads are text-escaped; `javascript:`/`data:` hrefs become escaped markdown, not live hrefs. Tests `testEscapesScriptPayload`. |
| Path traversal read/write | `isPathInside` L26–30; `resolveWikiDir` L45–48; `rewriteLink` L129–141; collect skips `entry.name.startsWith('.')` | Config `wikiDir` that escapes repo throws. `..` markdown links return null. Writes use `outRel` from `readdir` names, not user CLI paths. |
| Unknown CLI flags | `bin/build-site.js` L23–29 | Unknown args still usage-exit 1 before wiki I/O. Wiki adds no required flag. |
| Floating Promises | `build-wiki-site.js` sync `fs` only | No `async`/`then(` in builder (asserted by `testWikiBuilderIsSync`). |
| `{wikiDir}` JS-template sanitizer trap | `build-site.js` wiki block L616–657 | Wiki path tokens are not interpolated as `{wikiDir}` inside template literals. |
| CRLF `--check` flap | `normalizeLf` on HTML and sitemap | Matches trap `build-site SKILL.md frontmatter CRLF`; wiki HTML and sitemap LF-normalized. |
| Ineffective unknown-flag test | `testUnknownFlagsStillUsage` L286–299 | Temp `outDir` equality is redundant (CLI writes `docs/wiki`), but `status === 1` and `Usage:` stderr are effective gates. Not a weakened check. |
| Symlink-follow prune | `listHtmlFiles` / `unlinkSync` L364–367 | Local trusted authoring tree; AC7 names `..` not `realpath`. Incomplete exploit vs untrusted network input. |

Sibling search: no second markdown-to-HTML renderer in `bin/` besides this module. `bin/build-site.js` still stamps catalog HTML only.

### MEMORY sweep

Confirmed **no violations** on in-scope paths:

- CRLF: wiki HTML/sitemap use `normalizeLf`.
- JSON-state hub sanitizer: no `{wikiDir}` braces in `build-site.js` template strings.
- G2-code files_touched: review snapshot is already the product commit; this step writes review only.
- Dual Node/Python: wiki builder is Node ESM only.

### Stack Invariant Compliance

Stack pack: `typescript-node.md` (Node 22 site generator; config `stack.id` = `node-skills-package`).

- [x] No unchecked `any` / `@ts-ignore` (plain JS).
- [x] Zero floating Promises (sync CLI).
- [x] CLI boundary: `--bump` / `--check` allow-list unchanged.
- [x] Path containment: `path.resolve` + `isPathInside` on repo/`wikiDir`; intra-wiki hrefs checked before emit.
- [x] XSS: HTML escape on text and attributes; dangerous schemes dropped.
- [x] `scan_stack_invariants.cjs --stack typescript-node` on `bin/build-site.js` `bin/build-wiki-site.js` `test/test-site-wiki.js`: 0 issues.
- [x] `config.json.invariants`: no EF/tenancy rules apply; `commitPlanFilesOnlyAtStep8` respected (review artifact only).
- Local reviewer dry-run: **skipped** (`localReviewCommand` unset; no `scripts/cursor-reviewer`).
- Fable (`enabled` + `autoAudit`): lightweight pass. No Weakened Checks, False Completion, Scope Creep, or Unauthorized Action on this snapshot (no extra npm markdown deps; tests cover AC6/AC7/AC8/AC14).

**Apply fixes?** No. Clean review.

No feedback.
