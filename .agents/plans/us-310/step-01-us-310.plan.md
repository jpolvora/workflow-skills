---
superseded: true
supersededBy: step-02-us-310.plan.refined.md
slug: us-310
title: Accumulate repeated file-list flags in workflow_state.cjs parseArgs
status: completed
step: 1
workflowId: us-310-20260911T041227Z
startedAt: "2026-09-11T04:12:27.000Z"
endedAt: "2026-09-11T04:14:00.000Z"
acRefs: []
---
## 0. Summary & Business Rules

Fix `parseArgs()` in `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` so repeated file-list flags (`--created`, `--modified`, `--deleted`) accumulate every value instead of last-wins overwrite (`options[key] = argv[++index]`).

- Target rule: repeated file-list flags arrive at `normalizeFilesTouched()` as a multi-value option (array); `listArg` array + comma handling, `Set` dedup, backslash-to-slash conversion, and `toRepoRelative` resolution are reused unchanged.
- Accumulation scope is an allowlist of exactly `created`, `modified`, `deleted` (post camelCase normalization); every other repeated flag keeps last-wins (AC7).
- No telemetry/manifest/handoff schema change: `finish` telemetry `filesTouched`, `state.workflowManifest`, and persisted handoff `handoff/step-NN.json` already carry lists and union with `Set` + `sort()`; they retain every path automatically once parsing accumulates.
- Live bug evidence: `finish <state> --step 4 --modified one --modified two --modified three` keeps only `three` today (NS1 red-before).

## 1. Definition of Ready & Scope

Resolved assumptions (from spec, all confirmed):
- Accumulation scope: only `created`, `modified`, `deleted` accumulate; all other repeated flags stay last-wins.
- Accumulation representation: array of raw values passed to the existing normalizer (no normalizer change, no pre-join string).
- Ordering: normalizer output order (dedup + existing transforms); manifest sorts independently.
- Auth, idempotency, concurrency, data lifecycle, external deps: N/A (synchronous argv parsing, no new callers/retries/TTL/network).

Measurable ACs: AC1–AC8 from `step-00-us-310.spec.md` (AC1 modified x3; AC2 created; AC3 deleted; AC4 comma-separated single flag; AC5 mixed repeated+comma; AC6 dedup; AC7 scalar last-wins; AC8 regression tests + `npm run test` exit 0).

Out of scope (per spec): scalar-flag semantics change, new file-list flags, telemetry/manifest/handoff schema changes, historical telemetry backfill. Also out of scope: Python twins (`update_state.py` is a frozen exec-delegate to the Node SoT — no changes needed); docs site / README / FEATURES (runtime bugfix, no feature/capability/CLI change).

## 2. Technical Design & Architecture

Config layers (`.agents/skills/ws-shared/config.json` → stack `node-skills-package`): `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test/`). This change touches `skills-sot` (1 runtime script) and `tests` (1 new test file), plus `installer-cli`-adjacent release files (`package.json` test list + version bump alignment).

Edits:
1. `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
   - Add `FILE_LIST_FLAGS = new Set(['created', 'modified', 'deleted'])` near `SKIP_REASONS`/`SHIP_STATUSES` (style precedent, module top).
   - `parseArgs()` value branch: when `FILE_LIST_FLAGS.has(key)` and `options[key]` is already defined, accumulate into an array (first repeat converts `existing` → `[existing, value]`; later repeats push). When undefined, store the raw value as today (single-use shape unchanged). Non-allowlisted keys keep `options[key] = argv[++index]` verbatim.
   - No change to `listArg`, `normalizeFileList`, `normalizeFilesTouched`, `applyCloseAndShipStatus`, handoff writers, idempotent-finish guards, or `updatePlansIndex` semantics.
   - Export the new constant for unit testing (module already exports `parseArgs`, `normalizeFilesTouched`, `parseFrontmatter`).
2. `test/test-repeated-file-list-flags.js` (new) — regression suite, harness-test-utils pattern (isolated temp repo-root fixtures, `update` script runs against the real `workflow_state.cjs`):
   - T1/NS1 (AC1): `finish --step 4 --modified one --modified two --modified three` in temp fixture → telemetry `filesTouched.modified`, `state.workflowManifest.modified`, and handoff payload all contain all three normalized paths.
   - T2/NS2 (AC2): repeated `--created` flags → every path in created list across telemetry, manifest, handoff.
   - T3/NS3 (AC3): repeated `--deleted` flags → every path in deleted list across telemetry, manifest, handoff.
   - T4/NS4 (AC4): single `--modified "a,b"` → both paths (backward-compat; green before and after).
   - T5 (AC5): `--modified "a,b" --modified c` → all three paths.
   - T6/NS6 (AC6): `--modified a --modified a` → single normalized entry.
   - T7/NS5 (AC7): unit-level `parseArgs(['--step','1','--step','2'])` → `2` (last-wins); `parseArgs(['--modified','a','--modified','b'])` → `['a','b']`; plus a CLI-level scalar repeat (`--reason`/`--status` shaped) proving no accumulation leak.
   - T8 (AC8 wiring): static assertion that `package.json` `tests:harness-efficiency` includes the new file.
3. `package.json` `tests:harness-efficiency` — append `node test/test-repeated-file-list-flags.js` so AC8 runs in `npm run test` (explicit file list; new files are not auto-discovered).
4. Release alignment (same product commit): `npm run build-site:bump` (0.4.15 → 0.4.16; aligns `packageVersion` + site footer), then `npm run generate-integrity && npm run verify-integrity` (managed runtime bytes changed). Regen only after all skill-tree edits are final and tree has no untracked files under `.agents/skills/`.

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` — plan/result artifacts commit only at Step 8 delivery; product G2-code commits after Step 5 / Step 6-fix only.

