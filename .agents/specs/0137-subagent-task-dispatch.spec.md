---
id: null
slug: subagent-task-dispatch
title: "Subagent Task Dispatch CLI Command and Asynchronous API"
source: local
specDate: 2026-09-26
---

# Specification — Subagent Task Dispatch CLI Command and Asynchronous API

## Description

The Antigravity Harness orchestrates autonomous subagents across diverse development workflows. While orchestrators define multi-step flows, direct developer interaction and codebase integrations require a standardized mechanism to dispatch individual subagent tasks on demand. Currently, invoking a subagent task requires manual script invocation or private harness interfaces, lacking a unified CLI dispatch command and a first-class asynchronous API method.

This specification introduces a unified subagent task dispatch interface across two operational modes:
1. Direct CLI invocation via a standardized `dispatch` command (`antigravity dispatch --subagent <subagent-name> --task "<task-description>" --payload '{"key": "value"}'`).
2. Programmatic asynchronous dispatch via an exported `dispatchSubagentTask` API function within the codebase.

The dispatch interface parses target subagent identifiers, operational directive/task descriptions, and structured JSON payloads. It validates inputs, provides default payloads, captures errors gracefully, and returns structured execution results in human-readable or JSON format.

System boundaries:
- CLI command parser and validation layer handling `--subagent`, `--task`, and `--payload` flags.
- Programmatic async module exporting `dispatchSubagentTask({ subagent, task, payload })`.
- Boundary input validation protecting against malformed JSON and path traversal.
- Structured execution response formatting with standard exit codes and error envelopes.

## Acceptance Criteria

- AC1: The CLI dispatch command accepts required --subagent, required --task, and optional --payload parameters.
- AC2: Omitting the required --subagent or --task argument results in exit code 1 with descriptive errors on stderr.
- AC3: Passing invalid JSON syntax in the --payload argument produces an immediate parsing failure with exit code 1.
- AC4: A valid JSON payload string is parsed into an object and forwarded intact to the subagent task context.
- AC5: Omitting the optional --payload argument defaults to an empty object without interrupting task execution.
- AC6: The harness exports an asynchronous dispatchSubagentTask function for programmatic invocation in codebase modules.
- AC7: The programmatic dispatchSubagentTask function rejects its Promise when called with missing or invalid arguments.
- AC8: The CLI dispatch command supports a --json flag that formats completion results and errors as JSON on stdout.
- AC9: Subagent dispatch failures are caught and surfaced without leaving unhandled Promise rejections or orphaned child processes.
- AC10: Subagent identifiers containing path traversal sequences or illegal characters are rejected fail-closed before execution.

## Original Issue Context

Free-text requirement (source: local):

```
To dispatch a subagent task using the Antigravity Harness, you need to utilize the internal dispatch command or invoke the corresponding asynchronous API method depending on whether you are working in the CLI or the codebase.Here is how to dispatch a subagent task:🛠️ Method 1: Using the CLI / Command LineIf you are interacting with the harness via a terminal, use the direct dispatch syntax:bashantigravity dispatch --subagent <subagent-name> --task "<task-description>" --payload '{"key": "value"}'
Use code with caution.--subagent: Specifies the target subagent's identifier.--task: Defines the specific operational directive or function name.--payload: Passes optional JSON-formatted arguments required for execution.
```

### Prior Work Sweep

- Keyword sweep across `.agents/skills` and `bin/`: no existing standalone `antigravity dispatch` CLI command exists; existing dispatch references belong to orchestrator multi-step pipelines (`STEP-DISPATCH.md` and `host-dispatch.md`).
- Git log sweep: no previous standalone subagent task dispatch command or programmatic API exists in this repository.
- SCM provider check: `providers.scm` is github; repository working tree is clean with no conflicting open PRs for standalone subagent task dispatch.

### Design Intent

Greenfield addition: this feature introduces a new standalone subagent task dispatch CLI command and programmatic API. No existing standalone dispatch behavior exists to preserve or modify, so no `git log -S/-L` symbol regression hunt applies.

## Notes

- Conforms to Node 22 runtime and package conventions.
- Aligns with the portable capability vocabulary defined in `ws-shared/runtime/tools.md` and `host-dispatch.md`.
- No gray area detected: command flags and programmatic argument structures are concrete and unambiguous, so no `.context.md` companion is required.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive TUI chat session multiplexing | Task dispatch focuses on discrete operational directives and payloads |
| Unsanitized shell script execution inside payloads | Payloads are strictly parsed and validated as structured JSON objects |
| Persistent daemon lifecycle management | Background service daemonization is managed by the host environment |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default payload value | Empty object `{}` when `--payload` is omitted | Safe default preventing null dereferences in subagent execution contexts | y |
| Programmatic API signature | Async function `dispatchSubagentTask({ subagent, task, payload })` | Standard idiomatic async JavaScript API convention | y |
| CLI default output mode | Human-readable terminal text, switching to JSON envelope when `--json` is supplied | Follows standard CLI tooling conventions | y |
| Absent implicit dimensions (data lifecycle and expiry, auth boundaries and rate limits, concurrency and ordering) | N/A because subagent task dispatch is an on-demand invocation with no persistent TTL storage, local process authorization model, and standalone execution lifecycles | Bounds specification scope to CLI and programmatic invocation mechanics | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Subagent dispatch CLI command and asynchronous API only | Out of Scope table holds; plan file list matches |
| Atomic criteria | Every AC carries an independent pass-or-fail verification signal | AC1 through AC10 each tested by focused unit or integration check |
| Failure modes defined | Missing parameters, invalid JSON, and execution failure cases specified | AC2, AC3, AC7, AC9, and AC10 test error paths |
| Observation telemetry | Execution results, validation failures, and timings emitted to output streams | AC8 and Telemetry & Observable Signals |
| Stack invariants (typescript-node) | Input validation on CLI/API boundaries, zero floating promises, path traversal prevention on subagent names, and resource cleanup | `scan_stack_invariants.cjs --stack typescript-node` and review checklist |
| Zero open blockers | Command syntax, parameter schema, and default payload behavior confirmed | Assumptions Confirmed column all y |

## Validation & Observation Notes

### Telemetry & Observable Signals

- CLI process exit code (0 for successful task execution, 1 for input validation or dispatch failure).
- Structured JSON output on stdout when `--json` flag is supplied.
- Descriptive error messages detailing malformed JSON or missing required arguments on stderr.
- Async API Promise resolution returning result object or rejection with typed Error.

### Negative & Failing Test Scenarios

- Invoking `antigravity dispatch` without `--subagent` exits with code 1 and writes error to stderr (AC2).
- Invoking `antigravity dispatch --subagent test` without `--task` exits with code 1 and writes error to stderr (AC2).
- Invoking `antigravity dispatch --subagent test --task "do work" --payload "{invalid-json}"` exits with code 1 and reports invalid JSON (AC3).
- Calling `dispatchSubagentTask` with a non-string subagent or empty task rejects with a ValidationError (AC7).
- Dispatching with path traversal sequences in subagent identifier (e.g. `../../evil`) fails closed before execution (AC10).
- Subagent process crash or rejection resolves to a structured error result without unhandled Promise rejection (AC9).
