---
id: null
slug: provider-fetch-visual-attachments
title: "Download tracker images and attachments during fetch-to-spec (GitHub and Azure DevOps parity)"
source: local
specDate: 2026-09-03
---

# Specification — Download tracker images and attachments during fetch-to-spec (GitHub and Azure DevOps parity)

## Description

GitHub and Azure DevOps are interchangeable SCM backends under [`scm-provider-contract.md`](.agents/skills/ws-shared/scm-provider-contract.md). Orchestrators call intents by name. Host recipes stay in each provider `INTENTS.md`. `node test/test-provider-parity.js` fails if a required intent is missing on one implementer, or if an extra intent exists on only one side without an allowlist row. The allowlist is empty.

`fetch-to-spec` today writes `{specsDir}` then `{us-dir}/step-00` and does **not** ingest visuals. GitHub `github-issue-to-spec.py` copies markdown image URLs as remote links. Azure `ado-workitem-to-spec.py` `clean_html` strips `<img>` tags. ADO `AttachedFile` relations from `$expand=all` are ignored. Downstream `ws-spec-write` / plan / implement never see screenshots that authors meant as examples or templates.

This spec **extends the `fetch-to-spec` behavioral guarantee** (same intent id, richer output). It does **not** add a tenth intent. Both `ws-spec-provider-github` and `ws-spec-provider-azure-devops` must ship the capability in the same change: SKILL.md intent table, `INTENTS.md` `## \`fetch-to-spec\`` procedure, converter/extract logic, and parity-test assertions. Callers (`ws-spec-to-pr` Step 0, `ws-spec-from-provider`, standalone provider invoke) keep passing `fetch-to-spec` only.

### Behavior (identical on both SCM implementers)

1. Extract image and attachment URLs from tracker content (host-specific sources; see AC2–AC3).
2. Download allowlisted URLs via a **shared** ingest helper into `{specsDir}/{specStem}.assets/`.
3. Rename files `{NN}-{kind}-{sanitized-stem}{ext}` and write `manifest.json`.
4. Emit `## Visual References` on the spec of record when at least one download is `ok`.
5. `ws-spec-write` Reads each `ok` image and folds visible UI/layout/template constraints into Description, ACs, and Notes.
6. `register_local_spec.cjs` copies the assets directory to `{us-dir}/attachments/`.

`ws-spec-provider-local` is **not** an SCM implementer. It does not fetch remote binaries. It only copies an already-ingested `{stem}.assets/` tree during register.

### Architecture touchpoints

| Layer | Path | Change class |
|-------|------|--------------|
| hub contract | `.agents/skills/ws-shared/scm-provider-contract.md` | Extend `fetch-to-spec` Output + Behavioral guarantee (no new intent row) |
| parity test | `test/test-provider-parity.js` | Assert both INTENTS `fetch-to-spec` sections document asset ingest; shared helper / manifest terms |
| skills-sot | `ws-spec-provider-github` + `ws-spec-provider-azure-devops` SKILL.md / INTENTS.md / converters | Host mapping for URL discovery; same output shape |
| hub scripts | `.agents/skills/ws-shared/scripts/` ingest helper (new) | Download, rename, allowlist, manifest |
| skills-sot | `ws-spec-provider-local` register | Copy `{stem}.assets/` → `{us-dir}/attachments/` |
| skills-sot | `ws-spec-write`, `ws-spec-format/FORMAT.md` | Visual References + vision Read obligation |
| skills-sot | `ws-plan-write`, `ws-plan-interview`, `ws-implement-tasks` | Read images before plan/edit when the heading exists |
| inventory | `FEATURES.md` § SCM provider parity | Document ingest as part of `fetch-to-spec` |

## Acceptance Criteria

