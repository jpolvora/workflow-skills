# Post-PR Review Plan — muse-spark-1.3 (Gemini Flash 3.8 deep review vs HEAD e7a4965c)

Date: 2026-09-13
Source: Gemini Flash 3.8 deep code review of `develop` diff `main` (reviewed at 1769ff75), re-verified file-by-file at current HEAD `e7a4965c`.
Decisions: history hygiene via forward cleanup commit (no rewrite); Defect 4 fixed now with per-process cache.

## 1. What changed since the review

Review analyzed `1769ff75` as develop HEAD. Current HEAD is `e7a4965c`:

```
* e7a4965c (HEAD -> develop, origin/develop) refactor(ws-benchmarks)
* c4ed9bb1 fix(ws-classify-complexity): runInterview reason logic
* 1769ff75 fix(us-328): autoload keyword-map prose  <- reviewed commit
| * 796411bb (origin/main) Merge PR #329
|/
* e28d7f7e, c355d0bb, afa5eeab, 43190245 (us-328 delivery)
* 2954f7ac (main, behind origin/main by 1 merge)
```

- `c4ed9bb1` only touches `classify.cjs` reason strings + test. Does not fix defects 1–5.
- `e7a4965c` only touches `ws-benchmarks`. Does not fix defects 1–5.
- Diff `origin/main...HEAD` is now 56 files (+3732/-186), not 50. Review topology §1.1 is stale but directionally right.
- Commit message trap (§1.2) confirmed: `1769ff75` says "autoload prose" but contains speed/determinism core + `.agents/plans/us-328/` (15 files) + `.cursor/plans/` (4 files) + tests/memory.

## 2. Defect verdicts (all 5 still open, verified by read)

