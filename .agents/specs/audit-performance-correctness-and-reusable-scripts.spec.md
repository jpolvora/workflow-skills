---
id: null
slug: audit-performance-correctness-and-reusable-scripts
title: "Runtime Audit Suggestions for Performance, Correctness, and Upstream Reusable Tooling"
source: local
specDate: 2026-08-14
---

# Specification — Runtime Audit Suggestions for Performance, Correctness, and Upstream Reusable Tooling

## Description

### Problem

The current runtime audit wrapper (`ws-audit`, controlled by `defaults.enableAuditing`) focuses primarily on detecting runtime defects and failures: broken script recipes, tool mismatch errors, I/O validation contract failures, and dispatch anomalies.

However, during complex orchestrations (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-multi-spec`), AI agents frequently produce:
1. **Disposable / throwaway scripts**: Agents dynamically write scratch Python, Node.js, Bash, or PowerShell scripts (e.g., under temporary directories, scratch areas, or project roots) to perform ad-hoc tasks like filtering test logs, parsing JSON/AST, comparing diffs, extracting coverage metrics, or querying git metadata. These scripts are discarded after a single run, wasting tokens, execution time, and generating redundant cognitive load across workflow runs.
2. **Performance bottlenecks**: Agents execute repetitive, unbuffered, or inefficient commands (e.g., unindexed global repository greps, high-frequency busy-wait polling loops, duplicate build/test invocations, re-reading unchanged heavy files, redundant subagent dispatches).
3. **Subtle correctness and fragility risks**: Commands and terminal outputs that do not fail with non-zero exit codes may still output deprecation warnings, truncated output buffers, unhandled edge-case warnings, or fragile shell pipeline parsing that threaten execution correctness.

Currently, the runtime auditor does not inspect output streams (agent reasoning, terminal commands, tool outputs, stdout/stderr) for these optimization opportunities or recommend pre-generating reusable tools at the upstream package level (`jpolvora/workflow-skills`).

### Solution

Expand the `ws-audit` runtime observer, log schema (`AUDIT-FORMAT.md`), helper scripts (`audit_log.js`), and orchestrator protocols to inspect execution output and diagnose optimization, performance, correctness, and reusable tooling opportunities alongside error detection.

Key capabilities to add:

1. **Output Stream Inspection & Classification**:
   - Inspect command invocations, terminal outputs, tool calls, and agent output streams across all orchestration steps.
   - Expand `category` in `ws-audit` to support:
     - `disposable-script`: Ad-hoc, throwaway scripts generated on the fly that should be standardized into pre-built upstream scripts/tools.
     - `performance`: Bottlenecks such as redundant command executions, slow polling, heavy repeated I/O scans, or subagent overhead.
     - `correctness`: Hidden correctness risks, unhandled stderr warnings, subtle data loss, or fragile parsing.
     - `optimization`: General pipeline or prompt improvement suggestions.
   - Expand `severity` in `ws-audit` to support `suggestion` (or `opportunity`) alongside existing `error`, `unusual`, and `info`.

2. **Disposable Script & Reusable Tooling Opportunity Detection**:
   - Detect when an agent creates temporary, inline, or scratch scripts (`scratch/*`, `tmp/*`, inline eval, or ad-hoc scripts) to parse, transform, filter, or query project files.
   - Record the purpose, language, inputs/outputs, and approximate complexity of the disposable script.
   - Formulate concrete upstream tooling recommendations (e.g., proposing a dedicated script under `{skillsRoot}/ws-*/scripts/` or a new utility skill).

3. **Performance & Correctness Bottleneck Diagnosis**:
   - Identify redundant repeated executions of expensive commands (e.g., full test suites executed multiple times without code changes, duplicate linters).
   - Detect ineffective or high-frequency polling patterns and oversized file reading operations.
   - Detect stderr warnings, deprecation notices, or silent fallback behaviors that indicate fragile setups.

4. **Upstream Improvement Proposals in Audit Logs & Issue Drafter**:
   - Enrich `{us-dir}/audit-{slug}-{timestamp}.log.md` with a dedicated `## Improvement Opportunities & Reusable Tooling` section.
   - Update `audit_log.js` (`draft-issue` and new helpers such as `has-suggestions` / `draft-suggestions`) to generate structured GitHub issue proposals for `jpolvora/workflow-skills` that outline:
     - Proposed new upstream pre-generated scripts (to eliminate recurring disposable scripts).
     - Recommended orchestrator prompt or step-dispatch optimizations.
     - Observed bottlenecks and benchmark evidence from the audit log.

5. **User-Gate Integration**:
   - Maintain the opt-in requirement via `defaults.enableAuditing`.
   - At workflow finalize, if significant reusable tooling opportunities or optimization suggestions are identified (even in runs with zero errors), present an interactive `user-gate` offering to copy or submit the upstream improvement proposal.

### Scope & Boundaries

- **In Scope**:
  - Updating `ws-audit` SKILL.md, `AUDIT-FORMAT.md`, and `audit_log.js`.
  - Updating orchestrator audit protocols in `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-multi-spec`.
  - Expanding finding categories, severities, and issue drafting mechanisms.
  - Ensuring harness neutrality, portable tool vocabulary, and zero overhead when `defaults.enableAuditing` is `false`.
- **Out of Scope**:
  - Automatically creating GitHub issues without user confirmation through `user-gate`.
  - Blocking workflow completion solely based on non-error optimization suggestions.
  - Intercepting low-level OS process memory; inspection relies on agent-observed command lines, outputs, and tool calls.

## Acceptance Criteria

- AC1: `ws-audit` finding categories in `AUDIT-FORMAT.md` and `audit_log.js` include `disposable-script`, `performance`, `correctness`, and `optimization` in addition to existing categories (`script`, `tool`, `io-validation`, `dispatch`, `other`).
- AC2: `ws-audit` finding severities in `AUDIT-FORMAT.md` and `audit_log.js` support `suggestion` (or `opportunity`) alongside `error`, `unusual`, and `info`.
- AC3: When `defaults.enableAuditing` is effective `true`, the runtime audit observer inspects agent tool invocations, command lines, terminal outputs, and scratch script creations for performance bottlenecks and disposable script patterns.
- AC4: When an agent creates or executes a disposable scratch/throwaway script (e.g. ad-hoc Python, Node, Bash, or PowerShell scripts for filtering, transforming, or parsing data), the auditor records a `disposable-script` finding detailing the task, language, and potential upstream script abstraction.
- AC5: When redundant commands, expensive re-executions, inefficient polling loops, or oversized scans are observed in terminal/command outputs, the auditor records a `performance` finding with execution context and optimization suggestions.
- AC6: When terminal outputs contain unhandled warnings, deprecation notices, truncated output buffers, or fragile shell parsing patterns that risk execution reliability, the auditor records a `correctness` finding.
- AC7: `{us-dir}/audit-{slug}-{timestamp}.log.md` includes structured sections for both runtime anomalies/errors and workflow improvement opportunities (reusable tooling suggestions, performance enhancements).
- AC8: `audit_log.js` provides CLI subcommands/options (`has-suggestions`, `draft-suggestions-issue`, or expanded `draft-issue`) to evaluate and extract upstream improvement proposals from the audit session.
- AC9: At workflow finalization when `enableAuditing` is `true`, if actionable reusable tooling or optimization suggestions exist, the orchestrator presents a `user-gate` allowing the user to review, copy, or submit an upstream feature/tooling proposal to the repository specified in `upstream.repo`.
- AC10: When `defaults.enableAuditing` is `false` or unconfigured, workflow execution remains unchanged with zero audit logging overhead or suggestion gates.
- AC11: Documentation across `ws-audit/SKILL.md`, `ws-audit/AUDIT-FORMAT.md`, `ws-shared/config-resolution.md`, and relevant orchestrator references is updated to document the expanded optimization and disposable script detection capabilities.
- AC12: All updates maintain agent/IDE portability (using `{skillsRoot}`, `{us-dir}`, `user-gate`, and portable tool aliases), use en-us exclusively, and pass integrity verification (`npm run verify-integrity`).

## Notes

- Upstream repository target: `jpolvora/workflow-skills` (resolved via `skill-dependencies.json` → `upstream.repo`).
- Typical candidates for upstream pre-generated scripts identified from past workflow runs:
  - Git log/diff extractors and commit message parsers.
  - Test result and code coverage JSON/XML summary extractors.
  - AST / regex-based multi-file symbol replacement and inspection helpers.
  - Workspace file tree structure / dependency visualizers.
- Complements existing error-focused runtime auditing introduced in [`enable-auditing.spec.md`](enable-auditing.spec.md).
