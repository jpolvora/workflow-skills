---
step: 1
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
acRefs: []
title: Deterministic spec-index sync filing + close verification + harness check
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T19:30:32.864Z"
---
## 0. Summary & Business Rules

Make the spec-index `sync`/close path fail closed so an `index.PRD` row can never mark a spec done (`[x]`, Next-specs `[x]`, or Done-log) while the spec of record still lives under `pending/`. Deliverable = three cooperating pieces:

1. A deterministic `ws-spec-index` sync helper that, on E1 ship evidence, (a) files the spec + sidecars to `completed/` via the existing organizer, (b) rewrites the index `spec:` refs in the same operation, and (c) reports the filing as **outstanding** (never silent success) when it cannot file.
2. A Step 8 close-verification helper that fails closed and names the stale `pending/` path when the index marks a tracked spec done but the file still resolves under `pending/`.
3. A `ws-check-harness` gate that flags any index `[x]` row whose `spec:` ref points under `pending/`, plus Done-log entries for a pending-located spec.

Business rules:
- Index status (`[x]` / Done-log) and on-disk location must not disagree silently.
- Quiet path (index and file already agree) is untouched: no re-file churn, no new gate.
- Node-only helpers (`.cjs`, launched with `node`); never hand-edit `index.PRD` rows.
- `organize_specs.cjs --slug {slug} --status completed --apply` is the single filing authority (already moves spec + `.context.md` + `.assets/` and rewrites refs).

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** filing delegates to `ws-spec-organizer`; harness check lives on the existing spec-index/harness surface; sidecars move with the spec; input-validation/auth/concurrency/data-lifecycle/idempotency are N/A (local file/ref move).

**Measurable ACs:** AC1–AC7 from `step-00-us-474.spec.md`.

**In scope:**
- New `sync_index.cjs` (deterministic sync byte-for-byte, evidence-gated, outstanding reporting).
- New `verify_close_filing.cjs` (Step 8 close verification, fail closed naming stale path).
- New `check_spec_filing.cjs` harness gate + PHASES.md wiring + `test-harness-clean.js` gate row.
- Step 8 prose wiring in `ws-spec-to-pr` (`STEP-DISPATCH.md`) to run both helpers.
- `ws-spec-index` SKILL.md/REFERENCE.md doc updates.
- `test/test-spec-index-filing.js` fixture coverage for all ACs.
- Integrity regenerate + one version bump at Step 8.