| # | Verdict | Evidence at HEAD |
|---|---------|------------------|
| 1 Double-JSON `--soft-exit` (🔴) | STILL OPEN — execute | `.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py:470-487` still prints full payload then second `print(json.dumps({"force_interview": True}))`. `--soft-exit` flag at `:435`, recommended in `.cursor/plans/s_agy_speed_det_gemini-flash-38.md:153,181`. |
| 2 Hardcoded skills root + state desync (🔴) | STILL OPEN — execute | `.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs:88-89` still `path.join(repoRoot, '.agents','skills','ws-spec-to-pr','scripts','ac_ledger.cjs')` — breaks global/hybrid installs. `:82` writes only `.state.json`, never `.state.md`. |
| 3 Untracked files missed (🟡) | STILL OPEN — execute | `.agents/skills/ws-testing/scripts/probe_test_surface.cjs:39` still `['ls-files','-z']` without `--cached --others --exclude-standard`. New unstaged test file → false `hasTestSurface:false` → Step 7 wrong skip. |
| 4 Triple git spawn per call (🟡) | STILL OPEN — execute (agreed) | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:574-601` `gitTrackedSet()` spawns `ls-files`, `diff --name-only`, `status --porcelain` on every `normalizeFilesTouched` (via `intersectWithGit:604-631`). No cache. |
| 5 Step 8 menu contradiction (🟡) | STILL OPEN — execute | `gates.md:195` says "one combined menu; two phases, one prompt" but `:197-199` lists 3 close options and `:213-217` lists 5 ship options separately. `STEP-DISPATCH.md:55` lists unified 5 (`close+PR, close+push, close+skip ship, skip delivery commit+PR, more/pause`). |

## 3. Discard pile (already solved — do not re-execute)

- Green quality items (§3): all landed. `ac_ledger.cjs` scoreState self-heal + `crypto.randomBytes` tmp, `classify.cjs` spec-touched layers + `complexityClass`, `build_dispatch_context.cjs` `\z`→`$` + preamble inlining. Verified in `git diff origin/main...HEAD`.
- §2.1 process waste: solved by `write_simple_plan_stub.cjs` + `write_verification_manifest.cjs` + `finish-batch` + `test/test-workflow-process-waste.js`. Keep test as guard only.
- §2.4 sibling-rows trap: solved in `e28d7f7e` + memory `2026-09-13-us-328-sibling-rows.md`. No action.
- §2.2 hand-written `step-00-us-328.classify.md`: historically true (9 lines, no frontmatter/threshold table). Not a code bug now; future runs use `classify.cjs`. No fix.
- §2.3 G2 staging gap: remedy `commit_g2_code.cjs` exists but is itself Defect 2. Track under Defect 2.

## 4. Execution plan

### Phase 0 — baseline (read-only)
1. `node test/test-workflow-process-waste.js`, `node test/test-classifier-history.js`
2. `python -m py_compile .agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py`
3. `node --check` on `commit_g2_code.cjs`, `probe_test_surface.cjs`, `workflow_state.cjs`
4. Record green baseline before touching code.

### Phase 1 — reds
1. `check_memory_conflict.py:470-487` — fold `force_interview` into the single `--json` payload (OR trap hits with `soft_exit and has_traps`), delete second `print`. Exit codes unchanged (`soft_exit`→0, else 2). Add/extend soft-exit test asserting `stdout` parses as one JSON object with `force_interview:true` and exit 0.
2. `commit_g2_code.cjs:88-89` — `const acLedgerScript = path.join(__dirname, 'ac_ledger.cjs')` instead of `repoRoot/.agents/skills/...`. Covers project-local, global, hybrid.
3. `commit_g2_code.cjs:82` — dual-write markdown the same way `workflow_state.cjs` does (canonical JSON + frontmatter render + atomic write of both paths), or extract shared `syncMarkdown(state)` helper and call it. Assert `state.json` revision == frontmatter revision in test.
4. `probe_test_surface.cjs:39` — `['ls-files','-z','--cached','--others','--exclude-standard']`. Keep filesystem-walk fallback for non-git roots. Test: temp untracked `test/__probe-untracked.test.js` must appear in `matches`, then delete.

### Phase 2 — yellows
5. `gates.md:193-221` docs only — keep `one combined menu; two phases, one prompt`, replace Phase A (3 opts) + Phase B (5 opts) with unified 5-option menu from `STEP-DISPATCH.md:55`. Cross-link both files. No behavior change.
6. `workflow_state.cjs:574-602` — memoize `gitTrackedSet(repoRoot)` keyed by `repoRoot` (+ `HEAD` sha for invalidation). `finish-batch` pays 3 spawns once, not N times. Keep `null` fallthrough semantics. Provide `clearCache()` for tests.

### Phase 3 — history hygiene (forward commit, no amend)
1. Disposition `.agents/plans/us-328/` (15 tracked files) — archive per `ws-spec-archive` or `git rm` if delivery closed in `c355d0bb`.
2. Disposition `.cursor/plans/s_agy_*`, `stp_*`, `orch_speed_*` (4 files) — authoring plans, normally not release payload. `git rm --cached` or move out of release scope.
3. One commit `chore(release): remove us-328 run artifacts and arch plans from release scope` + `npm run generate-integrity && npm run verify-integrity` in same commit.
4. Use conventional message for new speed/determinism work; do not rewrite `1769ff75` retroactively.

### Phase 4 — ship verification
1. Targeted tests: process-waste, classifier-history, doc-sync, new soft-exit + probe-untracked checks.
2. `npm run generate-integrity && npm run verify-integrity` (mandatory when skill content changed).
3. `ws-check-harness` before PR.
4. `git diff origin/main...HEAD --stat` must show only product + test + integrity deltas, no `.agents/plans/us-328/` or `.cursor/plans/` leakage.

## 5. Risks / notes

- Defect 1 is latent today (`STEP-DISPATCH.md` Step 1/4 call `--json` without `--soft-exit`); blocking once `s_agy` soft-exit wiring lands. Fix now while small.
- Defect 2b must reuse canonical markdown serializer — do not hand-render frontmatter.
- Defect 4 cache must not survive across commits in long-lived processes; key on `HEAD` or explicit clear.
