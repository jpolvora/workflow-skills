---
step: 2
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
acRefs: []
title: Deterministic spec-index sync filing + close verification + harness check
startedAt: "2026-09-30T19:27:24Z"
endedAt: "2026-09-30T19:31:39.272Z"
---
# Refined implementation plan — us-474

Resolved from `step-01-us-474.plan.md` via `step-02-us-474.plan-interview.md` (registry G1–G8 closed, `blocking_open: 0`). Sections 0–7 of the step-01 plan stand as written; §8 is resolved below.

## 0. Summary & Business Rules

Make the spec-index `sync`/close path fail closed so an `index.PRD` row can never mark a spec done (`[x]`, Next-specs `[x]`, or Done-log) while the spec of record still lives under `pending/`. Three cooperating pieces:

1. `ws-spec-index/scripts/sync_index.cjs` — deterministic evidence-gated sync: updates index status, files spec + sidecars to `completed/` via `organize_specs.cjs`, refs rewritten in the organizer's same apply, or reports `outstanding`.
2. `ws-spec-index/scripts/verify_close_filing.cjs` — Step 8 close verification; fails closed naming the stale `pending/` path.
3. `ws-check-harness/scripts/check_spec_filing.cjs` — flags any index `[x]` ref under `pending/` (and Done-log entries for pending-located specs).

Business rules unchanged: no silent index/tree disagreement; quiet path untouched; Node-only helpers; `organize_specs.cjs` is the single filing authority.

## 1. Definition of Ready & Scope

As step-01 §1. AC1–AC7 in scope; bulk re-filing, folder-convention changes, provider behavior, and `init` output are out of scope.

## 2. Technical Design & Architecture

As step-01 §2, with resolved decisions:

1. **`sync_index.cjs`** — CLI `--specs-dir <dir> --slug <slug> [--delivery-commit <sha>] [--pr-url <url>] [--result <path>] [--repo-root <dir>] [--json]`.
   - E1 evidence gate (delivery commit or PR URL); missing → `{status:"skipped", reason:"no ship evidence"}`, no edits.
   - Locate spec across root/`pending`/`completed`/`archived` (existing wins).
   - Index mutation under `acquireFileLock`: `[ ]`→`[x]` bullet/status cell; Done-log row appended only when no row for the slug exists; `updated[]` recorded.
   - Filing when `plans.statusSubfolders === true`: spawn `node organize_specs.cjs --slug {slug} --status completed --apply --json` (`--repo-root` forwarded); parse renames → `moved[]`; failure → `{status:"outstanding", filingOutstanding:true, stalePendingPath, reason}` and exit 2; already filed → zero renames → quiet.
2. **`verify_close_filing.cjs`** — CLI `--specs-dir <dir> --slug <slug> [--index-file <path>] [--json]`. Index marks slug completed **and** spec resolves under `pending/` → exit 2 naming the stale path; agreement → exit 0.
3. **`check_spec_filing.cjs`** — CLI `--json --repo-root <dir>`. `{specsDir}` from `plans.specsDir` (default `.agents/specs`); scans `index.PRD`; exit 1 with `{ok:false, findings}` on any `[x]`→`pending/` ref or pending-located Done-log entry; missing index → `{ok:true}`.
4. **Wiring** — Step 8 `STEP-DISPATCH.md` item 6 runs `sync_index.cjs` and the close check runs `verify_close_filing.cjs`; docs in `ws-spec-index` SKILL.md/REFERENCE.md; `PHASES.md` Phase 5a gate list + `test-harness-clean.js` row.

## 3. Step-by-Step Plan

1. `sync_index.cjs` — evidence gate, index mutation, organizer delegation, outstanding report. → AC1, AC2, AC3, AC7
2. `verify_close_filing.cjs` — fail closed naming the stale `pending/` path; quiet on agreement. → AC4, AC5, AC7
3. `check_spec_filing.cjs` — harness gate. → AC6
4. Wire Step 8 close; outstanding blocks ship. → AC3, AC4, AC5
5. Docs + harness wiring. → AC6
6. `test/test-spec-index-filing.js` coverage; register in `test-suites.json`. → AC1–AC7, NS1–NS3
7. Harness / Node-only check; `test-harness-clean.js` 0 findings. → AC6, NS3
8. Integrity + one version bump at Step 8. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A (as step-01 §4). en-us output only.

## 5. Test Coverage

As step-01 §5 table: AC1 `testSyncFilesSpecAndSidecarsToCompleted`; AC2 `testSyncRewritesIndexSpecRefs`; AC3 `testSyncReportsOutstandingWhenFilingFails`; AC4 `testCloseVerifyFailsClosedOnPendingSpec`; AC5 `testCloseVerifyNamesStalePendingPath`; AC6 `testHarnessFlagsDoneRowWithPendingRef`; AC7 `testSyncQuietWhenAlreadyFiled`; NS1–NS3 as step-01.

## 6. Stack & Security Invariants Verification Plan

As step-01 §6. Sync helpers are synchronous (`spawnSync` + sync fs), reuse `acquireFileLock` for the `index.PRD` read-modify-write, validate `--slug` with the `track_index.cjs` `isSafeSlug` pattern, contain all paths under `{specsDir}`, and never build shell strings.

## 7. Pre-PR Checklist

As step-01 §7.

## 8. Resolved Decisions

1. **Close-verification home** → standalone `verify_close_filing.cjs` in `ws-spec-index` (registry G2, model-inferred). Rationale: names the stale path from the index/filing domain; keeps `ws-ship-pr` provider-scoped.
2. **Harness gate placement** → dedicated `check_spec_filing.cjs` at Phase 5a (G3). Rationale: distinct finding class, clearer correction text.
3. **Outstanding exit code** → non-zero (2) from `sync_index.cjs` (G4, blocking). Rationale: makes Step 8 fail closed instead of a partial sync.
4. **Filing authority** → delegate to `organize_specs.cjs` (G1, project). Ref rewrite is part of the organizer's `applyRenames` (AC2 atomic).
5. **Done-log idempotency** → skip append when a row for the slug exists (G5). Quiet path adds no churn (AC7).
