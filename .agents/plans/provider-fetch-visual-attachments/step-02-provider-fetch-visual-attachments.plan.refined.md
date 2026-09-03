---
slug: provider-fetch-visual-attachments
title: Download tracker images and attachments during fetch-to-spec (GitHub and Azure DevOps parity)
status: active
step: 2
workflowId: provider-fetch-visual-attachments-20260903T131113Z
startedAt: "2026-09-03T13:11:13Z"
endedAt: "2026-09-03T13:22:21.371Z"
acRefs: []
---
## 0. Summary & Business Rules

**Objective:** Extend the existing SCM intent `fetch-to-spec` so GitHub and Azure DevOps both download visual attachments, rename them into a spec-of-record sidecar, emit `## Visual References`, and copy that sidecar into `{us-dir}/attachments/` at register. Callers keep passing `fetch-to-spec` only. No tenth intent. Empty provider allowlist.

**Greenfield (Design Intent):** Converters today snapshot JSON and markdown/HTML text only. `github-issue-to-spec.py` copies remote image URLs. `ado-workitem-to-spec.py` `clean_html` strips `<img>` and ignores `AttachedFile` relations. `git log` on both provider trees is skill-family rename / host-binding; `git grep` on converters + `scm-provider-contract.md` + `test/test-provider-parity.js` finds no downloader, `user-attachments` handler, or `manifest.json`. Skip `git log -L` on a missing symbol.

**Business rules:**

1. **Host mapping differs; behavior does not.** GitHub and Azure converters extract URLs only. One shared Node helper under `{sharedDir}/scripts/` owns download, allowlist, naming, manifest, Visual References shape, failure policy, and stdout. Both implementers ship in the same change.
2. **No new intent id.** Extend the `fetch-to-spec` Output + Behavioral guarantee. Do not add `fetch-assets`. Keep the provider-specific allowlist empty.
3. **Spec-of-record sidecar survives plan cleanup.** Assets live at `{specsDir}/{specStem}.assets/` where `{specStem}` is the spec filename without `.spec.md` (may be `NNNN-{slug}`). Frontmatter `slug` stays unprefixed. `{us-dir}` stays `{plansDir}/{slug}/`. Register copies the sidecar to `{us-dir}/attachments/`.
4. **Scripts download; agents Read.** The helper never interprets UI. `ws-spec-write` Reads each `ok` image. PDFs are file links, not vision-analyzed. SVG/HTML/executables are `disallowed-type`.
5. **Partial failure is success.** One URL 404/403/timeout records `failed` and leaves converter exit 0 when the spec file was written. Missing `validate-auth` still STOPs the whole live fetch with no GitHub↔Azure fallback.
6. **One runtime for the new helper.** Node `.cjs` only. Do not add `ingest_visual_attachments.py`. Reuse `http_retry.cjs` inside the helper. Pre-existing Python converters stay Python and subprocess the helper.

**Security mitigations:**

- Host allowlist (GitHub user-attachment/user-image hosts; ADO `{apiBase}` WIT attachments API). Arbitrary `https://example.com` is `disallowed-host`.
- Auth headers never written to spec, manifest `sourceHost`, or stdout (strip query tokens and PATs).
- Size caps: 10 MiB per file, 50 MiB run total → `size-limit`, no abort.
- Disallowed MIME: `image/svg+xml`, HTML, executables.

**Stack:** `node-skills-package` (Node 22). Layers: `skills-sot`, `tests`, hub `ws-shared/scripts`. No frontend, DB, or i18n. `fable.autoDetectDomain`: Node skills package, not IaC/K8s/DB — skip domain adapters.

**MEMORY applied (Medium+):** persist/use `plans.enforceSpecPrefixOrdering` + `resolve_spec_path.cjs` (do not invent a second flag or concatenate `{specsDir}/{slug}.spec.md` for new spec-of-record writes); Node-only new helper; both SCM implementers in one change; G2-code later stages only this slug `files_touched`; do not load `ws-run-benchmark`.

## 1. Definition of Ready & Scope

### Resolved assumptions

| Topic | Default used in this plan | Source |
|-------|---------------------------|--------|
| Contract shape | Extend `fetch-to-spec`; no new id | Spec + context companion |
| Shared helper | One `{sharedDir}/scripts/ingest_visual_attachments.cjs` | Spec AC4–AC5 + MEMORY dual-runtime trap |
| Always-on | Ingest during `fetch-to-spec`; `--skip-assets` fixture hatch only | Spec Notes |
| Local provider | Copy sidecar only; no remote download | Spec AC14 |
| Prefix / stem | `{specStem}` = basename of the spec file actually written, minus `.spec.md` | Spec AC5; `enforceSpecPrefixOrdering` already `true` here |
| Domain adapters | Skip | Not IaC/K8s/DB |

Interview locked the eight open choices in section 8 (all Recommended options). See `## Interview registry`.

### Acceptance Criteria (measurable)

