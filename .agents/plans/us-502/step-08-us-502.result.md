---
step: 8
slug: us-502
workflowId: us-502-20261011T211005Z
status: completed
startedAt: "2026-10-11T21:10:05.639Z"
endedAt: "2026-10-11T23:48:30.912Z"
acRefs: []
---
# us-502 — Delivery Result

## Expected

From the spec of record (13 ACs, 10 negative scenarios) and the refined plan:

- A dispatched batch worker writes a first liveness marker (`{us-dir}/.runtime/worker-started-{step}-{batch}.md`) within the effective window, so parent-side freshness checks finally have a baseline (AC1, AC2).
- The marker is a plain runtime file: it adds no workflow-state write and must not bump the revision (AC3).
- One deterministic, read-only evaluator resolves a single verdict from the recorded dispatch baseline, the marker, and durable progress: `no-baseline` → `alive` → `pending` → `wedged`, exit 0/0/0/2, with a marker only counting for the dispatch it is at or after (AC2-AC7).
- Only `wedged` authorizes takeover; no second worker for a batch not proven wedged; a ping outcome is recorded as watchdog evidence instead of silence; inline, lite, and Tier 3 postures are exempt (AC8-AC10, AC12).
- The window resolves from `defaults.workerLivenessWindowSec` with a 600 s fallback (AC11), and the obligation plus the parent contract live in one canonical dispatch-contract section (AC13).

## Done

- **Evaluator**: `.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs` (new, single Node `.cjs`, sync-only, read-only, containment-checked). Verdict precedence, exit codes, `markerPresent`/`markerFresh`/`markerMtime`/`markerAgeSec` evidence, malformed-telemetry tolerance, `--window-sec`/`--telemetry` overrides.
- **Canonical contract**: one new section `## Worker liveness contract (batch workers)` in `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md` (add-only; every pre-existing sentence byte-identical), the `ws-goal-fix-pr` watchdog wiring, and a 171 B pointer in `STEP-DISPATCH.md` inside its byte budget.
- **Config surface**: `resolveWorkerLivenessWindowSec` beside its peer resolvers, `defaults.workerLivenessWindowSec` in the schema + example + PowerShell GUI row, and the key added to the editor suite's `coreDefaults` so a missing GUI row now fails.
- **Tests**: `test/test-worker-liveness-check.js` (34 assertions, authored red-first, registered in the harness suite list) plus additive `.runtime` residue assertions in `test/test-workflow-state-contract.js`; the four frozen anchor suites stayed byte-unchanged and green.
- **Docs/version/integrity**: five surfaces updated (`FEATURES.md`, `README.md`, root `AGENTS.md`, `.ws/AGENTS.md`, `docs/index.html` via `bin/build-site.js`), one version bump 0.5.38 → 0.5.39, `bin/skill-integrity.json` regenerated and verifying clean.
- **Evidence trail**: verify 10/10 with all 13 ACs and 10 NS mapped; two-round adversarial review (3 Warnings proven with executable probes, fixed and closed; 1 non-blocking Suggestion open); Step 6b fresh-worker re-derivation (13/13 verdicts, 13/13 fault injections red with name-verified failures, zero defects); Step 7 testing green across the alias, the new suite, the frozen anchors, budgets, doc-sync, harness self-audit, integrity, and an independent CLI matrix.
- Product commits: `ebe82a78` (implementation) and `ea3d23c5` (review fixes), 24 files, +1201 / -87 against the run baseline `7553b93c`.

## Next steps

- **Shipping was skipped by mode policy, not by a failure.** This run is `autoMode` with `fullMode: false`, and the documented Step 8 auto-gate for that combination is "skip delivery commit and skip shipping" (the interactive recommendation for the same combination is also skip-shipping). No push and no PR were performed; `shipStatus: skipped`. To publish, run `/ship-pr` (or re-run with `--full`) — the two product commits are already on local `develop`.
- **Open Suggestion CR-004** (non-blocking): only the Step 9 paragraph carries the canonical pointer, so Steps 4-7 dispatches do not surface the marker obligation. Suggested as a next-change hardening, not a defect.
- **Coverage honesty**: AC1 and AC8-AC13 (plus NS9) are contract-text pins, not runtime-observed parent behavior; a parent-procedure drift would not fail the suite. The evaluator's own AC2-AC7/AC11 behavior is executably covered and independently reproduced.
- **Recorded harness friction for a future upstream change** (not part of this spec): the documented dispatch-audit manifest path violates the `.runtime` residue allowlist; `run_sabotage.cjs` cannot run pre-commit on a new file; a review-fix invalidates ledger file hashes and the only repair is re-linking the exact `path:Lstart-Lend` tuples; `check_memory_conflict.cjs` reports `memory_missing: true` in this repo; the full test alias can flake in the untouched `test/test-subagent-dispatch.js`.

## References

- Spec: `.agents/plans/us-502/step-00-us-502.spec.md` (record copy `.agents/specs/pending/0174-us-502.spec.md`)
- Plan: `step-02-us-502.plan.refined.md`
- Check: `step-05-us-502.plan.report.md`
- Review: `step-06-us-502.review.md` (+ `step-06-us-502.fix.report.md`)
- Fresh verify: `step-05b-us-502.fresh-verify.md`
- Testing: `step-07-us-502.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 1h 14m 44s (4484s agent execution) |
| Steps executed | 8 numbered steps (0-7) + Step 6b substep |
| Total tokens | 0 (the host reports no token metadata; not estimated) |
| Lines added | +1201 |
| Lines removed | -87 |
| Net LOC delta | +1114 |
| Baseline LOC | 0 (the protocol counts `src/`, `web/`, `tests/` only; none exist in this package) |
| Final LOC | 0 (same counting rule) |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | deepseek-v4.1-flash | 94s | 0 | 2 |
| 1 | Planning | deepseek-v4.1-flash | 690s | 0 | 1 |
| 2 | Interview | deepseek-v4.1-flash | 491s | 0 | 3 |
| 3 | Plan to tasks | deepseek-v4.1-flash | 341s | 0 | 1 |
| 4 | Implement (8-node DAG) | deepseek-v4.1-flash | 686s | 0 | 24 |
| 5 | Verify | deepseek-v4.1-flash | 563s | 0 | 2 |
| 6 | Code review (+ fix) | deepseek-v4.1-flash | 1049s | 0 | 4 |
| 6b | Fresh-worker verify | deepseek-v4.1-flash | not separately recorded (substep; no dispatch event) | 0 | 0 |
| 7 | Testing | deepseek-v4.1-flash | 570s | 0 | 2 |

Gate waiting time is excluded; these are agent execution times only. Step 6b ran as a substep between Steps 6 and 7 and, per the doc-enforced substep posture, did not emit its own dispatch event, so its wall time is not itemized above.
