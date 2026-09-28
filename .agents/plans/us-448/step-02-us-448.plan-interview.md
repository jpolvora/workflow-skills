---
step: 2
slug: us-448
workflowId: us-448-20260928T011143Z
status: completed
startedAt: "2026-09-28T01:11:43Z"
endedAt: "2026-09-28T01:14:37.117Z"
acRefs: []
---
# us-448 — Plan Interview

## Audit

- The new parent state path is a per-run directory, so two run IDs cannot
  share a batch state directory.
- Legacy resume must remain explicit and deterministic: new path first,
  legacy flat path second.
- Child lookup must remain independent from parent batch state lookup so the
  literal `ws-spec-multi` slug can use `{plansDir}/ws-spec-multi/`.
- Monitor discovery already enumerates immediate plan directories; the new
  layout fits that shape, while the legacy directory remains observable.
- Custom `plans.dir` and run-id containment need regression coverage.

## Resolved Assumptions

1. The new path is canonical and is preferred whenever both layouts exist.
2. Legacy files are read in place and are not migrated automatically.
3. The existing Markdown state format remains canonical for batch runs.
4. No new CLI or configuration key is needed.

## Verification Closure

The implementation can proceed with no unresolved product decision. Tests
will cover new discovery, legacy fallback, custom plan roots, the normal
`ws-spec-multi` child slug, and `missing-child-state`.