| AC | Statement | Plan step | Tests (section 5) |
|----|-----------|-----------|-------------------|
| AC1 | Extend `fetch-to-spec` on both SCM implementers in the same ship; no new intent; empty allowlist | D | `test_parity_no_new_intent`, `test_parity_allowlist_empty`, NS1, NS2 |
| AC2 | GitHub extracts markdown images, HTML `img`, and `github.com/user-attachments/` links from body + every comment | B | `test_gh_extract_body_and_comments` |
| AC3 | ADO extracts Description HTML, AC HTML, `AttachedFile` relations, WIT comments | C | `test_ado_extract_html_relations_comments`, NS4 |
| AC4 | URL discovery may differ; download/naming/manifest/Visual References/failure/register copy identical | A, B, C, E | `test_helper_shared_by_both_converters` |
| AC5 | Both converters call one shared helper that writes `{specsDir}/{specStem}.assets/` | A, B, C | `test_assets_dir_matches_spec_stem`, NS8 |
| AC6 | Saved name `{NN}-{kind}-{sanitized-stem}{ext}`; `NN` from `01`; kinds listed | A | `test_naming_nn_kind_stem_ext` |
| AC7 | Kind: keyword in alt/filename, else origin map; unlabeled images default `screenshot` | A | `test_kind_keyword_then_origin` |
| AC8 | Downloads reuse `validate-auth` credentials; auth failure STOPs; no silent host switch | A, B, C, D | `test_auth_reuse_and_stop`, NS3 |
| AC9 | Off-allowlist URL → `disallowed-host` | A | `test_disallowed_host`, NS7 |
| AC10 | >10 MiB file or >50 MiB run → `size-limit`; fetch still succeeds | A | `test_size_limit_skip` |
| AC11 | One URL 404/403/timeout → manifest `failed`; converter exit 0 if spec written | A, B, C | `test_partial_http_failure_exit_0`, NS6 |
| AC12 | ≥1 `ok` image → `## Visual References` with repo-relative markdown images + table | A | `test_visual_references_ok_image`, NS5 |
| AC13 | Zero `ok` → no assets dir, no heading, fetch succeeds | A | `test_zero_ok_no_sidecar` |
| AC14 | `register_local_spec.cjs` copies `{specStem}.assets/` → `{us-dir}/attachments/` when source exists | E | `test_register_copies_assets` |
| AC15 | `ws-spec-write` Reads each `ok` image and folds UI/layout/template constraints | G | `test_spec_write_skill_requires_vision_read` |
| AC16 | `ws-plan-write`, `ws-plan-interview`, `ws-implement-tasks` require reading those images when the heading exists | H | `test_plan_implement_skills_require_vision_read` |
| AC17 | `FORMAT.md` documents optional `## Visual References`; specs without it still pass `--mode=compat` | F | `test_format_optional_visual_references_compat` |
| AC18 | Contract `fetch-to-spec` row states inbound download + sidecar + Visual References | D | `test_contract_fetch_to_spec_ingest_row` |
| AC19 | Both INTENTS `## fetch-to-spec` procedures include ingest with the same output paths; parity test exit 0 | D | `test_intents_ingest_step_parity` |
| AC20 | Parity test asserts both INTENTS `fetch-to-spec` sections mention assets sidecar or `Visual References` | D | `test_parity_intents_mention_assets`, NS1 |
| AC21 | Disallowed MIME skipped as `disallowed-type`; allow png/jpeg/gif/webp/pdf | A | `test_disallowed_and_allowed_mime` |
| AC22 | PDF is a file link, not a markdown image, and is not vision-analyzed | A, G | `test_pdf_file_link_not_image` |
| AC23 | ADO `clean_html` converts `<img src alt>` to markdown before tag strip | C | `test_ado_clean_html_preserves_img_markdown`, NS4 |
| AC24 | Offline `--input` still extracts and attempts download when auth exists; unreachable URLs `skipped`/`failed`, conversion continues | B, C | `test_offline_input_partial_download` |
| AC25 | Fixture tests with mock HTTP cover **both** converters: renamed files, manifest fields, rewritten links, 404 still success | L | `test_gh_converter_fixture_mock_http`, `test_ado_converter_fixture_mock_http` |
| AC26 | `ws-spec-from-provider` inherits ingest through `fetch-to-spec`; no second downloader | I | `test_from_provider_no_second_downloader` |
| AC27 | `ws-cleanup` must not delete `{specsDir}/{specStem}.assets/`; `{us-dir}/attachments/` stays plan-cleanup eligible | J | `test_cleanup_spares_specs_assets`, NS8 |
| AC28 | `FEATURES.md` § SCM provider parity describes ingest as part of `fetch-to-spec` | K | `test_features_fetch_to_spec_ingest` |

### In scope

