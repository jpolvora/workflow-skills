---
step: 2
slug: fresh-worker-verifier-step
status: completed
blocking_open: 0
shared_understanding: confirmed
workflowId: fresh-worker-verifier-step-20260930T062223Z
startedAt: "2026-09-30T06:22:23.921Z"
endedAt: "2026-09-30T06:31:07.358Z"
acRefs: []
---
# Plan interview — fresh-worker-verifier-step

Audit of `step-01-fresh-worker-verifier-step.plan.md` (§0-8) against the spec, memory traps, and project evidence. autoMode: sweep-miss blocking gaps would close as model-inferred; none occurred (`blocking_open: 0`, fast exit after Resolve).

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| GAP-001 | non-blocking | §2 | CLI flag vocabulary per new script not pinned | Pin flags mirroring `run_sabotage.cjs` (`--test`, `--paths`, `--invert-patch`, `--repo-root`) and `ac_ledger.cjs` key=value lists | closed | Refined plan §2 pins each script's flags | project | `.agents/skills/ws-testing/scripts/run_sabotage.cjs` L47-77; `ac_ledger.cjs link --help` |
| GAP-002 | non-blocking | §2 | Scratch-worktree lifecycle granularity (per-AC vs per-stage) | One scratch worktree per injection call, created and removed inside the call | closed | Matches AC3/AC8 wording literally; no cross-AC contamination | model-inferred | Spec AC3 "one fault per AC on a scratch worktree" + AC8 "removed after the stage" |
| GAP-003 | non-blocking | §3 | Test command for injection runs | Must equal a configured `*Test` verification alias, mirroring the sabotage gate | closed | Refined plan §2 states the gate | project | `run_sabotage.cjs` L98-134 `configuredTestAliases` |
| GAP-004 | non-blocking | §5 | Fixture strategy for worktree tests | Temp git fixture + `git worktree add`, files written via Node (no BOM) | closed | Mirror the sabotage fixture pattern; probe showed PowerShell-written config BOM breaks strict config read | project | `test/test-hermes-spec-to-pr-enhancements.js` L156-201; interview probe /tmp/fv-probe2 |
| GAP-005 | non-blocking | §2 | Report-writer exit vocabulary 0/2/3 conflicts with harness convention (2 = usage error) | Exit 0 zero defects; exit 1 defects-or-failure with JSON `loopAction: continue\|pause` | closed | Refined plan §2 adopts 0/1 + JSON action | project | `run_sabotage.cjs` L51-55 exit-2 usage convention |
| GAP-006 | non-blocking | §3 | Integrity-regen order vs product commits | G2 product commits first, regen from the clean tree, manifest in a follow-up path-scoped commit | closed | Refined plan step 8 sequences the commits | project | memory `2026-09-06-integrity-clean-tree.md`; `2026-09-02-g2-code-slug-files-touched-only.md` |
| GAP-007 | non-blocking | §5/§6 | Failing-test baseline + invariant checks (interview hard rule) | Already present: per-AC injection red + 4 negative scenarios; §6 documents N/A boundaries with rationale | closed | No change needed | project | Plan §5 AC3/negatives; spec Notes (no stack rule pack) |
| GAP-008 | non-blocking | §2 | Advance-to-7 doc requirement vs no validator change could read as drift | Phrase as orch-dispatched substep requirement (mirrors `reviewFix`), explicitly doc-enforced, not a validator gate | closed | Refined plan §2 states the posture | model-inferred | STEP-DISPATCH § Step 6 reviewFix precedent (no pre-advance row) |
| GAP-009 | non-blocking | §2 | Injection implementation: wrap `run_sabotage.cjs` vs self-contained cycle | Self-contained cycle mirroring sabotage vocabulary + `--fail-pattern` capture of the failing test name | closed | Probe proved worktree + configured-alias mechanics; `run_sabotage.cjs` does not surface the failing test name, and changing it risks the Step 7 path; no call edge needed (doc references need none per `ws-plan-verify` precedent) | project | Probe /tmp/fv_probe2.cjs (`test-failed-as-expected`, `restored:true`); `bin/skill-dependencies.json` (`ws-plan-verify` has no `ws-spec-to-pr` edge) |
| GAP-010 | non-blocking | §8 | §8 decisions vs skip-eligibility phrasing | Mark decisions confirmed in the refined plan | closed | Interview ran, so eligibility is moot | model-inferred | gates.md Conditional interview |

## Spec sync

No closed decision overrides an AC sentence. No spec-of-record or `step-00` edit. No re-register needed.

## step-output

```yaml
status: success
refine:
  round: 1
  blocking_open: 0
  shared_understanding: confirmed
```
