---
step: 8
slug: ws-preview-before-ship-gate
workflowId: ws-preview-before-ship-gate-20260917T011747Z
status: completed
startedAt: "2026-09-17T02:04:32Z"
endedAt: "2026-09-17T02:13:42.919Z"
acRefs:
  - AC1
  - AC2
  - AC3
  - AC4
  - AC5
  - AC6
  - AC7
  - AC8
  - AC9
---
# ws-preview-before-ship-gate — Delivery Result

## Expected

`ws-ship-pr` gains an optional, non-blocking Step 4b that runs the consumer's
`preview.dryRunCommand` exactly as `ws-preview` would (verbatim, no extra
flags, never publishes PR threads), after commit/push and before Create PR.
Enablement: `preview.previewBeforeShip` explicit `false` disables; otherwise
enabled (default `true`). Empty command, skip/push-only intents, and dry-run
skip with a recorded reason. AC1–AC9 + NS1–NS5 per the spec of record.

## Done

- Step 4b block in `ws-ship-pr/SKILL.md` (L89–L90): placement, skip reasons,
  trimmed-empty rule, consumer-root verbatim run (≥600s call), board summary,
  non-blocking continuation. G2 `cea78a7c`.
- `ws-preview` cross-reference (same never-publish contract).
- Config sync: schema boolean (default true), template + project seeds with
  comments, GUI checkbox row, INTERVIEW prose + table row.
- Battery: authoring validation PASS (9 ACs); GUI 8/8 (88-key parity);
  harness-clean 0 findings; full suite 76 steps ALL PASSED (exit 0);
  integrity regenerated last + verified (v0.4.33).
- Ledger: AC1–AC9 Implemented with file evidence; NS1–NS5 linked to observed
  battery tests; `backendTest` alias exit 0. Live NS confirmation at ship.
- Review round 1: 9/10, 0 Critical/Warning (1 accepted Suggestion), stack
  scan 0 issues, fable audit VERIFIED.

## Next steps

- Ship (Step 4 continues): push `develop`, Step 4b live-executes
  `npm run review:dry` (needs network + `OPENCODE_API_KEY`; on failure the
  gate reports and shipping continues — that behavior is the AC6 proof),
  then Create PR `develop` → `main`.
- Step 5 Fix-PR: converge review threads to zero.

## References

- Spec: .agents/specs/0089-ws-preview-before-ship-gate.spec.md
- Plan: step-01-ws-preview-before-ship-gate.plan.md
- Check: ac-ledger.json (lite: evidence links, no separate check report)
- Review: step-06-ws-preview-before-ship-gate.review.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 36m 3s (2163s agent execution) |
| Steps executed | 6 (0–5) |
| Total tokens | 0 (estimated: false — host reports no token metadata) |
| Lines added | +137 |
| Lines removed | -15 |
| Net LOC delta | +122 |
| Baseline LOC | 6043 |
| Final LOC | 6166 |

LOC scope: the 11 G2 files (protocol `src/`/`web/`/`tests/` do not exist in
this skills package; added/removed from `git diff --stat`, baseline/final by
line count; ±1 line is trailing-newline accounting on the new spec file).

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | opencode-go/deepseek-v4.1-flash | 586s | 0 | 4 |
| 1 | Planning | opencode-go/deepseek-v4.1-flash | 143s | 0 | 1 |
| 2 | Implementation | muse-spark | 752s | 0 | 11 |
| 3 | Review | muse-spark | 92s | 0 | 2 |
| 4 | Ship | muse-spark | 463s | 0 | 2 |
| 5 | Fix-PR | muse-spark | 127s | 0 | 1 |
