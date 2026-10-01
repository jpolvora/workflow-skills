---
step: 1
slug: us-478
workflowId: us-478-20261001T014700Z
status: completed
acRefs: []
title: ws-monitor issue-proposal body is sanitized by construction and counts units explicitly
startedAt: "2026-10-01T01:47:00Z"
endedAt: "2026-10-01T01:55:00Z"
---
## 0. Summary & Business Rules

`ws-monitor --open-issue` builds an enriched defect-issue proposal in
`.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` → `buildIssueProposal`. Two wording/leak
defects share the builder:

1. The body renders `- Session id: <uuid>` and echoes `--session-id <uuid>` in the reproduction
   command while the same body ends with a `Body anonymized` checklist. A host session id is
   exactly what the guardrail says to strip, so every filing needs a manual edit.
2. The summary line `N actionable finding(s) across M workflow(s)` derives `M` from distinct
   slugs (`new Set(workflows.map(w => w.slug))`), while the report header counts runs. Batch
   runners / re-run ids collapse multiple runs into one slug, so the filed headline contradicts
   the report.

Deliverable = a confined edit to `buildIssueProposal`:

1. Redact the session identifier by construction: omit the metadata line when no session id was
   supplied, render `- Session id: <redacted>` when one was, and echo `--session-id <redacted>` in
   the reproduction command. A final sanitize pass replaces any residual occurrence of the
   supplied id with `<redacted>` (AC1, AC2, AC3, AC5).
2. Label the summary by unit: `N actionable finding(s) across M run(s) (K distinct slug(s))`, with
   `M = workflows.length` (the same unit as the report header's `Workflows:` line) (AC4).
3. Tick the anonymization checklist only when the built body carries no session identifier (AC6).

Business rules:
- Read-only observer unchanged: still proposes, never files; no detector, severity, or report-header edits.
- Node-only `.cjs`; no `.py` (harness fails closed).
- The builder stays a pure string transform (no network, storage, or user payload).

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** redaction token `--session-id <redacted>`; summary
units `N finding(s) across M runs (K distinct slugs)`; the only session identifier available to the
builder is `options.sessionId`; input validation/auth/concurrency/data lifecycle/idempotency are
N/A because the builder is a pure string transform with no network, storage, or user payload.

**Measurable ACs:** AC1–AC6 from `step-00-us-478.spec.md`.

**In scope:**
- `monitor_snapshot.cjs` → `buildIssueProposal`: session-line redaction/omission, command
  placeholder, unit-labelled summary, checklist truthfulness.
- New fixture `test/test-ws-monitor-us478.js` + `test/test-suites.json` registration.
- Integrity regenerate + one version bump at ship (ship hygiene).

**Out of scope (spec table):** detector severity/codes, report header `Workflows:` line, watch
loop / transcript discovery / host adapters, provider `create-issue` intent, retroactive issues.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | fix |
| tests | `test/test-ws-monitor-us478.js`, `test/test-suites.json` | fixture coverage |
| installer-cli | `bin`, `docs`, package version | integrity + version bump (ship only) |

**`buildIssueProposal` changes (pure string transform):**

1. `const suppliedSessionId = String(options.sessionId || '').trim();` and
   `const sessionSupplied = suppliedSessionId.length > 0;`
2. Metadata line: include `- Session id: <redacted>` only when `sessionSupplied`; omit the line
   entirely otherwise (AC1, AC3).
3. Command line: `${sessionSupplied ? ' --session-id <redacted>' : ''}` (AC2).
4. Summary line: `` `${actionable.length} actionable finding(s) across ${workflows.length} run(s) (${slugs.length} distinct slug(s)).` `` (AC4).
5. Build `body = redactSessionIdentifiers(lines.join('\n'), suppliedSessionId)` where the helper
   replaces every occurrence of `suppliedSessionId` with `<redacted>`; guard the checklist on
   `sessionSupplied && body.includes(suppliedSessionId)` (always false by construction) so it reads
   `[x]` only when clean (AC5, AC6).

**Not touched:** `DEFECT_CONTRACTS`, `actionableFindings`, finding severity decisions,
`markdownReport`, transcript discovery, provider intents, `.ws/config.json`.

## 3. Step-by-Step Plan

1. **Redaction helper + metadata/command** — add `redactSessionIdentifiers`; gate the session line
   and command placeholder on `sessionSupplied`. → AC1, AC2, AC3, AC5
2. **Summary units** — switch `M` from distinct slugs to `workflows.length` and label both units.
   → AC4
3. **Checklist truthfulness** — tick only when the built body carries no session id. → AC6
4. **Fixture coverage** — `test/test-ws-monitor-us478.js` with the AC/NS assertions; register in
   `test/test-suites.json`. → AC1–AC6, NS1–NS3
5. **Harness / Node-only check** — no `.py`; `test-harness-clean.js` 0 findings. → invariant
6. **Integrity + version bump (ship hygiene)** — `npm run build-site:bump` once,
   `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — read-only local observer proposal builder; no RBAC, tenancy, authZ, or user-facing i18n.
Output is en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `us-478 AC1 session id omitted from body` — supplied id absent everywhere in body | `test/test-ws-monitor-us478.js` |
| AC2 | `us-478 AC2 command redaction placeholder` — `--session-id <redacted>` present, raw id absent | `test/test-ws-monitor-us478.js` |
| AC3 | `us-478 AC3 no session id omits metadata line` — `Session id:` line absent | `test/test-ws-monitor-us478.js` |
| AC4 | `us-478 AC4 summary labels run and slug units` — run count = workflows.length, slug count = distinct slugs | `test/test-ws-monitor-us478.js` |
| AC5 | `us-478 AC5 session id value redacted` — value never appears in body | `test/test-ws-monitor-us478.js` |
| AC6 | `us-478 AC6 checklist checked only when clean` — `[x] Body anonymized`, no id | `test/test-ws-monitor-us478.js` |
| NS1 | Supplied `--session-id abc-123` → body must not contain `abc-123` | `test/test-ws-monitor-us478.js` |
| NS2 | No session id → `Session id:` line absent | `test/test-ws-monitor-us478.js` |
| NS3 | Two runs share one slug → summary run count is not the slug count | `test/test-ws-monitor-us478.js` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Node-only runtime | `node --check` on the edited `.cjs`; no `.py` introduced | `monitor_snapshot.cjs` |
| Read-only observer | source scan: no new `fs.writeFileSync` to state/plans, no `git`/`spawn` mutation in the new path | `monitor_snapshot.cjs` |
| Pure builder | no network/storage/process call added inside `buildIssueProposal` | `monitor_snapshot.cjs` |
| Report header unchanged | `markdownReport` `Workflows:` line untouched | `monitor_snapshot.cjs` |
| Detector unchanged | no change to `actionableFindings` / severity decisions | `monitor_snapshot.cjs` |
| Anonymization by construction | built body never contains the supplied session id | `test/test-ws-monitor-us478.js` |
