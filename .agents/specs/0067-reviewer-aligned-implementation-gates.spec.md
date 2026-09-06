---
id: null
slug: reviewer-aligned-implementation-gates
title: "Reviewer-Aligned Implementation Gates & Pre-PR Defect Prevention"
source: local
specDate: 2026-09-06
---

# Specification — Reviewer-Aligned Implementation Gates & Pre-PR Defect Prevention

## Description

The `ws-spec-to-pr` and `ws-spec-to-pr-lite` pipelines provide a structured development workflow (Spec → Plan → Tasks → TDD Implementation → Verification → Local Review → Ship → Fix PR). However, in production pipelines equipped with advanced adversarial review bots (such as `cursor-reviewer` running `composer-2.5`), pull requests frequently encounter a large volume of critical and warning review threads upon arrival in CI.

While `ws-fix-pr` and `ws-goal-fix-pr` provide proactive defect-class remediation, relying on downstream PR review creates an expensive, high-latency feedback cycle (commit → push → remote CI build → reviewer agent execution → PR thread generation → local pull → fix → push → re-review).

Investigation into `cursor-reviewer` reveals why CI reviews catch critical issues that pre-PR development steps miss:
1. **Adversarial Separation of Concerns:** `cursor-reviewer` is a pure read-only critic with zero feature implementation responsibility, immune to "author confirmation bias" and calibrated on strict proof of exploitability (Read Evidence, Executable Failure Scenario, Missing Protection, Discards).
2. **Explicit Stack Invariant Rule Packs:** `cursor-reviewer` dynamically injects domain and framework rules (e.g. `skills/stacks/abp-angular.md`, `typescript.md`) that explicitly forbid framework anti-patterns (such as `.Result`/`.Wait()` async deadlocks, missing `[Authorize]` annotations, unvalidated DTO inputs, Angular template Observable memory leaks, and UI permission bypasses).
3. **Spec AC Tunnel Vision in Implementation:** `ws-implement-tasks` (Step 4) focuses strictly on satisfying functional Acceptance Criteria. If a functional AC does not explicitly mandate framework security or lifecycle rules, the implementer omits them.
4. **The TDD False-Positive Illusion:** Step 4 enforces TDD, but the authoring agent creates unit tests that mock middleware, bypass authorization pipelines, and ignore concurrency or template lifecycle issues, yielding 100% green tests that mask severe architectural flaws.
5. **Spec-Centric Verification Gap:** Step 5 (`ws-plan-verify`) scores spec fulfillment via `ac_ledger.cjs`. If ACs are marked Implemented and unit tests pass, it awards full points (9/10 or 10/10) without performing static architectural or security analysis.
6. **Unarmed Step 6 Local Review:** Step 6 (`ws-code-review`) lacks the deep stack checklists and heuristic rules present in `cursor-reviewer`, frequently producing superficial approvals or failing to enforce framework-level invariants.
7. **Reactive-Only Memory:** Memory backends (`spec-memo` / `MEMORY.md`) only contain previously recorded traps; unencountered or unseeded framework traps provide zero pre-implementation warnings.

This specification establishes **Reviewer-Aligned Implementation Gates**, shifting the cognitive heuristics, adversarial scrutiny, and stack-specific invariant checklists of CI reviewers directly into the pre-PR development lifecycle (Steps 0, 1, 4, 5, and 6), preventing bugs from reaching remote review.

## Acceptance Criteria

