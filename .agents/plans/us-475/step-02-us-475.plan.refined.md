---
step: 2
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Refined plan — executable foreign-commit guard (shared-head batches)
startedAt: "2026-09-30T20:20:00Z"
endedAt: "2026-09-30T20:22:00Z"
---
## 0. Summary

Deliver one executable batch-owned guard for shared-head multi-spec runs plus its protocol
wiring. The guard records a per-dispatch baseline of the local and remote run-branch tips,
detects an unexpected advance and names the new commits, checks the PR head against the local
tip at convergence, and lists foreign commits that ride a PR range. The quiet sequential path
is unchanged.

**Refinements from the step-02 interview:** dedicated JSON sidecar baseline store (D1);
explicit `--own` own-commit set with over-report on empty (D2/G3); remote-absent degrades to
local-only (D3/G4); guard is git-read-only, sidecar is its only write (D4); convergence refusal
exits non-zero naming both heads (D5); the Resume / Skip / Abort pause is protocol prose (D6).

## 1. Acceptance Criteria mapping

| AC | Requirement | Where implemented |
|----|-------------|-------------------|
| AC1 | Dispatch baseline records local + remote tips | `record-baseline` |
| AC2 | Unexpected advance pauses and names new commits | `check-advance` + `PROTOCOL.md` pause |
| AC3 | Pause offers Resume / Skip / Abort | `PROTOCOL.md` Phase 4 `user-gate` |
| AC4 | Convergence compares PR head to local tip | `check-convergence` |
| AC5 | Mismatch refuses the merge | `check-convergence` exit 1 |
| AC6 | Foreign commits listed in PR body + audit notes | `list-foreign` + Phase 4b + `ws-ship-pr` note |
| AC7 | Quiet path adds no gate | `check-advance` exit 0 on unchanged |

## 2. Guard CLI contract

`foreign_commit_guard.cjs` (CommonJS, Node-only, git-read-only):

| Subcommand | Inputs | Behavior | Exit |
|------------|--------|----------|------|
| `record-baseline` | `--run`, `[--slug]`, `[--branch]`, `[--repo]`, `[--json]` | upsert `{slug, localTip, remoteTip, recordedAt}` in `foreign-commits.json` | 0 ok / 1 error |
| `check-advance` | `--run`, `[--slug]`, `[--branch]`, `[--repo]`, `[--json]` | compare tips to baseline; name new commits on advance | 0 quiet / 1 advance / 2 no-baseline |
| `check-convergence` | `--pr-head`, `--local-tip`, `[--repo]`, `[--json]` | normalize + compare | 0 equal / 1 mismatch |
| `list-foreign` | `--base`, `--head`, `[--own]`, `[--repo]`, `[--markdown]`, `[--json]` | range commits minus own → foreign list + markdown block | 0 ok / 1 error |

Baseline store `{plansDir}/{runId}/foreign-commits.json`:
```json
{ "schemaVersion": 1, "runId": "ms-…", "branch": "develop",
  "records": [ { "slug": "us-475", "localTip": "…", "remoteTip": "…", "recordedAt": "…" } ] }
```

## 3. Protocol wiring

- `PROTOCOL.md` Phase 4: before each dispatch run `record-baseline`; on the next dispatch run
  `check-advance` — advance → `user-gate` **Resume** (re-baseline and continue) / **Skip**
  (mark row, continue) / **Abort** (pause run), naming the new commits.
- `PROTOCOL.md` Phase 4b: before merge run `check-convergence --pr-head <head> --local-tip <tip>`;
  mismatch → refuse merge. Inject the `list-foreign` markdown block into the PR body and the
  audit notes.
- `STATE.md`: document the baseline store, invariants, and the guard's exit vocabulary.
- `SKILL.md`: add the guard to the Native Tool Contract and Goals.
- `git-ownership.md`: shared-head foreign-commit section pointing at the guard.
- `ws-ship-pr/SKILL.md` § Shared-head: include the supplied foreign-commit block in the PR body.

## 4. Step-by-step

1. `foreign_commit_guard.cjs` four subcommands. → AC1, AC2, AC4, AC5, AC6, AC7
2. Protocol wiring (`PROTOCOL.md`, `STATE.md`, `SKILL.md`). → AC1, AC2, AC3, AC4, AC5, AC6, AC7
3. Shared contract (`git-ownership.md`, `ws-ship-pr`). → AC6
4. `test/test-foreign-commit-guard.js` temp-repo fixtures; register in `test-suites.json`. → all
5. Harness / Node-only check. → AC7
6. Integrity + one version bump at ship. → hygiene

## 5. Test coverage

| AC / NS | Test |
|---------|------|
| AC1 | `testRecordsBaselineLocalAndRemoteTips` |
| AC2 | `testAdvanceNamesNewCommits` |
| AC3 | `testDocOffersResumeSkipAbort` |
| AC4 | `testConvergencePassesOnEqualHead` |
| AC5 | `testConvergenceRefusesOnMismatch` |
| AC6 | `testListForeignExcludesOwnCommits` |
| AC7 | `testQuietAdvanceNoGate` |
| NS1 | `testAdvanceNamesNewCommits` (pause, non-zero) |
| NS2 | `testConvergenceRefusesOnMismatch` (refusal) |
| NS3 | `testQuietAdvanceNoGate` |

## 6. Stack & security invariants

- Node-only `.cjs`, `node --check` clean, no `.py`.
- Git-read-only: no push/reset/checkout/clean/add/commit; only `rev-parse`/`log`.
- Writes only the run-dir baseline sidecar.
- Fail-closed advance/mismatch exits; quiet path exit 0.