- AC1: The change extends `fetch-to-spec` on both SCM implementers in the same ship. No new intent id is added. The provider-specific allowlist stays empty.
- AC2: GitHub `fetch-to-spec` extracts image and user-attachment URLs from the issue body and every comment (markdown images, HTML `img`, and `github.com/user-attachments/` file links).
- AC3: Azure DevOps `fetch-to-spec` extracts image and attachment URLs from Description HTML, Acceptance Criteria HTML, `AttachedFile` relations, and WIT comments.
- AC4: URL discovery may differ by host. Download, naming, manifest schema, Visual References shape, failure policy, and register copy are identical for GitHub and Azure DevOps.
- AC5: Both converters call one shared ingest helper under `{sharedDir}/scripts/` that writes `{specsDir}/{specStem}.assets/` where `{specStem}` is the spec filename without `.spec.md`.
- AC6: Each saved file is named `{NN}-{kind}-{sanitized-stem}{ext}` with `NN` starting at `01`. Kind is `screenshot`, `template`, `example`, `inline`, `comment`, or `attached`.
- AC7: Kind prefers alt-text or original-filename keywords (`screenshot`/`print`, `template`/`mock`/`wireframe`, `example`/`sample`). Else origin maps body→`inline`, comment→`comment`, relation→`attached`. Unlabeled images default to `screenshot`.
- AC8: Downloads reuse provider `validate-auth` credentials (GitHub token from `gh`/env, ADO PAT from the configured env var). Auth failure still STOPs the whole fetch with no silent GitHub↔Azure fallback.
- AC9: URLs outside the GitHub user-attachment/user-image host allowlist or the ADO `{apiBase}` WIT attachments API are skipped as `disallowed-host`.
- AC10: Per-file size above 10 MiB or run total above 50 MiB is skipped as `size-limit` without failing `fetch-to-spec`.
- AC11: HTTP 404, 403, or timeout on one URL records `failed` in the manifest and leaves `fetch-to-spec` exit 0 when the spec file was written.
- AC12: After at least one `ok` image, the spec of record contains `## Visual References` with repo-relative markdown images plus a table of path, kind, origin, and caption.
- AC13: Zero `ok` assets means no assets directory, no Visual References heading, and `fetch-to-spec` still succeeds.
- AC14: `register_local_spec.cjs` copies `{specsDir}/{specStem}.assets/` to `{us-dir}/attachments/` when the source assets directory exists.
- AC15: `ws-spec-write` Reads each `ok` image during reformulation and writes observed UI, layout, or template constraints into Description, ACs, or Notes.
- AC16: `ws-plan-write`, `ws-plan-interview`, and `ws-implement-tasks` SKILL.md require reading Visual References images before planning or editing product files when that heading exists.
- AC17: `FORMAT.md` documents optional `## Visual References`. Specs without that heading still pass `--mode=compat`.
- AC18: The `fetch-to-spec` row in `scm-provider-contract.md` states that inbound fetch downloads visual attachments when present and writes the shared assets sidecar plus Visual References.
- AC19: Both provider `INTENTS.md` `## \`fetch-to-spec\`` procedures include the ingest step with the same output paths. `node test/test-provider-parity.js` exits 0.
- AC20: The parity test asserts both INTENTS `fetch-to-spec` sections mention the assets sidecar (or `Visual References`) so a one-sided doc change fails CI.
- AC21: Disallowed MIME (`image/svg+xml`, HTML, executables) is skipped as `disallowed-type`. Allowed types are `image/png`, `image/jpeg`, `image/gif`, `image/webp`, and `application/pdf`.
- AC22: PDF files appear in Visual References as file links, not markdown images, and are not vision-analyzed.
- AC23: ADO `clean_html` converts `<img src alt>` to markdown images before tag strip so Original Issue Context keeps local rewritten paths after ingest.
- AC24: Offline `--input` still extracts URLs and attempts download when auth exists. Unreachable URLs are `skipped` or `failed` without aborting conversion.
- AC25: Fixture tests with a mock HTTP layer cover **both** converters and assert renamed files, manifest fields (`sha256`, `kind`, `origin`, `status`), rewritten spec links, and fetch success when one URL 404s.
- AC26: `ws-spec-from-provider` inherits ingest through `fetch-to-spec`. The bulk skill adds no second downloader.
- AC27: `ws-cleanup` must not delete `{specsDir}/{specStem}.assets/`. `{us-dir}/attachments/` remains a plan artifact eligible for plan-dir cleanup.
- AC28: `FEATURES.md` § SCM provider parity describes visual attachment ingest as part of `fetch-to-spec`, not as a separate intent.

## Original Issue Context

Standalone `/ws-spec-write` request: improve providers (ADO, GH) so that when fetching specs/US/issues, embedded images and related attachments are downloaded, renamed, analyzed, and become part of the spec. Screenshots are treated as examples or templates that fine-tune spec/plan/implementation. Follow-up: the SCM provider contract requires both GitHub and Azure DevOps implementations (parity).

### Prior Work Sweep

- Keyword + path sweep: `github-issue-to-spec.py`, `ado-workitem-to-spec.py`, `scm-provider-contract.md`, `test/test-provider-parity.js`. No attachment download, `AttachedFile` ingest, or `user-attachments` handling exists.
- `git log` on both provider trees: recent commits are skill-family rename / host-binding; none add visual ingest.
- `gh pr list` / `gh issue list` for attachment/screenshot/image+provider: no open same-topic PR or issue. Merged hits (PR 222, 37) are unrelated CLI/docs noise.
- MEMORY.md: provider traps cover resolve-thread filler and hybrid path resolution, not asset ingest.
- Design of `fetch-to-spec` (spec `0001-spec-provider-skills` + current converters) intentionally snapshots JSON and markdown/HTML text only. Omitting binaries is an accidental gap, not a documented constraint.

### Design Intent

Greenfield capability on top of existing converters. Skip `git log -L` on a missing symbol: there is no attachment ingest function to restore. Preserve contract rule "host mapping differs; behavior does not" and shared rule 6 (both implementers in one change, empty allowlist).

## Notes