- AC1: `ws-shared` defines a structured `stacks/` catalog containing non-negotiable architectural, security, concurrency, and lifecycle invariant rules for supported frameworks (`abp-angular`, `typescript-node`, `nextjs-react`, `php-laravel`, and extensible custom profiles), mirroring the detection capabilities of CI reviewers.
- AC2: `ws-spec-write` and `ws-spec-format` automatically inject applicable stack architectural and security invariants into `## Definition of Ready (DoR)` and `### Negative & Failing Test Scenarios` when drafting or enhancing specs for a detected project stack.
- AC3: `ws-plan-write` and `ws-plan-interview` mandate a dedicated "Stack & Security Invariants Verification Plan" in `step-01-*.plan.md`, identifying touched framework boundaries (authorization, async safety, DTO validation, subscription cleanup).
- AC4: `ws-implement-tasks` introduces a pre-completion Stack Invariant Static Scan that evaluates modified files against deterministic anti-pattern patterns (e.g. `.Result`, `.Wait()`, missing `[Authorize]`, unchecked `any`, floating Promises) before declaring a task finished.
- AC5: `ws-plan-verify` (Step 5) incorporates a Stack Invariant Audit into the verification rubric, penalizing and capping the `ac_ledger.cjs` score below `minVerifyScore` if any critical stack invariant is violated, triggering `scoreAndRefine` before product commit.
- AC6: `ws-code-review` (Step 6) adopts the Two-Phase Adversarial Investigation model (Triage → 4-part Proof of Exploitability: Evidence, Failure Scenario, Missing Protection, Discards) and loads the project's stack invariant rule pack into its review context.
- AC7: When `cursor-reviewer` or an equivalent configured review runner is detected in the local repository or workspace (`scripts/cursor-reviewer` or `config.json.verification.localReviewCommand`), `ws-code-review` provides an opt-in or configured local pre-PR dry-run gate (`--dry-run --include-uncommitted` or committed diff) to validate the diff against the exact CI reviewer engine before Step 8 ship.
- AC8: `ws-configure-project` seeds initial high-frequency framework traps into project memory (`MEMORY.md` and/or `spec-memo`) based on detected stack frameworks during project initialization.

## Notes

- Preserves backward compatibility for repositories without configured stack profiles (fallback to neutral baseline).
- The static scan in Step 4 uses lightweight AST or regex patterns to avoid excessive token consumption or wall-clock latency during inner dev loops.
- Local dry-run of CI reviewers (AC7) must run in read-only / dry-run mode and never mutate git state or post remote comments.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing `cursor-reviewer` in CI | CI review serves as an independent gate; this spec aligns pre-PR development to pass CI on the first round, not replace CI. |
| Re-implementing full language AST parsers | Heuristic pattern checks and LLM adversarial prompts provide sufficient coverage without heavy compiler toolchains. |
| Auto-fixing third-party upstream dependencies | Scope is bounded to code authored or modified within the workflow's `files_touched`. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Stack profile storage location | `.agents/skills/ws-shared/stacks/` | Co-located with shared hub assets, accessible to both local and global skill installations. | y |
| Integration with `cursor-reviewer` runner | Optional via `config.json.preview.localReviewCommand` | Decouples workflow-skills from hard vendor lock-in while empowering consumers with `cursor-reviewer`. | y |
| Static check execution mode | CLI helper script in `ws-code-review` / `ws-implement-tasks` | Deterministic, rapid exit-code feedback before invoking expensive LLM rounds. | y |
| Other implicit requirement dimensions | N/A because covered dimensions are bounded to stack invariants, auth boundaries, input validation, and concurrency safety. | Bounded by architectural scope. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Invariant Catalog | Stack invariant files defined for at least TypeScript and ABP/Angular | File existence under `.agents/skills/ws-shared/stacks/` |
| Verification Hook | `validate_spec.cjs --mode=authoring` passes for this spec | CLI execution exits 0 |
| Pre-flight Checker | Deterministic pattern scanner script prototyped | CLI unit tests passing on fixture antipatterns |
| Zero Open Blockers | Contract aligned between `ws-implement-tasks`, `ws-plan-verify`, and `ws-code-review` | Shared schema and protocol definition complete |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `ws-implement-tasks` logs `stack-invariant-scan: pass | fail` in `step-output.verification`.
- `ac_ledger.cjs score` reflects invariant deductions in JSON output (`invariantViolations: [...]`).
- `step-06-{slug}.review.md` includes explicit `### Stack Invariant Compliance` section.
- Remote CI reviewer (`cursor-reviewer`) round count on PRs drops from $\ge 3$ rounds to $\le 1$ round.

### Negative & Failing Test Scenarios

- Code containing `.Result` or `.Wait()` in an asynchronous C# method fails Step 4 invariant check and caps Step 5 score at 7/10.
- An Angular component template adding an interactive button without `*abpPermission` fails Step 5 verification and opens a Warning in Step 6.
- A TypeScript module with `any` type annotations or unhandled floating Promises fails Step 4 static scan.
- An API endpoint created without explicit authorization decoration fails Step 5 and blocks Advance to Step 8.
