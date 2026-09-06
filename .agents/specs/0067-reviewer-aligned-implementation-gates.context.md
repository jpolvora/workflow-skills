# Context — Reviewer-Aligned Implementation Gates & Pre-PR Defect Prevention

Companion to `0067-reviewer-aligned-implementation-gates.spec.md`.

## Feature Boundary

This feature integrates adversarial review heuristics and framework invariant checks directly into the pre-PR development lifecycle of `workflow-skills` (`ws-spec-to-pr` and `ws-spec-to-pr-lite`).

- **In Scope:**
  - Establishing a portable catalog of stack-specific invariant rules (`.agents/skills/ws-shared/stacks/`).
  - Augmenting Step 0 spec generation with stack safety requirements and negative scenarios.
  - Adding pre-commit static scan heuristics in Step 4 (`ws-implement-tasks`).
  - Scoring stack invariant compliance in Step 5 (`ws-plan-verify`) to cap `ac_ledger.cjs` scores on invariant violations.
  - Arming Step 6 (`ws-code-review`) with two-phase adversarial scrutiny and stack checklists.
  - Providing an optional local dry-run adapter for projects using `cursor-reviewer`.
  - Seeding initial memory traps via `ws-configure-project`.
- **Boundary Limit:**
  - It does not replace or modify remote CI workflows (e.g. GitHub Actions / Azure Pipelines running `cursor-reviewer`).
  - It does not attempt full semantic compilation or deep static analysis tooling where native compilers (like `tsc` or `dotnet build`) are already responsible for type checking.

## Implementation Decisions

1. **Deterministic Static Scanning vs. LLM Adversarial Juror in Step 4:**
   - *Decision:* Use a lightweight, deterministic script (`scan_stack_invariants.cjs` or `.py`) for Step 4 inner loops.
   - *Rationale:* Running full LLM critic passes on every task iteration introduces unacceptable latency and token overhead. Deterministic regex/grep heuristics catch 80% of routine violations (e.g. `.Result`, `Guid.Empty`, missing `[Authorize]`, `any`, missing `takeUntil`) in milliseconds. Step 6 then employs the LLM adversarial review for deeper semantic and architectural issues.

2. **Stack Profile Distribution:**
   - *Decision:* Ship baseline profiles in `ws-shared/stacks/` (`abp-angular.md`, `typescript-node.md`, `nextjs-react.md`, `php-laravel.md`) with support for project overrides in `$PWD/.agents/skills/ws-shared/stacks/`.
   - *Rationale:* Ensures portability across global and local harness installations, matching the multi-stack architecture established by `cursor-reviewer`.

3. **Step 5 Scoring Penalty vs. Hard Fail:**
   - *Decision:* A critical invariant violation caps the verification score at 7/10 (`knownDefect`), which is strictly below `minVerifyScore` (default 9).
   - *Rationale:* This leverages the existing `scoreAndRefine` mechanism in `ws-spec-to-pr`, forcing the agent to remediate the defect before any product commit can occur, without requiring new orchestrator states.

4. **Integration with Local `cursor-reviewer` Runner:**
   - *Decision:* Opt-in via `config.json` (`preview.localReviewCommand` or `verification.localReviewCommand`).
   - *Rationale:* Not all consumer repos use `cursor-reviewer`; keeping the runner integration decoupled ensures `workflow-skills` remains host- and tool-neutral while providing maximum synergy when `cursor-reviewer` is present.

## Deferred Ideas

- **Live Compiler Diagnostics Ingestion:** Integrating Roslyn analyzers or TypeScript Language Server protocol (LSP) diagnostics directly into `ws-implement-tasks`. Deferred due to cross-platform toolchain requirements.
- **Bi-directional Memory Synchronization:** Automatically syncing CI reviewer thread summaries back into `spec-memo` via webhook. Deferred to a dedicated CI telemetry specification.