- Hub contract `fetch-to-spec` row + shared rule text if needed for sidecar (not a new intent row).
- `ingest_visual_attachments.cjs` + both converters (extract + subprocess) + both INTENTS/SKILL tables.
- `register_local_spec.cjs` recursive copy of sibling `{stem}.assets/` (Python twin is already a CJS shim — do not reimplement).
- FORMAT / validate_spec optional heading; skill-body Read obligations; cleanup never-delete note; FEATURES row; fixture + parity tests.

### Out of scope

- New SCM intent or GitHub-only / ADO-only attachment skill.
- Remote download in `ws-spec-provider-local`.
- Changing create-pr, threads, sweep, comment-issue, merge-pr.
- Upload back to the tracker; OCR / UI-tree extraction; SVG ingest.
- Python mirror of the ingest helper.
- `ws-run-benchmark` / `npm run benchmark`.

## 2. Technical Design & Architecture

### Layer edits (`config.json` → `stack.backend.layers`)

| Layer | Path | Change |
|-------|------|--------|
| **hub scripts** | `.agents/skills/ws-shared/scripts/ingest_visual_attachments.cjs` | **New** Node helper: allowlist, download via `http_retry.cjs` `fetchRetry`, kind/name, sha256, `manifest.json`, Visual References patch, stdout JSON |
| **hub contract** | `.agents/skills/ws-shared/scm-provider-contract.md` | Extend `fetch-to-spec` Output + Behavioral guarantee |
| **skills-sot** | `ws-spec-provider-github` SKILL.md, INTENTS.md, `github-issue-to-spec.py` | Extract URLs; call helper; INTENTS ingest step |
| **skills-sot** | `ws-spec-provider-azure-devops` SKILL.md, INTENTS.md, `ado-workitem-to-spec.py` | `clean_html` img→markdown; extract HTML/relations/comments; call helper |
| **skills-sot** | `ws-spec-provider-local/scripts/register_local_spec.cjs` | Copy `{specStem}.assets/` → `{us-dir}/attachments/` |
| **skills-sot** | `ws-spec-write`, `ws-spec-format/FORMAT.md`, `validate_spec.cjs` if needed | Vision Read; optional heading; compat still passes without it |
| **skills-sot** | `ws-plan-write`, `ws-plan-interview`, `ws-implement-tasks` | Read images before plan/edit when heading exists |
| **skills-sot** | `ws-spec-from-provider/SKILL.md` | Inherit via `fetch-to-spec`; no second downloader; write path via `resolve_spec_path.cjs` |
| **skills-sot** | `ws-cleanup/references/PATTERNS.md` | Explicit never-delete for `{specsDir}/**/*.assets/` |
| **inventory** | `FEATURES.md` | `fetch-to-spec` guarantee includes visual ingest |
| **tests** | `test/test-provider-parity.js`, `test/test-visual-attachment-ingest.js` | Parity assertions + mock-HTTP fixtures |
| **installer-cli** | `package.json` `tests` / `tests:harness-efficiency` | Wire the new test file. Integrity regenerate at ship (hub `scripts/` already on `HUB_WHITELIST`) |

**Frontend / DB / API / i18n / RBAC product:** none.

### Shared helper (normative)

**Path:** `{sharedDir}/scripts/ingest_visual_attachments.cjs`  
**Invoke:** `node {sharedDir}/scripts/ingest_visual_attachments.cjs --spec-path <file> --urls-json <file> --provider github|azure-devops [--api-base URL] [--auth-env NAME] [--skip-assets]`

`--urls-json` items (converter-owned extract): `{ url, origin, alt, filename, caption }` where `origin` is `body` | `comment` | `relation`.

**`{specStem}`:** `path.basename(specPath).replace(/\.spec\.md$/i, '')`. Assets dir: `{dirname(specPath)}/{specStem}.assets/`. Do not build the sidecar from frontmatter `slug`.

**Kind algorithm (locked):**

1. Lowercase `alt` + original `filename`.
2. Keyword: `screenshot`/`print` → `screenshot`; `template`/`mock`/`wireframe` → `template`; `example`/`sample` → `example`.
3. Else if unlabeled image (no keyword): `screenshot`.
4. Else origin: `body` → `inline`, `comment` → `comment`, `relation` → `attached`.

**Filename:** `{NN}-{kind}-{sanitized-stem}{ext}` with `NN` = `01`… decimal, 2+ digits. Sanitized stem from alt or original filename (filesystem-safe, truncated). Ext from MIME / URL path; default `.bin` only if unknown allowed type (should not happen if MIME gate passed).

**Allowlists (locked):**

- GitHub: `user-images.githubusercontent.com`, `private-user-images.githubusercontent.com`, `objects.githubusercontent.com`, host `github.com` path `/user-attachments/`.
- ADO: URL under `{apiBase}` (normalized) whose path contains `/_apis/wit/attachments/`.

**Auth:**

