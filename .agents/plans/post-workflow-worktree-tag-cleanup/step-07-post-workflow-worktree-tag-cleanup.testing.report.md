# Step 7 Testing Report — post-workflow-worktree-tag-cleanup

**Generated on:** 2026-08-01  
**Status:** Passed (0 failures after env restore)  
**Mode:** AUTO · skip-browser · `verification.backendTest` = `npm run test`

## Summary

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Feature suite | `node test/test-cleanup-workflow-git.js` | **0** | Pass — `failures=0` (11 cases) |
| Integrity | `npm run verify-integrity` | **0** | Pass — digests match v0.0.114 |
| Install suite (1st) | `npm run test` | **1** | Fail — Phase 0b missing `.agents/skills/ws-spec-to-pr/ARTIFACTS.md` (stale dogfood) |
| Env restore | `npm run sync-skills` | **0** | Synced 39 skill entries `src/skills` → `.agents/skills` |
| Install suite (2nd) | `npm run test` | **0** | Pass — install + quality-gates + memory formatting |
| Integrity (recheck) | `npm run verify-integrity` | **0** | Pass |

**Step 7 status: success** (AUTO failure path: sync dogfood mirror → revalidate; no product-code edits).

## 1. Feature suite (`test-cleanup-workflow-git.js`)

```
Running cleanup_workflow_git tests...
✅ script exists: .../src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py
--- testCleanupDeletesLocalTagsOnly --- … CLEAN … unrelated tags untouched … no push language
--- testCleanupRemovesWorktreesAndBranches --- … worktree removed … namespace branches deleted
--- testCleanupWarnsOnLeftovers --- … exit 2 … WARN leftover printed
--- testCleanupDryRunNoMutate --- … tag/branch intact after dry-run
--- testCleanupNamespaceIsolation --- … other-id tag kept … user branch kept
--- testCleanupIgnoresCoincidentalWorkflowIdPath --- … coincidental path worktree left untouched
--- testCleanupDirtyWorktreeForce --- … logged dirty paths … force-removed
--- testCleanupDirtyWorktreeStop --- … exit 1 … worktree still registered
--- testDocsReferenceSharedCleanupContract --- … protocol/FAQ/lite/multi-spec/STEP-DISPATCH/ARTIFACTS
--- testProtocolMandatoryVsOptionalSplit --- … Phase A mandatory / Phase B optional
--- testFaqDocumentsCleanupSplit --- … WARN leftovers / dirty-policy / failed-cancelled
Done. failures=0
EXIT:0
```

## 2. Integrity

```
> workflow-skills@0.0.114 verify-integrity
> node bin/generate-skill-integrity.js --check
OK: bin\skill-integrity.json matches tree (v0.0.114)
EXIT:0
```

## 3. Package suite (`npm run test`) — first attempt

`pretests` (`npm pack`) succeeded. `test-install.js --local` failed at Phase 0b:

```
[Phase 0b] Canonicity + dry-run contract files...
❌ Missing required file: .agents/skills/ws-spec-to-pr/ARTIFACTS.md
EXIT:1
```

Root cause: `.agents/skills/ws-*/` is gitignored; local dogfood only had `ws-shared/` + `ws-spec-list/`. Phase 0b still requires packaged dogfood files under `.agents/skills/`. Not a feature regression.

## 4. AUTO fix + revalidate

```
> npm run sync-skills
Synced 39 skill entries from src/skills -> .agents/skills
ARTIFACTS_OK
```

Second `npm run test` → **EXIT:0**:

- Install suite: Phases 0–11 green (self-overwrite, canonicity, install/update/uninstall, integrity, global scope)
- Quality gates: All AC1–AC7 passed (`All quality-gates tests passed.`)
- Memory formatting: `PASSED successfully!`

## 5. Non-applicable

- DB seeds / API contracts / RBAC / UI browser: N/A (package skills + CLI; `autoMode: true`)
- Accessibility / contrast on form errors: N/A

## Notes / ship recommendations

- `test/test-cleanup-workflow-git.js` is **not** chained from `package.json` `tests` yet (run explicitly). Optional Step 8 wire-up: append `&& node test/test-cleanup-workflow-git.js` — not required for Step 7 pass.
- Before `npm run test` on a fresh clone: run `npm run sync-skills` so Phase 0b dogfood paths exist.

## Defect threshold outcome

| Condition | Outcome |
|-----------|---------|
| Feature suite | Pass |
| Integrity | Pass |
| Install Phase 0b dogfood missing | Fixed via sync-skills; revalidated Pass |
| Quality-gates / other failures | None |

## Next step

Advance to Step 8 (`ws-ship-pr`): prepare board, delivery commit, push/PR. No integrity regenerate needed (already OK).
