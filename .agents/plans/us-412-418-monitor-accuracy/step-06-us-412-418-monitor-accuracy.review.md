# Code review — us-412-418-monitor-accuracy (step-06)

Scope: `monitor_snapshot.cjs` (+ docs/evals/tests). Self-review, adversarial pass.

## Findings (all addressed inline before commit)

1. Over-broad tolerance (would have broken us-385 AC4): initial `terminalShape`
   leg downgraded a terminal-shaped-but-active lite run to info. Fixed by
   narrowing to `status === 'completed'` (AC3's literal definition). us-385 green.
2. `resolveTranscriptSource` OR→AND tightening: safe because snapshot
   `scannedFiles` are pre-filtered by the scan predicate; direct-call unit tests
   (liveness M2/M3) pass unchanged. Documented in plan.
3. `listTranscriptCandidates` mtime ordering: deterministic (mtime + name
   tiebreak), read-only, bounded extra stats; liveness M1/M9 pass.
4. No secrets/host paths in new findings: messages reuse artifact names and the
   refined filename (repo-relative); tails stay sanitized. No new output fields.
5. Exports are additive (`transcriptCorrelates`, `expectsStep`); no caller changes.
6. Surgical check: `git status` shows only own files; no `ws-spec-multi` state,
   no foreign spec/plan dirs touched. Line endings preserved (CRLF script,
   LF tests/docs where siblings use them).

## Verdict

Approve. No review-fix code changes required. `git diff` matches scope.
Scores: correctness 9, scope 10, tests 10.
