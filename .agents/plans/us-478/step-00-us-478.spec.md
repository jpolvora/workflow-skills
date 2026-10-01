---
id: 478
slug: us-478
title: "ws-monitor: issue-proposal body embeds a host session id while claiming anonymized; workflow count wording contradicts the report"
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/478"
labels:
  - bug
step: 0
workflowId: us-478-20261001T014700Z
status: completed
startedAt: "2026-09-30T18:49:00.893Z"
endedAt: "2026-09-30T18:49:00.893Z"
acRefs: []
---
# Specification — ws-monitor: issue-proposal body embeds a host session id while claiming anonymized; workflow count wording contradicts the report

**State:** open
**Labels:** bug

## Description

The observer proposal builder `buildIssueProposal` in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` writes an enriched defect-proposal body to `{plansDir}/workflow-monitor.issue.md` that violates the filing guardrail it claims to satisfy. Two independent defects share this builder:

1. The body renders a `Session id: <uuid>` metadata line and echoes `--session-id <uuid>` in the reproduction command, while the same body ends with an "Body anonymized" checklist. A host session/transcript identifier is exactly the class the guardrail says to strip, so every filing requires a hand edit and silently regresses the moment a human files without editing.
2. The summary line `N actionable finding(s) across M workflow(s)` counts distinct slugs (`new Set(workflows.map(w => w.slug))`), while the report header counts runs. Batch runners and re-run ids collapse multiple runs into one slug, so the filed headline contradicts the report header.

The fix is confined to the proposal builder: sanitize session identifiers by construction and make the summary counts use labeled, consistent units. The read-only observer must keep proposing (never filing) and must not change detector behavior or the report header.

### Design Intent

The proposal builder already owns the anonymization checklist text; the defect is that the text was added without the builder guaranteeing it. The intended contract is "sanitized by construction", not "sanitized by the operator". The count wording was introduced when slugs were the only grouping key and runs were assumed one-per-slug; that assumption is false for batch runners, so the wording must name both units.

## Acceptance Criteria

- AC1: The proposal builder shall omit any host session identifier from the generated issue body.
- AC2: When a session id was supplied, the proposal builder shall render the reproduction command with the literal placeholder `--session-id <redacted>`.
- AC3: When no session id was supplied, the proposal builder shall omit the session-id metadata line entirely.
- AC4: The proposal summary shall label the finding count with both the run unit and the distinct-slug unit.
- AC5: If a session id, transcript path, or `--session-id` value would appear in the body, then the builder shall redact the value before writing the body.
- AC6: The anonymization checklist item shall remain checked only when the builder's output contains no session identifier.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing detector severity, codes, or the report header `Workflows:` line | Issue is scoped to the proposal body only |
| Changing `ws-monitor` watch loop, transcript discovery, or host adapters | Unrelated to the proposal builder |
| Changing the provider `create-issue` intent | The builder must sanitize before the intent runs |
| Retroactively editing already-filed issues | Out of band, human-owned |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Redaction token for CLI echo | `--session-id <redacted>` | Keeps command shape reproducible without the id | y |
| Summary unit labels | `N finding(s) across M runs (K distinct slugs)` | Names one unit per number, matching the report header | y |
| Session id source | `options.sessionId` passed to `buildIssueProposal` | Only session identifier available to the builder | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the builder is a pure string transform with no network, storage, or user payload | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `buildIssueProposal` output text changes | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC6 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Missing session id stays non-fatal; checklist stays truthful | AC3 and AC6 |
| Stack invariant | Node-only helper, launched with `node`, JSON/string output only | `ws-check-harness` skill-script runtime rule |
| Observation telemetry | Named proposal-body lines under `## Validation & Observation Notes` | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 478 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Generated `{plansDir}/workflow-monitor.issue.md` contains no match for the supplied session id.
- The reproduction command line contains `--session-id <redacted>` when a session id was supplied, and omits the flag otherwise.
- The summary line contains both a run count and a distinct-slug count.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- Run the builder with `--session-id abc-123`: the body must not contain `abc-123` anywhere; a body containing it fails.
- Run the builder without a session id: a `Session id:` line must be absent; a present line fails.
- Feed workflows whose rows share one slug across two runs: the summary must not report a slug-derived number as the run count.

## Original Issue Context

## Failure class

`ws-monitor --open-issue` writes an enriched proposal body (`{plansDir}/workflow-monitor.issue.md`) that **embeds a raw host session identifier** while the same body ends with a checklist asserting "Body anonymized". A second wording defect makes the summary line misleading in filed issues: the workflow count uses distinct slugs while the report header counts runs.

Both defects live in the proposal builder (`monitor_snapshot.cjs` → `buildIssueBody`, session-id line and the `N actionable finding(s) across M workflow(s)` line).

## Observed evidence (one live watch, proposal inspected before filing)

1. **Session id leak vs self-claimed anonymization.** The generated body contained a line of the form `Session id: <uuid>` and the reproduction command line repeated `--session-id <uuid>`, directly under:
   - `Session id: ...` metadata block, and
   - `- [ ] Body anonymized (no consumer secrets, customer data, or absolute machine paths)` — ticked by the observer only after manually deleting the session id.
   Host session/transcript identifiers are exactly what the filing guardrail says to strip. The built-in checklist makes a hand-edit mandatory on every filing, which will silently regress the moment someone files without editing.

2. **Count wording.** In the same run the final report header read `Workflows: 27 (0 active)` while the proposal summary read `4 actionable finding(s) across 24 workflow(s).` The 24 is `new Set(workflows.map(w => w.slug))` — distinct slugs — so multiple runs sharing a slug (batch runners, re-run ids) are collapsed without saying so. Filing the body as-is produces a headline that contradicts the report.

## Expected contract

- The generated proposal body is **sanitized by construction**: no session ids, host session paths, or `--session-id` values (tokenize to `--session-id <redacted>`); the anonymization checklist item can then be truthful.
- Summary counts are labeled by what they count: `N finding(s) across M runs (K distinct slugs)` — or both numbers taken from the same unit as the report header.

## Reproduction shape

- `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --watch --interval 60 --until-terminal --follow-transcript --session-id <id> --open-issue --report <path>`
- Open the generated `workflow-monitor.issue.md`: the `Session id` line is present while the anonymization checklist is checked; compare the `across M workflow(s)` count to the report header `Workflows: X`.

## Suggested direction (observer did not patch anything)

- Drop or redact the session-id metadata and the command-line echo of `--session-id` in `buildIssueBody`; keep `--follow-transcript`-style reproducible command shape.
- Emit both units in the summary line; keep checklist claims in sync with what the builder actually guarantees.

## Scope

- [x] No product fix was applied by the observer
- [x] No workflow state or managed skill copy was modified
- [x] All private data removed from this issue (no session ids or local paths quoted)

Related: #473 (the issue filed from a body that needed manual sanitization).

### Prior Work Sweep

No open pull request references issue 478. Keyword search (`issue-proposal`, `anonymization`, `session-id`) returned no open PR; `git log` on the monitor script returned no in-flight fix. Design-intent note: the checklist text was added without a builder guarantee, and the count wording predates batch runs sharing a slug.

## Notes

Lookup: `buildIssueProposal` is at `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (session-id line and `across ... workflow(s)` summary). Stack file is the Node 22 skill package (`config.json` `stack.id` `node-skills-package`). MEMORY had no trap that changes this proposal.