- GitHub: `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token` (same as `resolve_thread.cjs`).
- ADO: env from `--auth-env` (default `ADO_PAT`) then `AZURE_DEVOPS_PAT`; `Authorization: Basic base64(:pat)`.
- Live INTENTS path: `validate-auth` first; failure STOP, no provider switch (AC8, NS3).
- Helper: missing credentials when at least one allowlisted URL remains → live converters already STOP; offline `--input` continues with `skipped`/`failed` (AC24).
- Per-URL HTTP 403 after a token was sent → manifest `failed`, not a host switch (AC11 vs AC8).

**Download policy:**

- Reuse `fetchRetry` (`http_retry.cjs`); injectable `fetchImpl` for tests.
- Timeout per URL: **30s** (locked).
- HEAD/Content-Length when present: skip `size-limit` before body. After body: enforce 10 MiB file and 50 MiB cumulative.
- MIME allow: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `application/pdf`. Else `disallowed-type`. Sniff magic bytes if header missing/wrong.
- 404 / 403 / timeout / network → `status: failed` (or `skipped` when never attempted). Do not throw out of the helper; exit 0 when `--spec-path` write/patch succeeded.

**Zero `ok`:** do not create the assets directory; do not insert `## Visual References`; print skip/fail counts; exit 0.

**≥1 `ok`:** write files + `manifest.json`; rewrite remote URLs in the spec body to repo-relative local paths; insert `## Visual References` (images as `![caption](path)`; PDFs as `[caption](path)`); table columns: path, kind, origin, caption.

**Manifest row (minimum):** `localPath`, `kind`, `origin`, `status` (`ok` | `skipped` | `failed`), `skipReason`, `sha256`, `bytes`, `mime`, `sourceHost` (no query, no PAT). `skipReason`: `disallowed-host` | `disallowed-type` | `size-limit` | `skip-assets` | empty when `ok`/`failed`.

**Stdout:** assets directory path when any `ok`; skip/fail counts otherwise. JSON object on `--json` for tests.

**`--skip-assets`:** extract is still the converter’s job; helper writes nothing, no heading, exit 0.

### Converter split

| Owner | Does | Does not |
|-------|------|----------|
| GitHub converter | Parse issue JSON body + `comments[].body` for `![alt](url)`, `<img src alt>`, and `github.com/user-attachments/` file/asset links; write spec; subprocess helper with `--provider github` | Download, rename, manifest, Visual References template |
| ADO converter | Before strip: `<img src alt>` → `![alt](src)` in Description + AC HTML; collect `relations` `AttachedFile` URLs as `origin: relation`; live-fetch WIT comments (`api-version=7.1-preview.4`, same as `comment_issue.py`) and extract HTML images; subprocess helper with `--provider azure-devops --api-base --auth-env` | Own HTTP download of binaries |
| Helper | All download/name/manifest/patch | Tracker JSON fetch |

**Spec output path (locked):** Converters resolve default `--output` via `node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug {unprefixedSlug}` so `{specStem}.assets/` pairs with the spec of record (`NNNN-us-{n}.spec.md` when `plans.enforceSpecPrefixOrdering` is true). Frontmatter `slug` stays unprefixed.

**Python → Node:** `subprocess` with explicit `node` launcher (tools.md). Pass a temp urls JSON; delete temp when done. Do not vendor a Python download loop.

### Register copy

After writing spec of record + workflow copy, if `{dirname(specPath)}/{specStem}.assets/` exists, recursively copy to `{usDir}/attachments/` (**replace** dest `attachments/` when source sidecar exists; spec refuse-on-differ still applies to `.spec.md` files only).

`register_local_spec.py` already execs the CJS SoT — no Python copy logic.

### Downstream skills

- `ws-spec-write` reformulation: if `## Visual References` exists, Read each `ok` image (skip PDF); write observed UI/layout/template constraints into Description, ACs, or Notes. Keep human text in Original Issue Context (now with rewritten local paths).
- Plan / interview / implement: same Read-before-edit when the heading exists on the spec of record or step-00 copy.
- `ws-spec-from-provider` step 5 keeps calling provider `fetch-to-spec` phase 1–2; add an explicit “no second downloader” sentence; change the reformulate target from concatenated `{specsDir}/us-{id}.spec.md` to `resolve_spec_path.cjs --slug us-{id}`.
- `ws-cleanup`: `{specsDir}` is already never scanned; add an explicit never-delete bullet for `{specsDir}/**/*.assets/` so a future scan expansion cannot drop templates. Do **not** add `{us-dir}/attachments/` to never-delete.

### Invariants from `config.json.invariants`

- `commitPlanFilesOnlyAtStep8: true` — this plan file is not a product commit.
- EF/tenancy keys are false / N/A.

## 3. Step-by-Step Plan

### Step A — Shared ingest helper

