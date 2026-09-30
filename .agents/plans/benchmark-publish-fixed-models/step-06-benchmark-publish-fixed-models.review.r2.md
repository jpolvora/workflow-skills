---
step: 6
slug: benchmark-publish-fixed-models
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:42:35Z"
endedAt: "2026-09-30T12:24:20.130Z"
acRefs: []
---
# Code review — benchmark-publish-fixed-models (round 2)

Re-review after fix round. All round-1 findings verified closed on the working tree. Full suite green (151), integrity verified, stack scan 0 issues.

### CR-001 [Warning] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L290-L290

RunId allowlist enforced before filename derivation; traversal manifest rejected with no escape write (regression test observed).

### CR-002 [Warning] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L304-L304

Duplicate harness names rejected; one scored column per harness (regression test observed).

### CR-003 [Warning] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L299-L299

Duplicate judge check ids rejected at load; no double-count (regression test observed).

### CR-004 [Warning] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L312-L312

Manifest samples cross-checked against committed sample files when present; drifted file fails, matching files pass (regression test observed).

### CR-005 [Warning] closed benchmarks/comparisons/fixed-models-001/collect_sample.cjs:L94-L94

Run-dir marker (`prd.md`) required before any delete; plain dir refused with nothing created (regression test observed).

### CR-006 [Warning] closed benchmarks/comparisons/fixed-models-001/collect_sample.cjs:L144-L144

Engine reports vendored per sample; every manifest evidenceRef resolves to a committed path (regression test observed).

### CR-007 [Suggestion] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L75-L75

Canonical (sorted-key) equality; reordered settings pass (regression test observed).

### CR-008 [Suggestion] closed .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs:L266-L266

Evolution rows insert inside the section with EOL matching; row lands before trailing content; working file pure CRLF (regression test observed).

### Stack Invariant Compliance

- `scan_stack_invariants.cjs`: 0 issues on touched scripts.
- No new findings in round 2; no sibling occurrences.

Score: 10/10. No feedback beyond closures.

**Apply fixes?** No — review clean. Advance to Step 7.
