# Step 1 Plan — workflow-parallel-writer-compat (0138)

- workflowId: us-0138-20260926T174000Z
- slug: workflow-parallel-writer-compat
- spec: .agents/specs/0138-workflow-parallel-writer-compat.spec.md
- flowMode: standard (classifier: 16 steps / 23 files / 3 layers; inline per batch override)
- modelsPreset: muse

## Order (detector first, then triage)

1. `ws-check-harness/scripts/check_git_ownership.cjs` (new): tree-wide fenced-block
   + skill-scripts scan for broad staging + forbidden verbs; narrative exempt.
   Wire into PHASES 5a + SKILL.md + test-harness-clean.js.
2. Run detector on tree; fix every TRUE finding (broad/destructive call sites).
3. `git-ownership.md`: Workflow compatibility matrix (git-mutating /
   shared-artifact-writer / read-only over all ws-* skills); ownership rule per class.
4. Matrix cross-check test (AC3) in test-git-ownership-contract.js (extend) or new asserts.
5. Orchestrator baseline wiring (AC7/AC8): standard, lite, multi, fix-pr/goal-fix-pr,
   ship-pr — refresh_baseline + fetch + rebase/merge-forward prose + invocation.
6. Shared-artifact writers (AC9/AC10): track fresh-read-before-write; changelog
   exact-block dedupe; compile idempotency proof; wiki watermark idempotency.
7. `concurrency_preflight.cjs` (new, warn-only) + setup.md bootstrap wiring (AC11/AC12).
8. `test/test-parallel-writer-e2e.js` (new) + register (AC13/AC14).
9. Docs (AC15): PHASES detector row, README/AGENTS compatibility notes, FEATURES row.
10. Full gates (AC16): npm run test + harness-clean + integrity (batch-end full run).

## Out of scope (per spec)

OS locks, auto conflict resolution, worktree redesign, provider intents,
retroactive repair. TOCTOU between read and write is NOT solved by locking;
writers use append/owned-section semantics + fresh-read checks.
