---
slug: us-388
step: 7
workflowId: us-388-20260922T080709Z
status: completed
startedAt: "2026-09-22T16:08:00Z"
endedAt: "2026-09-22T16:20:00Z"
---

# Testing Report — us-388

## Scope

The change is harness-internal (monitor classification + a batch guard script + docs),
so the battery is the repository suite plus two targeted fixtures. No mutation testing
(`skipMutationTesting: true`). No browser surface.

## Batteries

| Battery | Command | Exit |
|---------|---------|------|
| Full suite | `npm run test` (120 entries) | 0 |
| Targeted — monitor expectation/finding | `node test/test-ws-monitor-us388.js` | 0 |
| Targeted — fail-closed guard | `node test/test-verify-child-artifacts-us388.js` | 0 |
| Regression — monitor | `node test/test-ws-monitor.js` | 0 |
| Regression — lite contract | `node test/test-ws-monitor-us385.js` | 0 |
| Regression — transcripts | `node test/test-ws-monitor-us356.js` | 0 |
| Regression — us-395 findings | `node test/test-ws-monitor-us395.js` | 0 |
| Evals schema | `node test/test-evals-schema.js` | 0 |

## Coverage of the new surface

- `expectedChildArtifacts`: advanced-only filtering, state detection by directory scan
  (`.json` or `.md`), unsafe-slug skip.
- `missing-child-state`: fires for absent child state; silent when state exists; silent
  for `pending`/`skipped`; never overlaps `stale-parent-row`.
- `verify_child_artifacts.cjs`: exit 0 with state + `step-01-{slug}.plan.md`; non-zero
  (naming both) when absent; rejects an ad-hoc `plan.md`; treats empty files as absent;
  refuses unsafe slug and unknown `--require`.

## Live verification

`node .agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs --slug us-388 --plans-dir .agents/plans --json`
exits 0 (state + step-01 present). The repository snapshot now reports multi-spec
`expectedArtifacts` populated (4/4 present for the active batch) and does not flag us-388.

## Result

PASS.
