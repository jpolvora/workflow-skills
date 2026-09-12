# Verification & Review (`quality`)

## Feature Overview

Quality is a left-shifted, fail-closed chain: `ws-plan-verify` scores spec compliance (advance only at `defaults.minVerifyScore`, default 9, via derived `ac-ledger.json` — never self-reported), `ws-code-review` runs two-phase adversarial review with fix → re-review loops (max 3), `ws-testing` executes unit/integration/E2E/coverage with an opt-in mutation substep, and `ws-preview` offers a user-invoked CI-shaped dry-run that publishes nothing. `ws-fable-judge` adversarial audits and `ws-secrets-leak-review` scans gate shipping; stack-invariant profiles block PRs with reviewer-aligned defects. `ws-fix-pr` / `ws-goal-fix-pr` converge PR threads with proactive same-class sweeps.

## Business Rules & Logic

- **Derived scores only**: verify score derives from `ac-ledger.json`; score 9 with known defects is unreachable; `REFUTED` fable verdicts (with `auditVerdictsBlockShip`) cap below the bar and halt `ws-ship-pr`; `ws-secrets-leak-review` failure halts push/PR creation.
- **Stack invariants are non-negotiable**: critical violations cap Step 5 below `minVerifyScore` and force `scoreAndRefine`; Step 6 requires two-phase proof (Evidence / Failure / Missing-Protection / Discards) with the stack rule pack; local review dry-run (`localReviewCommand`) stays read-only and never replaces remote CI.
- **Mutation is opt-in and ordered**: runs only after green build/unit/integration/coverage and before the Step 7 verdict (standard pipeline only); below-threshold scores fail Step 7 into `ws-implement-tasks` fix mode, which never edits product code from the tester role.
- **Proactive class sweep**: after validating a thread, the fixer names the defect class, searches code, MEMORY, PR context, and patterns, fixes small/local siblings now, and records skips with path + reason — resolving after an anchor-only fix with unrecorded siblings is forbidden.
- **Deadlock-free advance**: `verification` keys matching `/^_/` are never required aliases; a valid `skipReason` counts as observed without defect caps; genuinely missing required aliases still fail closed.
- **Preview is user-only**: `/ws-preview` / `/pipeline-review` is never model-invoked, always `--dry-run`, includes uncommitted changes, and stops after the summary.

## Technical Architecture

- **Ledgers & artifacts**: `ac_ledger.cjs` (alias filter, skipReason, knownDefect cap 8, missingEvidence cap 9), `step-07-*.testing.{plan,report}.md` (Mutation `passed|failed|skipped`), `{us-dir}/audit-{slug}-{timestamp}.log.md`, `metrics.json` telemetry, `benchmarks/results/` evolution reports.
- **Configuration**: `verification.mutationTest` + `verification.mutationThreshold` (default 80), `defaults.skipMutationTesting` (default true), `fable.enabled/autoAudit/autoDetectDomain/auditVerdictsBlockShip`, `config.json:localReviewCommand`, `ws-shared/stacks/` profiles + `scan_stack_invariants.cjs`.
- **Review surface**: `ws-fable-judge` detects Weakened Checks, False Completion, Scope Creep, Unauthorized Action; fix reports carry `defectClass`, `sourcesConsulted`, `proactiveFixed`, `proactiveSkipped`.
- **Provenance**: living synthesis of specs 0004, 0005, 0015, 0028, 0031, 0038, 0044, 0046, 0050, and 0067.