**Out of scope (spec table):** bulk historical re-filing; changing the `pending/`/`completed/` convention; provider/tracker behavior; changing `ws-spec-index init` output.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-spec-index/scripts`, `.agents/skills/ws-spec-index/*.md`, `.agents/skills/ws-check-harness/scripts`, `.agents/skills/ws-check-harness/PHASES.md`, `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | helpers + wiring |
| tests | `test/` | `test-spec-index-filing.js`, `test-harness-clean.js` |
| installer-cli | `bin`, site | integrity + version bump (Step 8 only) |

**Runtime design:**

1. **`ws-spec-index/scripts/sync_index.cjs`** — CLI `--specs-dir <dir> --slug <slug> [--delivery-commit <sha>] [--pr-url <url>] [--result <path>] [--repo-root <dir>] [--json]`.
   - Evidence (E1): a delivery commit or PR URL from flags or the `step-08-*.result.md` payload; missing → `{status:"skipped", reason:"no ship evidence"}` (no edits).
   - Locate spec of record across root/`pending`/`completed`/`archived` (existing wins; reuse search pattern from `track_index.cjs` `findSpecFile`).
   - Update index: matching front-matter/next-specs status cell `[ ]`→`[x]`; append Done-log row when a Done-log table exists and no row for the slug exists; record `updated[]`. Never invent an index.
   - Filing: when `plans.statusSubfolders === true`, spawn `node organize_specs.cjs --slug {slug} --status completed --apply --json` (`--repo-root` forwarded). Parse renames → `moved[]`. On non-zero/exception → return `{status:"outstanding", filingOutstanding:true, stalePendingPath, reason}` and non-zero exit, **without claiming success**. Already under `completed/` → zero renames → quiet (AC7).
   - Idempotent: re-run yields no duplicate Done-log row / no re-file.
2. **`ws-spec-index/scripts/verify_close_filing.cjs`** — CLI `--specs-dir <dir> --slug <slug> [--index-file <path>] [--json]`. Reads `index.PRD`, determines whether the slug is marked completed, resolves the spec location; if index-done but spec under `pending/` → exit 2 and JSON/stdout naming the stale `pending/` path (AC4/AC5). Agree → exit 0 (AC7).
3. **`ws-check-harness/scripts/check_spec_filing.cjs`** — CLI `--json --repo-root <dir>`. Resolves `{specsDir}` (config `plans.specsDir`, default `.agents/specs`); scans `index.PRD` for `[x]` feature-map bullets / Next-specs rows whose `spec:` ref contains `pending/`, and Done-log rows whose referenced spec resolves under `pending/`; exit 1 with `{ok:false, findings:[...]}` when any (AC6). Missing index → `{ok:true}`.
4. **Wiring** — `ws-spec-to-pr/STEP-DISPATCH.md` Step 8: item 6 runs `sync_index.cjs` (implementation evidence); add close verification via `verify_close_filing.cjs` before advance; `ws-spec-index/SKILL.md`/`REFERENCE.md` document both helpers; `ws-check-harness/PHASES.md` Phase 5a lists the new gate; `test/test-harness-clean.js` adds the gate row.

**Not touched:** organizer/`resolve_spec_path` behavior, index schema, `track` output, tracker providers, consumer `.ws/config.json` schema.

## 3. Step-by-Step Plan

1. **`sync_index.cjs`** — evidence gate + index mutation (checkbox/Done-log) + organizer delegation + outstanding report; Node CommonJS only; safe index read-modify-write; never `git add`. → AC1, AC2, AC3, AC7
2. **`verify_close_filing.cjs`** — index-done vs on-disk `pending/` detection; fail closed naming the stale path; quiet on agreement. → AC4, AC5, AC7
3. **`check_spec_filing.cjs`** — harness gate for index `[x]`→`pending/` refs + Done-log entries; `--json` contract `{ok, findings}`. → AC6
4. **Wire Step 8 close** — `STEP-DISPATCH.md` item 6 runs `sync_index.cjs`; add `verify_close_filing.cjs` as the fail-closed close check; note the outstanding result blocks ship. → AC3, AC4, AC5
5. **Docs** — `ws-spec-index` SKILL.md `sync` section + REFERENCE.md call contract; `ws-check-harness/PHASES.md` Phase 5a bullet and gate list; `test-harness-clean.js` gate row. → AC6
6. **Tests** — `test/test-spec-index-filing.js` fixture coverage (below); register in `test-suites.json` if the runner enumerates. → AC1–AC7, NS1–NS3
7. **Harness / Node-only check** — `check_spec_filing.cjs` green on the repo; no `.py`; `test-harness-clean.js` 0 findings. → AC6, NS3
8. **Integrity + version bump (Step 8 ship hygiene)** — `npm run build-site:bump` once, `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — local filesystem/ref operations, no RBAC, tenancy, authZ attributes, or user-facing i18n. Output is en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testSyncFilesSpecAndSidecarsToCompleted` — fixture repo with `plans.statusSubfolders:true`, spec + `.context.md` + `.assets/` under `pending/`; sync with delivery commit → files moved to `completed/` | `sync_index.cjs`, `organize_specs.cjs` |
| AC2 | `testSyncRewritesIndexSpecRefs` — asserts `spec: completed/...` in `index.PRD` and checkbox `[x]` in same run | `sync_index.cjs` |
| AC3 | `testSyncReportsOutstandingWhenFilingFails` — dirty-overlap/collision fixture forces organizer failure → `status:"outstanding"`, `filingOutstanding:true`, non-zero exit, stale path named | `sync_index.cjs` |
| AC4 | `testCloseVerifyFailsClosedOnPendingSpec` — index `[x]`, spec under `pending/` → exit 2 | `verify_close_filing.cjs` |
| AC5 | `testCloseVerifyNamesStalePendingPath` — stderr/stdout JSON contains the `pending/` path | `verify_close_filing.cjs` |
| AC6 | `testHarnessFlagsDoneRowWithPendingRef` — index `[x]` `spec: pending/...` → `check_spec_filing.cjs` exit 1 finding; clean board → exit 0 | `check_spec_filing.cjs` |
| AC7 | `testSyncQuietWhenAlreadyFiled` — spec already under `completed/` → zero renames, no duplicate Done-log row, exit 0 | `sync_index.cjs` |
| NS1 | `testCloseVerify...` same fixture as AC4 (pending-located done spec) | `verify_close_filing.cjs` |
| NS2 | `testHarnessFlags...` same fixture as AC6 (pending `spec:` ref) | `check_spec_filing.cjs` |
| NS3 | harness Node-only + no `.py` in new script folders; `rg` no IDE product names | skill package |

## 6. Stack & Security Invariants Verification Plan

Stack id `node-skills-package`; rule pack `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`. Touched boundaries:

- **Authorization & endpoint protection:** N/A — no HTTP/routes.
- **Concurrency & async safety:** helpers stay synchronous (spawnSync + sync fs). Reuse the existing `acquireFileLock` for `index.PRD` read-modify-write in `sync_index.cjs`; no floating promises.
- **Input validation & DTO boundary:** treat `--slug` as untrusted — validate with the `isSafeSlug` pattern (reject traversal/separators); resolve all paths under `{specsDir}`; never `eval`; never hand-build shell strings (spawnSync arg arrays only).
- **Subscription & lifecycle cleanup:** N/A — no listeners/streams beyond process lifetime.
- **Harness-specific:** Node-only `.cjs`; no IDE product names; new scripts under existing registered skills need no dependency-edge change; integrity regenerated after hashed edits.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`skills-sot` + `test/`).
- [ ] Schema migrations — N/A.
- [ ] Authorization — N/A.
- [ ] Stack & security invariants verified (slug validation, path containment, file-lock RMW, Node-only).
- [ ] i18n — N/A.
- [ ] Test cases cover all ACs (§5 table).
- [ ] `check_spec_filing.cjs` wired into PHASES.md Phase 5a + `test-harness-clean.js`, and green on the repo.
- [ ] Integrity regenerated; version bumped once at Step 8.

## 8. Open Questions

1. **Close-verification home:** recommended a standalone `verify_close_filing.cjs` in `ws-spec-index` invoked by Step 8 prose; alternative is to embed the check in `ws-ship-pr/scripts/verify.cjs`. Recommend standalone (spec says "close verification" names the stale path; keeps ship-pr provider-scoped).
2. **Harness gate placement:** recommended a dedicated `check_spec_filing.cjs` at Phase 5a; alternative is folding into `check_harness_links.cjs`. Recommend dedicated for a clear finding class.
3. **Outstanding exit code:** recommend non-zero (2) from `sync_index.cjs` when filing is outstanding so Step 8 fails closed; confirm no consumer relies on zero-exit with a partial sync.