- **Action:** Add `ingest_visual_attachments.cjs` with CLI, allowlist, `fetchRetry`, kind/name, size/MIME gates, manifest, spec patch, `--skip-assets`, injectable `fetchImpl`. Export a `ingestVisualAttachments(options)` function so tests do not need live HTTP.
- **Files:** `.agents/skills/ws-shared/scripts/ingest_visual_attachments.cjs` (create); optionally a short comment in `http_retry.cjs` only if a hook is required (prefer passing `fetchImpl` without editing retry).
- **Checks:** Unit-style Node tests in Step L; no Python twin; `sourceHost` has no query/PAT.
- **ACs:** AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC21, AC22.

### Step B — GitHub extract + converter wiring

- **Action:** In `github-issue-to-spec.py`, collect URLs from body and every comment; write spec including Original Issue Context remote links; resolve output path (section 8); unless `--skip-assets`, subprocess the helper with GitHub auth env; keep converter exit 0 on partial download failure. Add `--skip-assets`. INTENTS/SKILL output notes wait for Step D.
- **Files:** `.agents/skills/ws-spec-provider-github/scripts/github-issue-to-spec.py`.
- **Checks:** Fixture JSON with markdown image, HTML img, user-attachments link in body and in a comment.
- **ACs:** AC2, AC4, AC5, AC8, AC24, AC25.

### Step C — Azure extract + `clean_html` + comments

- **Action:** Change `clean_html` to convert `<img src alt>` to markdown images **before** tag strip. Extract from Description HTML, Acceptance Criteria HTML, `relations` where `rel` is `AttachedFile`, and WIT comments (live GET comments API; offline: comments array on `--input` if present). Subprocess helper with `--provider azure-devops --api-base --auth-env`. `--skip-assets`. Live `--id` still `resolve_pat` STOP when PAT missing (no GitHub fallback).
- **Files:** `.agents/skills/ws-spec-provider-azure-devops/scripts/ado-workitem-to-spec.py`.
- **Checks:** Fixture `$expand=all` JSON with img HTML + AttachedFile; comments fixture; `clean_html` keeps `![alt](src)`.
- **ACs:** AC3, AC4, AC5, AC8, AC23, AC24, AC25.

### Step D — Contract, INTENTS, SKILL tables, parity

- **Action:** Extend `fetch-to-spec` Output + Behavioral guarantee: inbound fetch downloads visual attachments when present; writes `{specsDir}/{specStem}.assets/` + `## Visual References`; register copy is local. Do **not** add a required-intent row. Keep allowlist empty. Add the same ingest step (output paths identical) to both `INTENTS.md` `## fetch-to-spec` procedures and mention the sidecar on both SKILL.md `fetch-to-spec` output cells. Assert in `test-provider-parity.js` that **both** INTENTS `fetch-to-spec` sections match `assets` or `Visual References`, and that neither SKILL/INTENTS introduces a one-sided extra intent.
- **Files:** `.agents/skills/ws-shared/scm-provider-contract.md`; `ws-spec-provider-github/SKILL.md`, `INTENTS.md`; `ws-spec-provider-azure-devops/SKILL.md`, `INTENTS.md`; `test/test-provider-parity.js`.
- **Checks:** `node test/test-provider-parity.js` exit 0; a one-sided INTENTS edit fails (NS1).
- **ACs:** AC1, AC8, AC18, AC19, AC20.

### Step E — Register copy

- **Action:** After successful spec/workflow writes, if the spec-of-record sibling `{specStem}.assets/` exists, copy recursively to `{usDir}/attachments/`. Derive `{specStem}` from `path.basename(specPath)` (handles `NNNN-` names). Do not download. Do not create attachments when the source dir is missing.
- **Files:** `.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs`; one sentence on `ws-spec-provider-local/SKILL.md` fetch-to-spec notes.
- **Checks:** Prefix-ordered spec `0061-us-99.spec.md` + `0061-us-99.assets/` copies to `{plansDir}/us-99/attachments/`.
- **ACs:** AC4, AC14.

### Step F — FORMAT + compat

- **Action:** Document optional `## Visual References` in `FORMAT.md` (not a required closure heading). Specs without it still pass `--mode=compat`. Authoring mode does not require the heading. If `validate_spec.cjs` has an unknown-heading deny list, allow this heading; do not fail when absent.
- **Files:** `.agents/skills/ws-spec-format/FORMAT.md`; `validate_spec.cjs` only if a deny/allow list needs the name.
- **Checks:** Existing fixture spec without heading → compat 0; a minimal spec with Visual References still authoring-valid when other required sections exist.
- **ACs:** AC17.

### Step G — `ws-spec-write` vision Read

- **Action:** In the reformulation protocol, after Parse & Ingest: if `## Visual References` is present, Read each `ok` image listed (skip PDF / non-image). Fold visible UI, layout, or template constraints into Description, ACs, or Notes. Do not vision-analyze PDFs (AC22).
- **Files:** `.agents/skills/ws-spec-write/SKILL.md`.
- **Checks:** Grep/skill test that the obligation is present; no new downloader in this skill.
- **ACs:** AC15, AC22.

