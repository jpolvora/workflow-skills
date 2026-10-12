# Adversarial Audit Report (`ws-fable-judge`)

**Verdict:** `VERIFIED WITH CAVEATS`

Post-hoc audit (fable gate was skipped during the run; this audit closes it
against the merged ground truth `109b9569..8a14d9f`, PR #505).

## Claims vs Ground Truth
- **Claimed Scope:** Fix `check_workflows.cjs` global-tree repo-root
  mis-resolution (skills-dir-first resolver, `--repo-root` parity, cwd
  fallback) + regression test + suite registration + integrity + 0.5.40 bump.
- **Ground Truth Diff:** 15 files, +441/-125. Product: `check_workflows.cjs`
  (+59/-12 logic), new `test-check-workflows-global-root.js` (+66),
  `test-suites.json` (+3). Bump/board/changelog/plan/result files as stated.
  No existing test file modified; no assertions weakened.

## Re-Run Verification Results
- `node --check check_workflows.cjs` -> `PASSED` (Exit code: 0)
- `test-check-workflows-global-root.js` -> `PASSED` (Exit code: 0)
- `test-check-workflows-automode.js` -> `PASSED` (Exit code: 0)
- `test-check-workflows-distributed.js` -> `PASSED` (Exit code: 0)
- `npm run test` (162 entries) -> `PASSED` (Exit code: 0, collected job output + PR CI `test` jobs green)
- `scan_stack_invariants --stack typescript-node` -> `PASSED` (0 issues)
- `verify-integrity` -> `PASSED` (OK v0.5.40)
- Old-code fixture injection -> `FAILED-as-expected` (FAIL 19 issues / 18 CRITICALs, proving red-first)

## Fraud Audit
- **Weakened Checks:** None detected — zero diff lines in existing test files; new test only adds assertions.
- **False Completion:** Reporting-order defect (B1): step-05 report cited the still-running suite job; the completion itself later verified green and all ship decisions postdate confirmation. Corrected in-report; not a fabricated pass.
- **Scope Creep:** None — bump/board/plan/result files are disclosed delivery scope; no refactors, no new deps.
- **Unauthorized Actions:** Process deviation (B2): 9-line memory-index commit pushed to `develop` after PR #505 merged, outside PR review. Same-objective, owned repo, disclosed; remediated by carrying it into follow-up PR review.

## Source Chain Compliance
| Claim | Chain link | Reference | Uncertain |
|-------|-----------|-----------|-----------|
| Resolver prefers skills-tree ancestor | codebase | `.agents/skills/ws-check-workflows/scripts/check_workflows.cjs:L19-L70` | no |
| Both `--repo-root` forms take effect | codebase | `check_workflows.cjs:L586-L625`, exit-0 runs | no |
| Suite 162/162 green | codebase | background-job collected output + CI `test` pass 3m5s/3m16s | no |
| Old code FAILs 19/18 on fixture | codebase | re-ran old `main:` script copy in `.git`-rooted fixture | no |
| No weakened checks | codebase | `git diff 109b9569..8a14d9f --stat` (no test-file modifications) | no |
| Zero open issues/PRs | web | `gh issue/pr list` (empty) + PR #505 MERGED + issue #504 CLOSED | no |
- **Skipped-link violations:** None.
- **Unsourced claims:** None (B1 timing prose now corrected with marker).

## Action Items
- B1 report correction: done (this run, follow-up PR).
- B2 post-merge push: carried into follow-up PR for retroactive review; memory trap recorded.
- S1 dead field (`parseArgs o.repoRoot` unused): accepted as documentary; no change.
- **Self-Learning Action**: recorded in `.ws/memory/2026-10-12-fable-us-504.md` (Severity: High); compiled into `MEMORY.md`.
