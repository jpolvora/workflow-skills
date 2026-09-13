# Verification & Review (`quality`)

> Provenance: `.agents/skills/ws-plan-verify/SKILL.md`, `.agents/skills/ws-code-review/SKILL.md`, `.agents/skills/ws-testing/SKILL.md`, `.agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs`, `.agents/skills/ws-fix-pr/SKILL.md`, living synthesis of specs 0004, 0005, 0015, 0028, 0031, 0038, 0044, 0046, 0050, 0067.

## Feature

Quality is a left-shifted, fail-closed chain embedded in the Spec-to-PR orchestrators. `ws-plan-verify` scores spec compliance and advances only when the derived ledger reaches `defaults.minVerifyScore` (default 9), never from self-reported scores. `ws-code-review` runs two-phase adversarial review with fix and re-review loops capped at three rounds. `ws-testing` executes unit, integration, end-to-end, and coverage gates with an opt-in mutation substep. `ws-preview` offers a user-invoked CI-shaped dry-run that publishes nothing. `ws-fable-judge` adversarial audits and `ws-secrets-leak-review` scans gate shipping. Stack-invariant profiles block pull requests when reviewer-aligned defects appear. `ws-fix-pr` and `ws-goal-fix-pr` converge PR threads with proactive same-class sweeps before resolution.

## How it works

Verify scores derive exclusively from `ac-ledger.json` produced by `ac_ledger.cjs`. A score of 9 with known defects is unreachable by design. Uncovered negative scenarios cap the score at 8. Critical stack-invariant violations cap Step 5 below `minVerifyScore` and force `scoreAndRefine` back into implementation. When `fable.enabled` and `auditVerdictsBlockShip` include `refuted`, a `REFUTED` verdict caps below the bar and halts `ws-ship-pr`. Secrets scan failure halts push and PR creation.

Stack invariants are non-negotiable. Step 6 requires two-phase review proof covering Evidence, Failure, Missing-Protection, and Discards categories with the stack rule pack loaded from configured profiles. The optional `localReviewCommand` dry-run stays read-only and never replaces remote CI. Mutation testing runs only after green build, unit, integration, and coverage steps and before the Step 7 verdict in the standard pipeline; below-threshold mutation scores fail Step 7 into fix mode, and the tester role never edits product code directly.

Proactive class sweep after validating a review thread requires naming the defect class, searching code, MEMORY, PR context, and pattern files, fixing small local siblings immediately, and recording skips with path and reason. Resolving after an anchor-only fix while unrecorded siblings remain is forbidden. Verification keys matching `/^_/` are never required aliases; a valid `skipReason` counts as observed without defect caps; genuinely missing required aliases still fail closed.

Preview via `/ws-preview` or `/pipeline-review` is user-only, never model-invoked, always `--dry-run`, includes uncommitted changes, and stops after the summary without shipping.

## Backend

Ledgers and artifacts include `ac_ledger.cjs` with alias filtering, `skipReason` handling, known-defect cap 8, and missing-evidence cap 9. Testing emits `step-07-*.testing.{plan,report}.md` with Mutation status `passed|failed|skipped`. Audit logs use `{us-dir}/audit-{slug}-{timestamp}.log.md`. Benchmark evolution stores under `benchmarks/results/` with telemetry in `metrics.json`.

Configuration spans `verification.mutationTest`, `verification.mutationThreshold` (default 80), `defaults.skipMutationTesting` (default true), `fable.enabled`, `fable.autoAudit`, `fable.autoDetectDomain`, `fable.auditVerdictsBlockShip`, optional `localReviewCommand`, and stack profiles under `ws-shared/stacks/` consumed by `scan_stack_invariants.cjs`. Review fix reports carry `defectClass`, `sourcesConsulted`, `proactiveFixed`, and `proactiveSkipped` fields for convergence auditing.