### Step H — Plan / interview / implement Read

- **Action:** Add the same “Read Visual References images before planning or editing product files when that heading exists” obligation to the three skill bodies (entry/steps, not a new skill).
- **Files:** `.agents/skills/ws-plan-write/SKILL.md`; `ws-plan-interview/SKILL.md`; `ws-implement-tasks/SKILL.md`.
- **Checks:** Skill-body assertion test.
- **ACs:** AC16.

### Step I — `ws-spec-from-provider` inherit

- **Action:** State that bulk import inherits ingest through provider `fetch-to-spec` and must not grow a second downloader. Point reformulate/write at `resolve_spec_path.cjs --slug us-{id}` (MEMORY: do not concatenate `{specsDir}/us-{id}.spec.md`).
- **Files:** `.agents/skills/ws-spec-from-provider/SKILL.md`.
- **Checks:** Grep that the skill has no download/attachment helper path of its own.
- **ACs:** AC26.

### Step J — Cleanup spare spec assets

- **Action:** In `PATTERNS.md` Never delete: `{specsDir}/**/*.assets/` (and `manifest.json` inside). Leave `{us-dir}/attachments/` as a normal plan artifact (eligible when the plan root is shipped/cancelled).
- **Files:** `.agents/skills/ws-cleanup/references/PATTERNS.md`; `test/test-ws-cleanup.js` only if it enumerates never-delete globs.
- **Checks:** A fake `{specsDir}/0060-x.assets/ok.png` is not listed as disposable; `{us-dir}/attachments/` can be.
- **ACs:** AC27.

### Step K — FEATURES

- **Action:** In `FEATURES.md` § SCM provider parity, extend the `fetch-to-spec` guarantee cell: downloads visual attachments when present, writes the shared `{specStem}.assets/` sidecar and `## Visual References`. Not a separate intent. Keep “nine required intents”.
- **Files:** `FEATURES.md`.
- **Checks:** Grep FEATURES `fetch-to-spec` mentions assets or Visual References and does not list `fetch-assets`.
- **ACs:** AC28.

### Step L — Fixture tests + wire `npm run test`

- **Action:** Add `test/test-visual-attachment-ingest.js` with a mock HTTP layer covering **both** converters and the helper. Assert renamed files, manifest `sha256`/`kind`/`origin`/`status`, rewritten spec links, exit 0 when one URL 404s, disallowed host, size-limit, MIME, PDF link, zero-ok, register copy, prefix stem. Extend `test-provider-parity.js` (Step D). Wire the new file into `package.json` `tests` (and `tests:harness-efficiency` if that is where sibling spec tests live — prefer the main `tests` chain beside `test-provider-parity.js`).
- **Files:** `test/test-visual-attachment-ingest.js` (create); `package.json`; `test/test-provider-parity.js` (Step D).
- **Checks:** `node test/test-visual-attachment-ingest.js` and `node test/test-provider-parity.js` exit 0.
- **ACs:** AC25 (and regression coverage for AC1–AC14, AC21–AC24, AC27).

**Defect-class sibling sweep (repo-wide, for implementers):** After adding ingest, grep for a second downloader, a new intent heading, a Python twin of the helper, and `{specsDir}/{slug}.spec.md` concatenations in files this change already touches (`ws-spec-from-provider`, converters). No sabotage required in `ac-ledger` (`sabotage.required: false`); mutation unset — if Step 5 later asks sabotage, `run_sabotage.py` on the helper kind/allowlist functions only.

## 4. Permissions, Tenancy & i18n

- **RBAC / tenancy / i18n:** N/A (Node skills package, no app tenants).
- **Tracker auth:** Reuse existing `validate-auth` (GitHub `gh` / token env; ADO PAT env). No new secret names. Manifest and spec must not persist tokens.
- **Isolation:** Downloads only from host allowlists. `ws-spec-provider-local` never uses tracker credentials to fetch binaries.

## 5. Test Coverage

Happy-path and skill-doc tests:

