---
step: 6
slug: dispatch-prompt-audit-trail
workflowId: dispatch-prompt-audit-trail-20260930T043902Z
status: completed
startedAt: "2026-09-30T05:22:27.272Z"
endedAt: "2026-09-30T05:22:27.272Z"
acRefs: []
---
# Code review — dispatch-prompt-audit-trail (round 1)

- **Base:** `5117abca` (batch baseline; `main` contains sibling batch items out of scope)
- **Head:** `260c47ff` (G2 product commit, Step 5)
- **Snapshot:** `git diff 5117abca...HEAD` — 9 modified + 2 new files, all inside the refined-plan blast radius
- **Stack rule pack:** `typescript-node.md`
- **Score:** 8/10 (one Warning, fixable in-round)

## Findings

### CR-001 [Warning] open .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:L1735-L1741

Re-dispatching an audited step without fresh prompt flags throws unconditionally,
which wedges internal retry/batch substeps (`scoreAndRefine`, `reviewFix`,
`fixPrPlan`, `fixPrExec`) on any step whose outer dispatch recorded a prompt audit.

1. **Read Evidence:** P2 guard throws when the replaced entry carries `promptSha256`
   and the new dispatch omits the flags (`workflow_state.cjs:L1735-L1737`); every
   `dispatch` for the same step number flows through this replace path with no
   substep exemption. Step 9 emits an outer `dispatch --step 9` plus per-batch
   `dispatch --step 9 --substep fixPrPlan/fixPrExec` events (`STEP-DISPATCH.md`
   Step 9 contract); scoreAndRefine/reviewFix reuse the same substep replace path.
2. **Executable Failure Scenario:** a run that follows the new recipe audits the
   step-9 outer dispatch (writer + `--prompt-path/--prompt-sha256`), then the first
   fix-pr batch emits `dispatch --step 9 --substep fixPrPlan` without prompt flags
   (batch recipes were not extended by this change) → `update_state` exits 1
   (`cannot dispatch step 9: the prior dispatch recorded a prompt audit`) → the
   convergence loop wedges before any batch executes. Same wedge for
   scoreAndRefine/reviewFix retries on audited steps 5/6.
3. **Missing Protection:** no internal-substep inheritance or exemption in the P2
   guard; the throw cannot distinguish a fresh orch re-dispatch (must fail closed)
   from an internal retry substep (refinement of the same execution).
4. **Discards:** (a) "batches will pass flags" — no: `ws-goal-fix-pr`/`ws-fix-pr`
   batch dispatches emit substep/model provenance only and are untouched by this
   change; (b) "outer step-9 dispatches never carry flags" — contradicts the shipped
   recipe (writer on every dispatch); the throw triggers exactly when the recipe is
   followed; (c) entry normalization cannot help — the throw precedes persistence.

**Sibling occurrences:** `finish` backfill (P3) acts only when flags are present and
never throws without them — not affected. Pre-advance gate performs no dispatch
writes — not affected. `dag` node dispatches intentionally keep the throw (each
node must audit its own pair); only the four internal retry substeps need
inheritance.

```suggestion
In the P2 guard, when the new dispatch omits prompt flags but names an internal
retry substep (scoreAndRefine, reviewFix, fixPrPlan, fixPrExec), inherit the prior
entry's promptPath/promptSha256 instead of throwing, and set priorPromptSha256 on
the event only when the dispatch explicitly carried fresh flags. Keep the throw
for fresh re-dispatches and dag node dispatches without flags. Add a regression
case: audited step-9 outer dispatch → fixPrPlan substep dispatch without flags
exits 0 with inherited provenance and no prior-sha event field.
```

## Areas verified clean

- Writer byte-exactness, atomicity, revision chain, node sanitize, skip markers,
  budget refusals — covered by observed tests; no traversal (sanitize + `inside()`
  containment), no env/token reads.
- Gate fail-closed/mismatch/grandfather/DAG/skip semantics — covered by observed
  pre-advance cases; errors name the step.
- Schemas keep `additionalProperties: false`; telemetry/state suites green.
- No weakened checks: no existing test or assertion modified (`test-suites.json`
  +3 lines only, additive entry).
- No scope creep: file set equals the refined plan plus generated integrity.
- MEMORY sweep: clean-tree integrity regen, G2 files_touched-only staging, CRLF
  Node-patch discipline, no harness benchmarks, key=value/step-output-file CLI
  discipline — all honored.

### Stack Invariant Compliance

| Rule | Status |
|------|--------|
| 1. No unchecked `any` / ts-ignore | pass — plain JS, no TS annotations |
| 2. Zero floating promises | pass — writer and all additions fully synchronous |
| 3. Boundary input validation | pass — unknown flags throw; step range, mode enum, node sanitize, promptRef shape enforced |
| 4. Injection & traversal prevention | pass — node sanitize strips slashes; promptPath rejects absolute + `..`; gate verifies `inside(usDir)` |
| 5. Resource lifecycle | pass — sync fs only; no streams, fds, or listeners |

Deterministic scan: `scan_stack_invariants.cjs` 0 issues (0 Critical, 0 Warning).
`config.json.invariants.commitPlanFilesOnlyAtStep8: true` honored (no plan paths
staged before Step 8; prompt pairs never staged). No `localReviewCommand`
configured — dry-run gate skipped. Fable judge at Step 5: VERIFIED.

**Apply fixes?** Yes — autoMode: run fix round for CR-001, then targeted re-review.