Design intent (ws-plan-write §1): `git log -S "options[key] = argv"` on `workflow_state.cjs` returns only `561f86e9` (docs path-move, no behavioral intent — per spec prior-work sweep) — the last-wins default is generic, not deliberate for file-list flags; `listArg` `flatMap` shows multi-value input was anticipated downstream. Fable `autoDetectDomain`: no IaC/K8s/Docker/DB-migration/Data-script signals in this repo change — domain adapters skipped, no STOP.

## 3. Step-by-Step Plan

1. Sibling sweep (defect-class): grep all `parseArgs` consumers and all `options.created|modified|deleted` read sites repo-wide (expected: `normalizeFilesTouched` + telemetry/manifest/handoff writers in `workflow_state.cjs` only; Python twin delegates). Record sweep evidence.
2. Implement the `workflow_state.cjs` change (§2 item 1) — surgical, no adjacent refactors.
3. Write `test/test-repeated-file-list-flags.js` (T1–T8) and register it in `package.json` `tests:harness-efficiency`.
4. Run targeted suite: `node test/test-repeated-file-list-flags.js`; then stack scan `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
5. Sabotage verification (mutation unset: `verification.mutationTest` empty + `skipMutationTesting: true`): run `python .agents/skills/ws-testing/scripts/run_sabotage.py` per ws-testing Step 7 policy, or document why the negative-case matrix (NS1–NS6 red-before/green-after) already covers it; delete any non-allowlisted `.runtime` leftovers before `validate_state`.
6. Full `npm run test` (includes `pretests: npm pack` — remove the generated tarball after the run so the tree stays clean).
7. Version bump + integrity regen (§2 item 4) after all edits final; re-verify.

Each step maps to ACs: 1→AC7 (consumer scope), 2→AC1–AC7, 3→AC8, 4→AC8/§6, 5→NS1–NS6, 6→AC8, 7→release gate.

## 4. Permissions, Tenancy & i18n

N/A — synchronous in-process argv accumulation in a local CLI parser; no network, auth, tenants, user-facing strings, or locale content. No new inputs, retries, callers, TTL, or external deps (spec assumptions table).

## 5. Test Coverage

| AC | Test case(s) | Method / assertion |
|----|--------------|--------------------|
| AC1 | T1/NS1 repeated `--modified` x3 | `test-repeated-file-list-flags.js`: `finish --step 4` via `update_state.cjs` in temp fixture; assert all three normalized paths in telemetry `filesTouched.modified`, `state.workflowManifest.modified`, and handoff |
| AC2 | T2/NS2 repeated `--created` | Same harness; assert every path in created list across telemetry, manifest, handoff |
| AC3 | T3/NS3 repeated `--deleted` | Same harness; assert every path in deleted list across telemetry, manifest, handoff |
| AC4 | T4/NS4 comma-separated single flag | `--modified "a,b"` → both paths (backward-compat guard) |
| AC5 | T5 mixed repeated + comma | `--modified "a,b" --modified c` → all three paths |
| AC6 | T6/NS6 duplicates | `--modified a --modified a` → single normalized entry |
| AC7 | T7/NS5 scalar last-wins | `parseArgs` unit: `--step 1 --step 2` → `2`; `--modified a --modified b` → `['a','b']`; CLI-level scalar repeat unchanged |
| AC8 | T1–T8 in suite + full run | New file listed in `tests:harness-efficiency` (T8 static assert); `node test/test-repeated-file-list-flags.js` exit 0; `npm run test` exit 0 |

Red-before/green-after: T1–T3, T5 fail on pre-fix code (only last value retained); verified by running the new suite against `git stash` of the fix if needed.

## 6. Stack & Security Invariants Verification Plan

Rule pack: `{sharedDir}/runtime/stacks/typescript-node.md`. Touched framework boundaries:
- Boundary input validation (Warning): accumulated values still flow through `normalizeFileList`/`toRepoRelative` (no raw flag values into paths); allowlist is a closed `Set` of three keys.
- Async safety (Critical): change is fully synchronous; no new promises, no `atomicWrite` fd-cleanup change.
- Path traversal (Critical): no path logic touched; normalization/containment via existing `toRepoRelative` allowOutside path.
- Type safety: plain Node CJS, no TS annotations added.

Verification commands:
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` (exit 0)
- `node test/test-repeated-file-list-flags.js` (exit 0)
- `npm run test` (exit 0; remove `npm pack` tarball after)
- `npm run verify-integrity` (exit 0 after regen)

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot runtime + tests only, plus release alignment files).
- [ ] Sibling sweep done; no second file-list parse path left behind.
- [ ] Stack & security invariants verified (closed allowlist, sync-only, normalization unchanged).
- [ ] Test cases cover all ACs (T1–T8) and are wired into `npm run test`.
- [ ] `npm run test` exit 0 on final tree; tarball removed.
- [ ] Version bumped strictly above merge-base; integrity regenerated + verified.
- [ ] G2-code stages only this workflow `files_touched` (never `{plansDir}`, never `preExistingDirty`, never the concurrent us-311/spec files).

## 8. Open Questions

- Q1 (resolved in §1): accumulation representation — chosen array of raw values (reuses `listArg` array handling with zero normalizer changes). Alternative pre-joined comma string rejected (weaker typing, same outcome).
- Q2: none blocking. No absent-dimension ACs (spec assumptions table confirms N/A for validation/idempotency/auth/concurrency/lifecycle/external-deps).
