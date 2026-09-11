---
slug: us-310
title: Accumulate repeated file-list flags in workflow_state.cjs parseArgs
status: completed
step: 2
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:15:30.000Z"
acRefs: []
---
Refined from `step-01-us-310.plan.md` via `step-02-us-310.plan-interview.md` (G1–G9 closed, `blocking_open: 0`). Unchanged sections are carried over verbatim; refinements marked **[R]**.

## 0. Summary & Business Rules

Fix `parseArgs()` in `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` so repeated file-list flags (`--created`, `--modified`, `--deleted`) accumulate every value instead of last-wins overwrite (`options[key] = argv[++index]`).

- Target rule: repeated file-list flags arrive at `normalizeFilesTouched()` as a multi-value option (array); `listArg` array + comma handling, `Set` dedup, backslash-to-slash conversion, and `toRepoRelative` resolution are reused unchanged.
- Accumulation scope is an allowlist of exactly `created`, `modified`, `deleted` (post camelCase normalization); every other repeated flag keeps last-wins (AC7).
- No telemetry/manifest/handoff schema change: `finish` telemetry `filesTouched`, `state.workflowManifest`, and persisted handoff already carry lists and union with `Set` + `sort()`; they retain every path automatically once parsing accumulates.
- Live bug evidence: `finish <state> --step 4 --modified one --modified two --modified three` keeps only `three` today (NS1 red-before).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec, all confirmed):
- Accumulation scope: only `created`, `modified`, `deleted` accumulate; all other repeated flags stay last-wins.
- Accumulation representation: array of raw values passed to the existing normalizer (no normalizer change, no pre-join string) **[R-G1: `listArg` `flatMap` + comma split compose mixed forms]**.
- Ordering: normalizer output order (dedup + existing transforms); manifest sorts independently.
- Auth, idempotency, concurrency, data lifecycle, external deps: N/A (synchronous argv parsing, no new callers/retries/TTL/network).

Measurable ACs: AC1–AC8 from `step-00-us-310.spec.md`.

Out of scope (per spec): scalar-flag semantics change, new file-list flags, telemetry/manifest/handoff schema changes, historical telemetry backfill, Python twins (frozen exec-delegates), docs site / README / FEATURES.

## 2. Technical Design & Architecture

Layers: `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test/`).

Edits:
1. `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
   - Add `FILE_LIST_FLAGS = new Set(['created', 'modified', 'deleted'])` near `SKIP_REASONS`/`SHIP_STATUSES` (style precedent, module top) **[R-G2: match post-normalization camelCase keys]**.
   - `parseArgs()` value branch: when `FILE_LIST_FLAGS.has(key)` and `options[key]` is already defined, accumulate into an array (first repeat converts `existing` → `[existing, value]`; later repeats push). When undefined, store the raw value as today (single-use shape unchanged) **[R-G3]**. Non-allowlisted keys keep `options[key] = argv[++index]` verbatim.
   - No change to `listArg`, `normalizeFileList`, `normalizeFilesTouched`, `applyCloseAndShipStatus`, handoff writers, idempotent-finish guards, or `updatePlansIndex` semantics.
   - Export the new constant for unit testing.
2. `test/test-repeated-file-list-flags.js` (new) — T1–T8 per §5; harness-test-utils temp-fixture pattern; T7 asserts both unit-level `parseArgs` repeats and one CLI-level scalar repeat **[R-G4]**.
3. `package.json` `tests:harness-efficiency` — append `node test/test-repeated-file-list-flags.js` (explicit file list; new files not auto-discovered).
4. Release alignment (same product commit): all edits → `npm run build-site:bump` (0.4.15 → 0.4.16) → `npm run generate-integrity && npm run verify-integrity` **[R-G6: CATALOG Before-ship rows 2,3,7]**. Regen only after all skill-tree edits final and no untracked files under `.agents/skills/`.

Invariants: `commitPlanFilesOnlyAtStep8: true`.

Design intent: `git log -S "options[key] = argv"` → only `561f86e9` (docs path-move) — accidental gap, safe to change. Fable `autoDetectDomain`: no domain signals — skipped.

## 3. Step-by-Step Plan (TDD order [R-G9])

1. Sibling sweep (defect-class): grep all `parseArgs` consumers and `options.created|modified|deleted` read sites repo-wide (expected: `normalizeFilesTouched` + telemetry/manifest/handoff writers in `workflow_state.cjs` only). Record evidence.
2. Write `test/test-repeated-file-list-flags.js` (T1–T8) + register in `package.json`; run pre-fix → expect T1–T3,T5 RED (only last value retained), T4/T6/T7 green.
3. Implement the `workflow_state.cjs` change (§2 item 1) — surgical, no adjacent refactors.
4. Run targeted suite → expect GREEN; then stack scan `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
5. Sabotage verification: `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "node test/test-repeated-file-list-flags.js" --paths .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs --invert-patch <generated>` **[R-G5]**; delete non-allowlisted `.runtime` residue before `validate_state`.
6. Full `npm run test` (remove the `npm pack` tarball after).
7. Version bump + integrity regen (§2 item 4) after all edits final; re-verify.

