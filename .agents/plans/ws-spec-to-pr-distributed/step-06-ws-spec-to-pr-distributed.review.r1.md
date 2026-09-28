---
step: 6
slug: ws-spec-to-pr-distributed
workflowId: ws-spec-to-pr-distributed
status: completed
startedAt: "2026-09-27T13:04:18.392Z"
endedAt: "2026-09-27T15:58:26.790Z"
acRefs: []
---
# Code Review — ws-spec-to-pr-distributed

**Diff under review:** `git diff develop...HEAD` (committed range, HEAD `e79c96dc`)
**Stack rule pack:** `typescript-node` (`node-skills-package`)
**Result:** 0 Critical, 0 Warning, 2 Suggestions — clean for Advance (Suggestions do not block).

## Scope

Committed range covers: the new `ws-spec-to-pr-distributed` skill (body, coordinator, references, evals),
both dependency manifests, shared-runtime prose re-homing, the `ws-spec-to-pr` slim, the `ws-check-workflows`
workflow registry, baton-suite path updates, an added registry test, docs/site/wiki/router sync, version bump
0.5.4, and the regenerated integrity manifest.

## Triage notes

- `scan_stack_invariants.cjs` → 0 issues (0 Critical, 0 Warning).
- `npm run test` → 137/137 pass; `test-harness-clean.js` → 0 findings; `verify-integrity` → OK.
- No configured `verification.localReviewCommand` / `preview.localReviewCommand` review runner.
- MEMORY sweep: only `memory/2026-09-25-ws-spec-multi-batch-traps.md` (batch/plans-index traps); no rule intersects the committed product paths.

## Findings

### CR-001 [Suggestion] open .agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs:L72-L74
The distributed coordinator requires the worker-turn guard through an explicit relative path
(`path.join(__dirname, '..', '..', 'ws-spec-to-pr', 'scripts', 'worker_turn_guard.cjs')`) instead of the
shared-hub resolver used for `step_baton.cjs`.
Read evidence: `step_coordinator.cjs:72-L74`.
Executable scenario: installing `ws-spec-to-pr-distributed` without `ws-spec-to-pr` would break the require,
but the dependency graph lists `ws-spec-to-pr` as a required dependency, so the installer cascade installs it.
Missing protection: none proven — the dependency edge is declared in both manifests.
Discards: the baton primitive intentionally stays in `ws-shared` (shared), while the guard is an
orchestrator/worker-contract artifact owned by the standard orchestrator; moving it is out of this spec's scope.
Score: 8/10.
Sibling occurrences: none.
Suggestion: no change required; optionally add a one-line comment (already present at L71-73) or later promote the guard to the shared runtime.

### CR-002 [Suggestion] open .agents/skills/ws-check-workflows/scripts/check_workflows.cjs:L293-L293
The distributed simulation smoke-checks the skill body with substring tests
(`['0\u20139', 'step_coordinator.cjs', 'ws-spec-to-pr']`).
Read evidence: `check_workflows.cjs:293`.
Executable scenario: a body edit that removed the real FSM delegation but kept those tokens would still pass
the substring check; the file-existence and dependency-closure checks remain the load-bearing assertions.
Missing protection: no deeper structural assertion of the shared `STEP-DISPATCH` reference.
Discards: the check is intentionally a smoke test; the `ws-spec-to-pr-distributed` dependency-closure check and
`test/test-check-workflows-distributed.js` cover ownership and registry behavior.
Score: 9/10.
Sibling occurrences: none.
Suggestion: optionally also assert the body references `ws-spec-to-pr/STEP-DISPATCH.md`.

## Stack Invariant Compliance

| Checklist item | Status |
|----------------|--------|
| `scan_stack_invariants.cjs` (typescript-node) | PASS — 0 issues on 44 files |
| Node-only runtime (no `.py` under `.agents/skills`/`bin`) | PASS — `test-harness-clean.js` Phase 0/5 clean |
| Harness neutrality (no host product names) | PASS — `test-step-baton-config.js` neutrality loop |
| Dependency-graph closure (both manifests) | PASS — `check_workflows.cjs` distributed closure |
| Integrity manifest current | PASS — `verify-integrity` OK (v0.5.4) |
| Docs/site/wiki sync | PASS — rebuilt site + wiki; pre-ship doc-sync trio pending at Step 8 |

## Apply fixes?

No Critical/Warning. Suggestions optional; no fix pass required. Advance to Step 7.
