---
id: 348
slug: us-348
title: enhance host capabilities - detect tools & cache it
source: github
specDate: 2026-09-19
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/348"
step: 0
workflowId: us-348
status: completed
startedAt: "2026-09-19T08:49:46.490Z"
endedAt: "2026-09-19T08:49:46.490Z"
acRefs: []
---
# Specification — enhance host capabilities - detect tools & cache it

## Description

Workflow startup today detects model+toolkit host capabilities into a `.json` file, then maps and caches it when needed. Even so, agents still fall back to shell commands and custom scripts for operations the host already provides natively (the observed symptom: "Writing the spec with the Write tool to avoid shell quoting issues" — the agent shelled out instead of using a native file tool).

Brainstorm and then implement: detect the common native tools at session/workflow start — file read, file write/update, shell exec, and subagent dispatch among them — bring those native capabilities to orchestrator and subagents explicitly, and cache the result so detection cost is paid once. Goals: speed (no re-detection per step), predictability (agents pick native tools instead of reinventing shell equivalents), and fewer quoting/escaping failures.

If the brainstorm approves the plan, the follow-through is:

1. Scan all skills and tool calls and map them to capability tokens (e.g. `{readFile}`).
2. Have agents query the cached host-capabilities `.json` before choosing how to act.
3. Keep a repository-side map of the most common models and tool/function names (including dispatch-agent variants) pre-mapped, so new hosts resolve fast.

If the brainstorm rejects it, record the abandon reason instead of implementing. Either outcome is a valid completion of this spec's first half; only approval proceeds to the mapping work.

System boundaries: host-capability detection, cache file, capability-token vocabulary, and skill/tool-call mapping. Architecture touchpoints: host-capabilities probe script and cache schema, `host-dispatch.md` / dispatch resolution, `tools.md` aliases, and the per-skill bodies that currently shell out for native-capable operations. No provider or SCM changes.

## Acceptance Criteria

- AC1: A documented brainstorm decision (refine-and-implement vs abandon-with-reason) is recorded — verified by reading the decision note.
- AC2: On approval, workflow/session start detects common native tools (read, write/update, shell exec, dispatch) and caches them in the host-capabilities `.json` — verified by a cache-content test on at least two host shapes.
- AC3: Skill guidance maps tool calls to capability tokens (e.g. `{readFile}`) with cache-query-first ordering, so agents prefer native tools over shell equivalents — verified by grepping the vocabulary plus a scenario test where file work uses the native tool.
- AC4: Cached detection is reused across steps (no per-step re-probing) with a documented invalidation rule — verified by a probe-count test over a multi-step run.
- AC5: Pre-mapped model/tool names ship in the repo for the most common hosts (including dispatch-agent variants) — verified by reading the map for named entries.

## Original Issue Context

To avoid tool callings that use bash/pwsh commands/tools/custom scripts, improve the tools availability in sessions (orchestrator and subagents). when starting workflows today we detect model+toolkit host cabilities .json file and map and cache when needed.
Today I saw this message: Writing the spec with the Write tool to avoid shell quoting issues

detect write tools, read tools, updata files tools, etc the most common tools, shell exec etc
used to bring native capabilities to agents avoiding reinventing the wheel.

brainstorm this feature, decide if need refine or abandon it.

I think we can gain speed, previsibility on running commands.

If approved the plan, we need to scan all skills and tool calls, map it and replace with token {readFile} etc and query the host capabilities .json cache file.

The repository can have most common models and tools names, function names like dispatch agents pre mapped.

### Prior Work Sweep

- Provider `sweep-prior-work` for issue 348 (keywords: host, capabilities, tools, cache): no open PR for the same tracker id; keyword hits are merged historical PRs (#77, #277, #193, #350, #322, #270, #300); no duplicate risk.
- Existing detection machinery (`host-dispatch.md`, host-capabilities probe + cache) is the foundation — this spec enhances and systematizes it rather than starting over; the plan must inventory the current probe, cache schema, and token vocabulary first.
- Related merged work: #270 (multi-host global targets, host binding v2) and dispatch-ladder PRs; coordinate token naming with `tools.md` aliases.

### Design Intent

- Shell-outs for native-capable operations are an accidental gap (agents unaware of, or unable to resolve, the native tool), not an intentional preference — the "Write tool to avoid shell quoting" symptom shows agents already prefer native tools once they can see them.
- The current probe-once/cache design is intentional and stays; the enhancement adds tool coverage (read/write/exec/dispatch), token mapping, and pre-mapped host data on top of it.
- Greenfield vocabulary (`{readFile}`-style tokens) and repo-side host map; the brainstorm gate exists because token-vs-prose guidance is a taste decision the plan must justify with the shell-out failure evidence.

## Notes

- Capability tokens must stay portable (capability names, never host product tool IDs) so skill bodies remain host-neutral.
- Detection must degrade gracefully: unknown hosts get a safe minimal capability set, never a hard failure at workflow start.
- Cache invalidation needs one clear rule (e.g. per session, per host-version, or explicit refresh flag) — stale caches that hide newly available tools are worse than re-probing.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting every skill body to tokens in this spec | Follow-through mapping is plan-sized work; this spec approves the vocabulary and seeds the map |
| Host-specific tool IDs in shipped skill bodies | Portability rule: tokens only, resolved per host at runtime |
| Changing dispatch semantics or provider contracts | Detection only affects tool choice, not workflow behavior |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Brainstorm outcome is recorded either way | Abandon-with-reason is a valid completion of the first half | Issue explicitly says "decide if need refine or abandon it" | y |
| Common tools are read, write/update, shell exec, dispatch | Plan confirms/extends the list from a skill scan | Named explicitly in the issue | y |
| Pre-mapped host data lives in the repo | Static map file plus runtime cache | Issue asks for repository-side pre-mapping | y |
| Input validation and bounds | N/A because detection reads host metadata, not user free input | No new external input surface | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Brainstorm note + detection/cache enhancement + token vocabulary + host map | Plan file list matches AC touchpoints |
| Atomic acceptance criteria | AC1–AC5 each independently checkable (note, cache, grep, probe count, map) | `validate_spec.cjs --mode=authoring` passes |
| Failure modes covered | Shell-out regression, stale cache, unknown host, missing map entry each have a negative scenario | Negative scenarios section lists all four |
| Observation telemetry | Probe counts, cache hits, and tool-choice outcomes observable in tests/logs | Telemetry section names the signals |
| Zero open blockers | Brainstorm is plan-owned; current probe inventoried | Assumptions table shows plan-owned default |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Host-capabilities cache file content after a fixture run lists detected tools per host shape.
- Probe-count assertion over a multi-step fixture run shows detection ran once (cache hits after).
- Scenario test log shows file work choosing the native tool over shell equivalents.
- `npm run test` green with new detection/map fixtures.

### Negative & Failing Test Scenarios

- File operation via shell when the native tool is cached-available must fail the tool-choice test — red before token guidance lands.
- Multi-step run that re-probes per step must fail the probe-count test — red on cache bypass.
- Unknown-host fixture must degrade to the minimal capability set without failing startup — red on hard failure.
- Host from the pre-mapped list resolving to unmapped tool names must fail the map-coverage test — red on map gaps.
