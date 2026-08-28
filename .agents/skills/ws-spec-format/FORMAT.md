# Canonical `*.spec.md` format

Referenced by [`SKILL.md`](SKILL.md). Other skills link here — do not duplicate.

## File name

| Source | Pattern |
|--------|---------|
| Spec of record — default (`plans.enforceSpecPrefixOrdering: false`) | `{specsDir}/{slug}.spec.md` |
| Spec of record — prefixed (`plans.enforceSpecPrefixOrdering: true`) | `{specsDir}/NNNN-{slug}.spec.md` |
| Workflow copy (after `ws-local-spec-provider` register) | `{plansDir}/{slug}/step-00-{slug}.spec.md` |

Slug: `us-{id}` for tracker ids; else basename without `.spec.md` (strip optional `step-00-` or leading `NNNN-`). Order is fixed: the `{specsDir}` spec of record is written **first** (resolved via `ws-spec-organizer`), then the `{plansDir}` workflow copy. Standalone `/write-spec` writes **only** the `{specsDir}` path — never creates `{plansDir}` artifacts.

## YAML frontmatter (required)

```yaml
---
id: 1474              # integer — tracker id; null if local
slug: us-1474
title: "Feature title"
source: github        # github | azure-devops | local
issueState: open      # optional
issueUrl: "https://github.com/{org}/{repo}/issues/1474"  # optional
workItemType: "User Story"  # optional — ADO
specDate: 2026-07-02
---
```

## Body (required sections)

```markdown
# Specification — {title}

## Description

(agentic technical scope, background, and system boundaries)

## Acceptance Criteria

- AC1: (unambiguous, deterministic, testable criterion)
- AC2: (clear pass/fail condition with edge cases)

## Original Issue Context

(optional / required for tracker issues — verbatim original human-authored issue description, comments, and audit context for human reading and traceability)

### Prior Work Sweep

(required when `source` is `github` or `azure-devops`; optional for `local` — record keyword/git findings when run)

- Related PRs, commits, and duplicate-risk notes from provider `sweep-prior-work` or local keyword/git sweep.

### Design Intent

(optional — required for modification / bugfix tasks after `git log -p -S` or `git log -L`; skip greenfield with reason)

## Child Tasks

(optional — when tracker had sub-tasks)

### Task #{id} — {title}

- **Status:** …
- **Description:** …

## Notes

(technical considerations, dependencies, constraints)

## Out of Scope

| Feature | Reason |
|---------|--------|
| (named non-goal) | (why it is excluded) |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| (decision) | (value or `N/A because …`) | (why) | y/n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| (gate) | (what must be true before implementation) | (how the agent checks it) |

## Validation & Observation Notes

### Telemetry & Observable Signals

- (named command, log, or score signal)

### Negative & Failing Test Scenarios

- (failing test or expected error before the happy path)
```

## Closure sections (required for new specs)

`ws-write-spec` and Step 0 **authoring** validation require these headings. Historical specs may omit them; `validate_spec.cjs` default `--mode=compat` warns without failing.

### Out of Scope

Markdown table with columns **Feature** and **Reason**. At least one data row. Name work that will not ship in this spec.

### Assumptions & Open Questions

Markdown table with columns **Assumption**, **Chosen default**, **Rationale**, and **Confirmed**. At least one data row. Every data row must have a non-empty, non-placeholder Chosen default and Rationale. Collapse dimensions that do not apply into one row whose Chosen default or Rationale starts with `N/A because`.

### Implicit-requirement dimensions

Cover dimensions that are obviously present for the feature as ACs, or collapse the rest into one Assumptions `N/A because` row (do not invent ACs for absent dimensions).

| Dimension | What to cover |
|-----------|----------------|
| Input validation and bounds | Limits, formats, sanitization |
| Failure and partial-failure | Timeouts, partial saves, rollbacks |
| Idempotency / retry / dedup | Safe retries, dedup keys |
| Auth boundaries and rate limits | Who can call what, throttle rules |
| Concurrency / ordering | Races, ordering guarantees |
| Data lifecycle / expiry | TTL, archival, deletion |
| Observability | Logging, metrics, tracing hooks |
| External-dependency failure | Fallbacks, timeouts |
| State-transition integrity | Valid transitions, guards |

### Definition of Ready (DoR)

Markdown table with columns **Readiness Item**, **Requirement**, and **Verification Method**. At least one non-placeholder data row. Checklist items to cover: bounded scope, atomic criteria, failure modes, observation telemetry, and zero open blockers (or an explicit `N/A because` row).

### Validation & Observation Notes

Non-placeholder body. Include **Telemetry & Observable Signals** (named commands, logs, or scores) and **Negative & Failing Test Scenarios** (expected red tests or error states). Authoring validation fails if `### Negative & Failing Test Scenarios` is missing or has only placeholder bullets. Placeholder-only text (`TBD`, `TODO`, `placeholder`) fails authoring validation.

### Optional companion

Gray area with two or more valid product options → `{specsDir}/{slug}.context.md` (Feature Boundary, Implementation Decisions, Deferred Ideas). Never write an empty companion. It is a spec companion, not a `{plansDir}` artifact.

## Validation

1. ACs enumerable, deterministic, and testable — one line per AC (`- AC{N}: ...`).
2. `source: local` → author drafts complete ACs from free-text requirements.
3. `source: github` | `source: azure-devops` → `ws-write-spec` reformulates and enhances raw issue into agentic ACs while preserving human text in `## Original Issue Context`; **`### Prior Work Sweep` required** after sweep before plan/code.
4. Modification / bugfix specs → `### Design Intent` required (or documented skip for greenfield).
5. `*.issue.json` is audit-only — downstream workflow skills read `step-00-*.spec.md` only.
6. Local specs (`ws-write-spec` / hand-written) live under `{specsDir}` (`plans.specsDir`, default `.agents/specs`); orch registers to canonical `step-00` under `{plansDir}` when a workflow starts.
7. New specs: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` must exit 0 (closure headings + tables, plus non-empty `## Definition of Ready (DoR)` and `## Validation & Observation Notes` including `### Negative & Failing Test Scenarios` with at least one non-placeholder bullet). Omit `--mode` (compat) for historical files: same errors as before, plus warnings for missing closure / DoR / Validation Notes.

