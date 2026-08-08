# Step 7 Testing Plan — post-workflow-worktree-tag-cleanup

**Source plan:** `.agents/plans/post-workflow-worktree-tag-cleanup/step-02-post-workflow-worktree-tag-cleanup.plan.refined.md`  
**Spec:** `.agents/plans/post-workflow-worktree-tag-cleanup/step-00-post-workflow-worktree-tag-cleanup.spec.md`  
**Config:** `verification.backendTest` = `npm run test` · `skipTesting=false` · `autoMode=true` (no browser)

## Scope and pass criteria

Feature adds mandatory Phase A post-workflow git cleanup (AC1–AC10): shared `cleanup_workflow_git.py`, protocol Phase A/B split, orch wiring (standard/lite/multi-spec), FAQ, and automated coverage. Pass requires:

1. Feature suite `node test/test-cleanup-workflow-git.js` exits 0 (AC2–AC10 cases + docs asserts)
2. Package suite `npm run test` (`verification.backendTest`) exits 0
3. `npm run verify-integrity` exits 0
4. No browser/UI surface (`autoMode` / skip-browser)

## Test matrix

| Area | Command | Expected evidence | AC |
|------|---------|-------------------|-----|
| Feature unit/integration | `node test/test-cleanup-workflow-git.js` | `failures=0`; CLEAN/WARN/dirty/dry-run/isolation cases | AC2–AC10 |
| Install + quality gates + memory | `npm run test` | Install dry-run green; quality-gates AC1–AC7; memory formatting | packaging / harness |
| Integrity digests | `npm run verify-integrity` | `OK: bin/skill-integrity.json matches tree` | ship-prep |
| Dogfood mirror (env) | `npm run sync-skills` if Phase 0b missing `.agents/skills/ws-*` | Sync gitignored dogfood from `src/skills` before install suite | ops |

## Non-applicable surfaces

- No API, DB, RBAC, tenancy, seeds, migrations, or locale runtime for this package-only change
- Browser / UI / E2E skipped (`autoMode: true`, no application UI)
- Accessibility / contrast for form errors: N/A

## Feature-quality AC checklist (observable)

| AC | Observable check | Where asserted |
|----|------------------|----------------|
| AC1 | Terminal completed runs Phase A before claim ended | docs: STEP-DISPATCH / PROTOCOLS / protocol |
| AC2 | Local tags `uswf/{id}/*` deleted; no push | `testCleanupDeletesLocalTagsOnly` |
| AC3 | Worktrees + namespace branches removed | `testCleanupRemovesWorktreesAndBranches` |
| AC4 | Leftovers → exit 2 + `WARN: leftover:` | `testCleanupWarnsOnLeftovers` |
| AC5 | dry-run logs only, no mutate | `testCleanupDryRunNoMutate` |
| AC6 | Namespace isolation; coincidental path untouched | `testCleanupNamespaceIsolation`, `testCleanupIgnoresCoincidentalWorkflowIdPath` |
| AC7 | Shared script + lite/multi-spec docs | `testDocsReferenceSharedCleanupContract` |
| AC8 | Keep-all still Phase A; Phase B optional | `testProtocolMandatoryVsOptionalSplit` |
| AC9 | Dirty WT force vs stop | `testCleanupDirtyWorktreeForce`, `testCleanupDirtyWorktreeStop` |
| AC10 | FAQ + protocol en-us portable wording | `testFaqDocumentsCleanupSplit` + doc asserts |

## Defect threshold

- Feature suite failure → Step 7 **failed**; apply fixes and revalidate
- Install suite Phase 0b missing `.agents/skills/ws-*` → restore via `npm run sync-skills` (gitignored dogfood), re-run (not a code defect)
- Other install / quality-gates / integrity failure → **failed** / fix loop
- Browser checks: skipped by AUTO gate
- Do **not** commit/push in this step
