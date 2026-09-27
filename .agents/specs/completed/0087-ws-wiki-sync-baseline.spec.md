---
id: null
slug: ws-wiki-sync-baseline
title: "ws-wiki Sync Baseline incremental watermark"
source: local
specDate: 2026-09-16
status: completed
---

# Specification — ws-wiki Sync Baseline incremental watermark

## Description

`ws-wiki` sweep re-reads every top-level spec of record on each run. After the living wiki is reconciled, most runs rescan unchanged specs, unchanged code, and unchanged pages. Full sweeps waste context, rewrite validated pages, and hide the delta under review.

This spec adds a `Sync Baseline` watermark to `index.wiki.md` recording the commit at which the wiki was last reconciled. Sweep runs bounded to that delta instead of every spec when the block is present and the SHA is reachable. Sync without a slug uses the same range for delta discovery. The watermark advances to the current full `HEAD` only after a run processes the complete range. Targeted flows leave the watermark unchanged. Dry-run never advances it. Init seeds the block when absent. Validate ignores the block.

## Acceptance Criteria

- AC1: Wiki index carries a Sync Baseline block with Commit and Synced fields.
- AC2: Sweep queues only specs added or changed in the baseline range when reachable.
- AC3: Sync without slug discovers the delta from the baseline range when reachable.
- AC4: Full sweep remains available when the block is missing or unreachable.
- AC5: Watermark advances to current HEAD only after complete range processing.
- AC6: Targeted sync and update flows leave the watermark unchanged.
- AC7: Dry-run mode never advances the watermark.
- AC8: Init seeds the baseline block when absent with exact names.
- AC9: Validate ignores the baseline block for link and heading checks.
- AC10: Test suite asserts baseline docs across skill companions.

## Notes

### Design Intent

Full-tree rescans were meant to keep the wiki complete. The observed harm is repeated reads of reconciled specs and noisy diffs after small merges. Product intent: bound routine updates to the recorded delta with `git diff --name-status` plus `git log --oneline`; fall back to full sweep or from-code genesis when history is rewritten, shallow, or dominated by restructure; advance the watermark only on complete success so partial runs never skip changes.

- Baseline SHA is the full 40-char HEAD at reconcile time; date is calendar day.
- Provenance and path patterns map changed product paths to affected pages.
- Language of skill bodies remains en-us.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-page timestamps or per-spec watermarks | Single index watermark is enough for delta scoping |
| Auto-advance on targeted single-page edits | Targeted flows are partial by definition |
| Remote fetch or history repair | Reachability is checked locally; unreachable falls back |
| Changing conditional page template or validator rules | Template ownership stays with existing wiki specs |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Delta listing commands | `git diff --name-status` plus `git log --oneline` from recorded SHA to HEAD | Both file set and commit narrative are needed for mapping | y |
| Fallback conditions | Missing block, unreachable SHA, repository-wide restructure, explicit full request | Bounded queue would miss content or mislead the gate | y |
| Restructure dominance | Operator judgment at start gate, not an automatic threshold | No reliable line-count heuristic across doc and code trees | y |
| Input validation / rate limits / data lifecycle / concurrency | N/A because this is a local git-range scoping contract with file writes, not a networked API | Only diff ranges, page writes, and test outcomes are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only wiki SKILL baseline section, sweep companion, sync companion, index block, validator pass-through, tests | Diff vs this spec ACs |
| Atomic criteria | AC1–AC10 each map to a named file and a grep or test check | Reviewer checklist |
| Failure modes | Bounded run reads full tree; watermark advances on partial run; dry-run mutates watermark | AC2, AC5, AC7 |
| Observation telemetry | Baseline block content; queue mode reported; validate exit code | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Node 22 test asserts only; no new prod runtime; deterministic git range handling; no secrets in wiki | Code review plus `npm run test` subset |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `index.wiki.md` contains `## Sync Baseline` with `Commit:` full SHA and `Synced:` date.
- Sweep start gate states baseline-bounded range or full mode.
- Sweep finish reports queue mode plus validate exit code.
- `node test/test-wiki.js` passes including baseline assertions across companions.
- `node bin/build-site.js` regenerates wiki HTML without drift.

### Negative & Failing Test Scenarios

- NS1: Bounded sweep re-reads unrelated specs outside the SHA range → **fail** AC2.
- NS2: Watermark advances after a cancelled or partial run → **fail** AC5.
- NS3: Dry-run writes pages or advances the watermark → **fail** AC7.
- NS4: Targeted sync advances the watermark after one page edit → **fail** AC6.
- NS5: Validate fails on the baseline block as a broken link or heading → **fail** AC9.