| AC | Test id | Method / assertion |
|----|---------|--------------------|
| AC1 | `test_parity_no_new_intent` | Required intents still the nine ids; no `fetch-assets` heading on either SCM |
| AC1 | `test_parity_allowlist_empty` | Provider-specific allowlist table has no data rows |
| AC2 | `test_gh_extract_body_and_comments` | Fixture body + comment yields three URL origins (`body`/`comment`) including `user-attachments` |
| AC3 | `test_ado_extract_html_relations_comments` | Description img, AC img, AttachedFile relation, comment img all queued |
| AC4 | `test_helper_shared_by_both_converters` | Both converters spawn the same `ingest_visual_attachments.cjs` path; identical manifest schema |
| AC5 | `test_assets_dir_matches_spec_stem` | Spec `0061-us-1.spec.md` → `0061-us-1.assets/`; frontmatter slug `us-1` |
| AC6 | `test_naming_nn_kind_stem_ext` | First file `01-screenshot-login.png` (example) |
| AC7 | `test_kind_keyword_then_origin` | alt `wireframe` → `template`; unlabeled image → `screenshot`; relation unlabeled non-image pdf → `attached` |
| AC8 | `test_auth_reuse_and_stop` | Helper sends GitHub/ADO auth header from env; live ADO `--id` without PAT exits non-zero before GitHub is attempted |
| AC9 | `test_disallowed_host` | `https://example.com/x.png` → `skipped`/`disallowed-host`; no file written |
| AC10 | `test_size_limit_skip` | 11 MiB body → `size-limit`; 3×20 MiB → third `size-limit`; converter 0 |
| AC11 | `test_partial_http_failure_exit_0` | One 404 among two URLs: one `ok`, one `failed`, spec exists, exit 0 |
| AC12 | `test_visual_references_ok_image` | Heading + `![](` repo-relative path + table row |
| AC13 | `test_zero_ok_no_sidecar` | All disallowed: no `.assets/` dir, no heading, exit 0 |
| AC14 | `test_register_copies_assets` | After register, `{us-dir}/attachments/` mirrors sidecar |
| AC15 | `test_spec_write_skill_requires_vision_read` | `ws-spec-write/SKILL.md` requires Read of `ok` images |
| AC16 | `test_plan_implement_skills_require_vision_read` | Three SKILL.md files contain the Visual References Read obligation |
| AC17 | `test_format_optional_visual_references_compat` | `FORMAT.md` documents the heading; `validate_spec.cjs --mode=compat` on a spec without it exits 0 |
| AC18 | `test_contract_fetch_to_spec_ingest_row` | Contract `fetch-to-spec` row mentions download/sidecar/Visual References |
| AC19 | `test_intents_ingest_step_parity` | Both INTENTS `fetch-to-spec` sections include the same `{specStem}.assets/` (or equivalent) paths |
| AC20 | `test_parity_intents_mention_assets` | `test-provider-parity.js` fails if one INTENTS section omits assets/Visual References |
| AC21 | `test_disallowed_and_allowed_mime` | svg/html/exe → `disallowed-type`; png/jpeg/gif/webp/pdf allowed |
| AC22 | `test_pdf_file_link_not_image` | PDF row is `[text](path)` not `![](`; spec-write skill excludes PDF from vision Read |
| AC23 | `test_ado_clean_html_preserves_img_markdown` | `<img src="…/_apis/wit/attachments/…" alt="x">` becomes `![x](…)` before strip |
| AC24 | `test_offline_input_partial_download` | `--input` with mock 404 still writes spec |
| AC25 | `test_gh_converter_fixture_mock_http` | GitHub converter + mock fetch: names, manifest fields, rewritten links, 404 success |
| AC25 | `test_ado_converter_fixture_mock_http` | Same for ADO converter |
| AC26 | `test_from_provider_no_second_downloader` | `ws-spec-from-provider` has no ingest/download script; SKILL.md cites `fetch-to-spec` |
| AC27 | `test_cleanup_spares_specs_assets` | Never-delete includes spec `.assets/`; attachments remain plan-eligible |
| AC28 | `test_features_fetch_to_spec_ingest` | FEATURES `fetch-to-spec` cell describes ingest; no tenth intent |

Negative scenarios (NS1–NS8):

| NS | Test id | Expected fail / guard |
|----|---------|------------------------|
| NS1 Parity split | `test_parity_intents_mention_assets` | One-sided INTENTS ingest docs → `test-provider-parity.js` non-zero |
| NS2 New intent leak | `test_parity_no_new_intent` | `fetch-assets` (or similar) on one SCM without allowlist row → parity fail |
| NS3 Silent host switch | `test_auth_reuse_and_stop` | Missing ADO PAT must not invoke GitHub download |
| NS4 Stripped ADO images | `test_ado_clean_html_preserves_img_markdown` | Fixture fails if `clean_html` drops `src` |
| NS5 Remote leftover | `test_visual_references_ok_image` | After `ok`, spec must not still point at `user-images.githubusercontent.com` or ADO attachment URL for that asset |
| NS6 Hard fail on one 404 | `test_partial_http_failure_exit_0` | Converter exit 0; spec written |
| NS7 Disallowed host | `test_disallowed_host` | `example.com` not downloaded |
| NS8 Plan-only assets | `test_assets_dir_matches_spec_stem` + `test_cleanup_spares_specs_assets` | Sidecar exists under `{specsDir}`; cleanup of `{us-dir}` cannot be the only copy |

## 6. Invariants (Do Not Violate)

