# us-488 — Delivery Result

## Expected

Per `step-00-us-488.spec.md` (source: github issue #488), the installer `gemini` secondary target must:

- AC1: project each `ws-*` skill as a physical directory copy on Windows.
- AC2: replace a pre-existing junction/symlink with a physical copy.
- AC3: write `include_only: ["^ws-.*"]` in every `skills.json` upsert path.
- AC4: keep physical `ws-*` copies during install, update, and uninstall of other skills.
- AC5: remove only owned `ws-*` dirs + the declarative entry on full uninstall; preserve third-party skills.
- AC6: remain idempotent (one entry per resolved path, no duplicate/dangling dirs).
- AC7: isolate the `gemini` `skills.json` path in tests (never touch the real user config).

## Done

- `bin/install-rules.js`: added `shouldProjectGeminiAsCopy(platform=process.platform)`; `cleanupLegacyGeminiSkills(homeDir,{includePhysical=false})` now sweeps only `ws-*` reparse points by default and removes physical `ws-*` dirs only on full uninstall; `upsertGeminiSkillsJsonEntry`/`removeGeminiSkillsJsonEntry` use `OWNED_GEMINI_PATTERNS=['^ws-.*','ws-*']`.
- `bin/cli.js`: gemini branch upserts `['^ws-.*']`; on Windows projects `skillNames` (incl. `ws-shared`) as physical copies via `projectSkillToTarget(symlink:false)` then links-only sweep; uninstall threads `{geminiKeepEntry, geminiIncludePhysical}` and the bespoke partial-sweep loop was removed.
- `test/test-install.js`: centralized `mockHomeSpawnEnv`, real-home content+mtime isolation guard (V7), migrated assertions to `^ws-.*`, converted the stale physical-delete fixture to a dangling reparse point, added V1–V12 gemini checks.
- `bin/skill-integrity.json`: regenerated (`bin/` hashed content changed).
- Verify: **score 10/10** (`step-05-us-488.plan.report.md`, ledger boundary `step5`), all AC1–AC7 Implemented, NS1–NS6 covered.
- Review: clean after 1 fix round (`step-06-us-488.review.md`); CR-001/002/003 resolved.
- Fresh-verify: 0 defects, 7/7 ACs with red-signal fault injection (`step-05b-us-488.fresh-verify.md`).
- Testing: `npm run test` exit 0 (159/159); mutation skipped (no `mutationTest`, `skipMutationTesting: true`); sabotage red-signal confirmed (`step-07-us-488.testing.report.md`).

## Next steps

- Windows end-to-end CLI copy loop is covered by unit/composition checks only on this Linux host (V8 pure helper + V1/V2/V6/V9 projection tests) — track a real win32 CI smoke if available.
- Step 9: converge PR review threads / CI, then merge.

## References

- Spec: `.agents/plans/us-488/step-00-us-488.spec.md`
- Plan: `.agents/plans/us-488/step-02-us-488.plan.refined.md`
- Check: `.agents/plans/us-488/step-05-us-488.plan.report.md`
- Review: `.agents/plans/us-488/step-06-us-488.review.md`
- Fresh-verify: `.agents/plans/us-488/step-05b-us-488.fresh-verify.md`
- Testing: `.agents/plans/us-488/step-07-us-488.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 1h 24m 57s (5097s agent execution) |
| Steps executed | 8 |
| Total tokens | 0 (estimated: true; token metadata unavailable in this host) |
| Lines added | +287 |
| Lines removed | -115 |
| Net LOC delta | +172 |
| Baseline LOC | 916 |
| Final LOC | 1088 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | opencode-go/deepseek-v4.1-flash | 24s | 0 | 2 |
| 1 | Planning | opencode-go/deepseek-v4.1-flash | 340s | 0 | 1 |
| 2 | Interview | opencode-go/deepseek-v4.1-flash | 208s | 0 | 2 |
| 3 | Plan to tasks | opencode-go/deepseek-v4.1-flash | 138s | 0 | 1 |
| 4 | Implement | opencode-go/deepseek-v4.1-flash | 1616s | 0 | 4 |
| 5 | Verify | opencode-go/deepseek-v4.1-flash | 1283s | 0 | 1 |
| 6 | Code review | opencode-go/deepseek-v4.1-flash | 373s | 0 | 1 |
| 7 | Testing | opencode-go/deepseek-v4.1-flash | 1115s | 0 | 1 |
