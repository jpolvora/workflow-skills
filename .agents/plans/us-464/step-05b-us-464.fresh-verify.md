---
step: 5b
slug: us-464
workflowId: us-464-20260930T220628Z
artifact: fresh-verify
status: completed
specPath: .agents/plans/us-464/step-00-us-464.spec.md
planPath: .agents/plans/us-464/step-01-us-464.plan.md
verdictsPass: 7
verdictsFail: 0
injectionsDetected: 5
injectionsMissed: 0
---
# Fresh-worker verification — us-464

Re-derived every acceptance criterion from the spec and the committed implementation
(`git diff 36f985b9...dbf18d62`, committed tree at HEAD), then injected one fault per
criterion on the working tree and confirmed the suite catches it. Working tree was
restored byte-for-byte after every injection (`RESTORE-CHECK` exit 0).

## Re-derived AC verdicts

| AC | Verdict | Re-derived observation |
|----|---------|------------------------|
| AC1 | PASS | `--slug ws-spec-multi` selects every run whose state-derived slug equals the value (canonical + legacy fixtures both returned). |
| AC2 | PASS | A state under a folder that is not its slug (`renamed-folder-xyz/us-701…`) is selected by `--slug us-701`; the filter uses the state slug, not the folder name. |
| AC3 | PASS | The canonical `{plansDir}/{runId}/{runId}.state.json` batch run appears in the slug-scoped scan. |
| AC4 | PASS | A run under a slug-named plan folder is selected by its state slug. |
| AC5 | PASS | The legacy flat `{plansDir}/ws-spec-multi/{runId}.state.md` run appears in the slug-scoped scan. |
| AC6 | PASS | `--workflow-id <id> --slug <unrelated>` returns the id-matched run; `--workflow-id` alone also returns it. |
| AC7 | PASS | `--slug ghost-does-not-exist` returns `workflowCount: 0`, never the unfiltered set. |

Spec miss for registered refs: `test/test-ws-monitor-us464.js` does not call the ACs by name.
Does that make it impossible to verify? No — the assertions are unambiguous and the fault
injections below demonstrate each mapped behavior fails when the implementation is broken.

## Fault injections (one per criterion, mapped)

| ID | AC(s) | Injected fault | Observed | Detected |
|----|-------|----------------|----------|----------|
| FI-A | AC1, AC3, AC5 | multi-spec derived slug uses `runId` instead of `state.slug \|\| 'ws-spec-multi'` | test exit 1 (`stateDerivedSlug must report ws-spec-multi…`) | yes |
| FI-B | AC2 | standard derived slug prefers the folder name over `state.slug` | test exit 1 (`must prefer the state slug over the folder name`) | yes |
| FI-C | AC4 | standard derived slug ignores `state.slug` (uses `state.us`) | test exit 1 (`must prefer the state slug over the folder name`) | yes |
| FI-D | AC6 | slug filter re-enabled even when `--workflow-id` is supplied | test exit 1 (`--workflow-id must return the matching run…`) | yes |
| FI-E | AC7 | slug filter removed (`if (false)`) so an unmatched slug returns everything | test exit 1 (scoped count assertion) | yes |

`RESTORE-CHECK`: suite exit 0 on the restored tree; source SHA unchanged.

## Verdict

**No defects.** All 7 AC verdicts are PASS with observed evidence; all 5 fault
injections were caught. No fix loop required.