1. **Parity:** Host mapping may differ; `fetch-to-spec` behavior must not. Both GitHub and Azure in the same ship.
2. **No new SCM intent** and **empty allowlist**.
3. **One Node helper** under `{sharedDir}/scripts/` — no Python twin of ingest.
4. **`{specStem}` from filename**, not from concatenating `{slug}.spec.md` when `resolve_spec_path.cjs` applies. Frontmatter `slug` unprefixed. `{us-dir}` unprefixed.
5. **Local provider does not fetch** remote binaries.
6. **No silent GitHub↔Azure fallback** (contract shared rule 3).
7. **Do not persist secrets** in specs, manifests, or stdout.
8. **`commitPlanFilesOnlyAtStep8`:** product commits later stage only this workflow `files_touched`; never `git add -A`; no `{plansDir}` until Step 8.
9. **Do not load `ws-run-benchmark`.**
10. **Portable skills:** no host product names in SKILL/INTENTS/contract; path tokens `{sharedDir}` / `{specsDir}` / `{us-dir}`.
11. **en-us** only in skill bodies, gates, banners.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (helper in hub scripts; extract in converters; no new intent).
- [ ] Domain entities and mappings encapsulated — N/A (no EF/DB).
- [ ] Schema migrations created — N/A.
- [ ] Authorization checks applied (validate-auth reuse; STOP; no token in manifest).
- [ ] i18n keys declared — N/A.
- [ ] Test cases cover all ACs (section 5) including NS1–NS8.
- [ ] `node test/test-provider-parity.js` and `node test/test-visual-attachment-ingest.js` exit 0.
- [ ] `npm run test` green before claim complete.
- [ ] No `ingest_visual_attachments.py`.
- [ ] `FEATURES.md` updated; integrity regenerate at ship (`npm run generate-integrity`) because hub `scripts/` is hashed.

## 8. Resolved Decisions (Interview)

All eight open questions from Step 1 were closed with the **Recommended** option (`autoMode`, `resolutionSource: model-inferred` where no project hit). Implementers must not reopen these in Step 4 without a new blocking gap.

| # | Topic | Locked choice |
|---|-------|---------------|
| 1 | Converter default spec path | `resolve_spec_path.cjs --slug {unprefixedSlug}` for default `--output` |
| 2 | Kind fallback | Keyword wins; unlabeled images → `screenshot`; origin map only when not an unlabeled image |
| 3 | GitHub host allowlist | `user-images.githubusercontent.com`, `private-user-images.githubusercontent.com`, `objects.githubusercontent.com`, `github.com/user-attachments/` |
| 4 | Visual References position | After `## Original Issue Context` (before Notes) |
| 5 | ADO WIT comments offline | Extract comments only if present on `--input` JSON; live `--id` uses GET comments API (`7.1-preview.4`) |
| 6 | Register `attachments/` | Replace `{us-dir}/attachments/` when source `{specStem}.assets/` exists |
| 7 | Per-URL timeout | 30s |
| 8 | Spec patch owner | Helper rewrites links and inserts `## Visual References` (converters do not template the heading) |

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|--------|------------|------------------|----------|
| G1 | non-blocking | §2 | Converter output path vs organizer | closed | Lock `resolve_spec_path.cjs` for default `--output` | model-inferred | Spec AC5 + MEMORY spec-prefix trap; plan §8 #1 Recommended |
| G2 | non-blocking | §2 | Kind fallback for unlabeled images | closed | Keyword → screenshot default; origin map when not unlabeled image | model-inferred | Spec AC7; plan §8 #2 Recommended |
| G3 | non-blocking | §2 | GitHub host allowlist breadth | closed | Four-host allowlist (user-images, private-user-images, objects, user-attachments) | model-inferred | Spec AC9; plan §8 #3 Recommended |
| G4 | non-blocking | §2 | Visual References heading position | closed | After Original Issue Context | model-inferred | Spec AC12; plan §8 #4 Recommended |
| G5 | non-blocking | §3 Step C | ADO offline comment fetch | closed | Offline: comments from JSON only; live: GET comments API | model-inferred | Spec AC24; plan §8 #5 Recommended |
| G6 | non-blocking | §2 Register | attachments/ overwrite policy | closed | Replace dest when source sidecar exists | model-inferred | Spec AC14; plan §8 #6 Recommended |
| G7 | non-blocking | §2 | Per-URL HTTP timeout | closed | 30s | model-inferred | Plan §8 #7 Recommended |
| G8 | non-blocking | §2 | Who patches spec for Visual References | closed | Shared helper patches spec body | model-inferred | Spec AC4/AC12; plan §8 #8 Recommended |
| G9 | blocking | §5 | force_interview MEMORY traps (dual-runtime, G2-code, benchmarks) | closed | Apply DO NOT / INSTEAD DO in implement | project | `.agents/skills/ws-shared/MEMORY.md` traps cited in plan §0 |
| G10 | blocking | §5 | Negative scenarios NS1–NS8 test coverage | closed | Section 5 maps each NS to a named test id | project | `ac-ledger.json` negativeScenarios + plan §5 table |

**shared_understanding:** confirmed · **blocking_open:** 0 · **round:** 1
