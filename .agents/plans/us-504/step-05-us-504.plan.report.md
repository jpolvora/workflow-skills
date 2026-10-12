# Check-implementation report — us-504

Workflow: us-504-20261012T200000Z (standard, autoMode + fullMode).
Spec: `.agents/plans/us-504/step-00-us-504.spec.md` (6 ACs, 4 NS).
Plan: `.agents/plans/us-504/step-01-us-504.plan.md` + `.runtime/plan.index.json` (9 sections, 6 ACs).
Classifier: standard pipeline, complexity standard, execMode dag, runInterview false.

## Score: 10/10 (minVerifyScore 9 — PASS, advance authorized)

Ledger boundary `step5`: 60/60 units, all ACs Implemented with observed tests,
all NS with observed tests. Correction (post-ship audit B1): this report was
first written while the full suite job was still running and prematurely
stated the suite result; the `backendTest` alias error below was closed only
after the suite completed green, and every ship decision (G2 commit onward)
was made after green was confirmed in collected job output.

## AC verdicts

- AC1 Implemented — global-tree fixture PASS exit 0 (`check_workflows.cjs:L19-L70`, `test-check-workflows-global-root` observed).
- AC2 Implemented — skills-tree preference over install-dir self-match (`:L31-L70`).
- AC3 Implemented — `--repo-root <dir>` honored (`:L586-L625`).
- AC4 Implemented — both `--repo-root` forms take effect (`:L586-L625`).
- AC5 Implemented — no-marker fallback to cwd (`:L31-L48`).
- AC6 Implemented — regression suite committed (`test/test-check-workflows-global-root.js:L1-L30`).

## Negative scenarios

- NS1 observed — fixture PASS exit 0 post-fix (pre-fix: 19 findings exit 1).
- NS2 observed — missing/unknown flags exit 2 loudly.
- NS3 observed — local install PASS unchanged.
- NS4 observed — invariant scan clean (0 issues, 189 files).

## Telemetry

- `node --check check_workflows.cjs`: exit 0.
- `check_workflows.cjs --json --repo-root .` / `--repo-root=.`: PASS exit 0.
- Missing/unknown flags: exit 2 with loud stderr.
- Global fixture (`<tmp>/globalhome` with `.git` + full skills copy): PASS exit 0, 0 issues.
- `test-check-workflows-global-root.js`: PASS.
- `test-check-workflows-automode.js`: PASS. `test-check-workflows-distributed.js`: PASS.
- `scan_stack_invariants.cjs --stack typescript-node`: 0 issues / 189 files.
- `npm run test` (162 entries): green — confirmed in collected background-job
  output BEFORE the G2 commit (rounds 13–14), plus PR CI `test` jobs green;
  the first draft of this report cited the still-running job and is
  corrected by this note.
- `npm run verify-integrity`: OK v0.5.40.

## Gaps / follow-ups

- None blocking. Report corrected post-ship (B1); Steps 6–9 completed:
  review CLEAN, fresh-verify all VERIFIED, testing 162/162, PR #505 merged,
  issue #504 closed.