- Manifest row (minimum): `localPath`, `kind`, `origin` (`body` | `comment` | `relation`), `status` (`ok` | `skipped` | `failed`), `skipReason`, `sha256`, `bytes`, `mime`, `sourceHost` (no query tokens or PATs).
- `--skip-assets` on converters is a test/offline escape hatch, not a consumer config key.
- Screenshots default to kind `screenshot` so agents treat them as implementation examples unless issue text says otherwise.
- Orch and `ws-spec-from-provider` must not grow a GitHub-only or ADO-only download recipe; they keep calling `fetch-to-spec`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New SCM intent (`fetch-assets`, `download-attachments`) | Would require a tenth required id or an allowlist row; ingest belongs on `fetch-to-spec` |
| GitHub-only or ADO-only attachment skill | Violates parity; `test-provider-parity.js` must fail a one-sided intent |
| `ws-spec-provider-local` remote download | Local is not an SCM implementer; it only registers and copies sidecars |
| Changing create-pr, threads, sweep, comment-issue, merge-pr | Orthogonal; contract row text for those intents stays unchanged |
| Uploading local files back to the tracker | Inbound fetch only |
| OCR / UI-tree extraction beyond vision Read | v1 is download + agent Read |
| SVG or HTML attachment ingest | Scriptable content; `disallowed-type` |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Contract change vs new intent | Extend `fetch-to-spec` guarantee; no new id | Shared rule 6 + empty allowlist; callers stay intent-name only | n |
| Canonical disk location | `{specsDir}/{specStem}.assets/` plus register copy to `{us-dir}/attachments/` | Spec of record must survive plan cleanup | n |
| Shared helper vs duplicated download | One `ws-shared` ingest helper; per-provider URL extract only | Behavior must not drift; host mapping stays in INTENTS | n |
| Always-on vs config flag | Always on during `fetch-to-spec`; `--skip-assets` for fixtures | User asked for fetch-time ingest, not a toggle | n |
| Implicit-requirement dimensions | N/A because concurrency, TTL, tenancy, and rate-limit product UX do not apply; input bounds, auth STOP, partial-failure, idempotent re-fetch, observability, and host allowlist are AC8–AC13, AC20, AC24–AC25 | Remaining dimensions are the ACs above | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Both SCM implementers + contract `fetch-to-spec` row + shared helper + register copy + FORMAT/write/plan SKILL notes | Touchpoints table vs git diff |
| Atomic Criteria | AC1–AC28 enumerable with pass/fail | `validate_spec.cjs --mode=authoring` |
| Failure Modes | Missing image, disallowed host/type, size cap, auth STOP, one-sided INTENTS edit | Negative scenarios + parity test |
| Observation Telemetry | Manifest statuses, converter stdout paths, `test-provider-parity.js` exit | Named commands below |
| Zero Open Blockers | Reuses `http_retry.py`, existing PAT/`gh` auth, register_local_spec copy hook. No new runtime dependency | File existence check |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Converter stdout includes the assets directory path when any file is `ok`, and a skip/fail count when any row is not `ok`.
- `{specStem}.assets/manifest.json` is valid JSON with per-file `status` / `sha256`.
- `node test/test-provider-parity.js` exits 0 and includes assertions that **both** `INTENTS.md` `fetch-to-spec` sections mention the assets sidecar or Visual References.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on a fixture spec that includes Visual References exits 0.
- `npm run test` stays green (install + parity + new converter fixture tests).

### Negative & Failing Test Scenarios

- **Scenario 1 (Parity split):** GitHub INTENTS documents asset ingest and Azure INTENTS does not (or the reverse). `test-provider-parity.js` fails (violates AC1, AC19, AC20).
- **Scenario 2 (New intent leak):** A `fetch-assets` (or similar) heading/table row exists on only one SCM without an allowlist row. Parity test fails (violates AC1).
- **Scenario 3 (Silent host switch):** ADO PAT missing causes the agent to run GitHub download instead of STOP. Violates AC8 and contract shared rule 3.
- **Scenario 4 (Stripped ADO images):** Description HTML contains `<img src="…/_apis/wit/attachments/…">` and `clean_html` drops the src so ingest finds nothing. Fixture test fails (violates AC3, AC23).
- **Scenario 5 (Remote leftover):** Spec of record still points at `user-images.githubusercontent.com` or an ADO attachment URL after a successful `ok` download. Fixture test fails (violates AC12).
- **Scenario 6 (Hard fail on one 404):** A single missing attachment exits the converter non-zero and skips spec write. Fixture test fails (violates AC11).
- **Scenario 7 (Disallowed host):** Markdown image points at an arbitrary `https://example.com/x.png` and the helper downloads it. Fixture test fails (violates AC9).
- **Scenario 8 (Plan-only assets):** Files exist only under `{us-dir}/attachments/` and `{specsDir}/{specStem}.assets/` is missing, so `ws-cleanup` of the plan dir loses templates. Violates AC5, AC27.