AC map: 1→AC7, 2→AC8-red, 3→AC1–AC7, 4→AC8/§6, 5→NS1–NS6, 6→AC8, 7→release gate.

## 4. Permissions, Tenancy & i18n

N/A — synchronous in-process argv accumulation; no network, auth, tenants, or locale content.

## 5. Test Coverage

| AC | Test case(s) | Method / assertion |
|----|--------------|--------------------|
| AC1 | T1/NS1 repeated `--modified` x3 | Temp fixture via `update_state.cjs`; assert all three normalized paths in telemetry `filesTouched.modified`, `state.workflowManifest.modified`, and handoff |
| AC2 | T2/NS2 repeated `--created` | Assert every path in created list across telemetry, manifest, handoff |
| AC3 | T3/NS3 repeated `--deleted` | Assert every path in deleted list across telemetry, manifest, handoff |
| AC4 | T4/NS4 comma-separated single flag | `--modified "a,b"` → both paths (backward-compat) |
| AC5 | T5 mixed repeated + comma | `--modified "a,b" --modified c` → all three paths |
| AC6 | T6/NS6 duplicates | `--modified a --modified a` → single normalized entry |
| AC7 | T7/NS5 scalar last-wins | `parseArgs` unit: `--step 1 --step 2` → `2`; `--modified a --modified b` → `['a','b']`; CLI-level scalar repeat unchanged **[R-G4]** |
| AC8 | T1–T8 in suite + full run | Wired into `tests:harness-efficiency` (T8 static assert); targeted exit 0; `npm run test` exit 0 |

## 6. Stack & Security Invariants Verification Plan

Pack: `{sharedDir}/runtime/stacks/typescript-node.md`:
- Boundary input validation: accumulated values still flow through `normalizeFileList`/`toRepoRelative`; allowlist is a closed `Set` of three keys.
- Async safety: fully synchronous; `atomicWrite` fd cleanup preserved.
- Path traversal: no path logic touched; normalization/containment unchanged.

Commands:
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`
- `node test/test-repeated-file-list-flags.js`
- `npm run test` (tarball removed after)
- `npm run verify-integrity` (after regen)

## 7. Pre-PR Checklist

- [x] Layer boundaries respected.
- [x] Sibling sweep done; no second file-list parse path left.
- [x] Stack & security invariants verified.
- [x] T1–T8 cover all ACs, wired into `npm run test`, red-before/green-after evidenced.
- [x] `npm run test` exit 0 on final tree; tarball removed.
- [x] Version bumped strictly above merge-base; integrity regenerated + verified.
- [x] `ws-check-harness` Phases 0–5c → 0 critical (or justified caveat).
- [x] G2-code stages only this workflow `files_touched` (never `{plansDir}`, never `preExistingDirty`/us-311 files).

## 8. Open Questions

None blocking. Q1 (array representation) resolved §1/G1; alternatives documented in interview.
