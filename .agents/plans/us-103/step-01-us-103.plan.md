# Implementation Plan — check-harness Phase 4 heading still hardcodes root AGENTS.md (consumer hub drift)

## Problem Summary
Issue #103 reports that `.agents/skills/check-harness/SKILL.md` hardcodes links to root `AGENTS.md` in line ~51 and lines ~365-367 (Phase 4 heading), contradicting § Hub resolution which specifies `shared/AGENTS.md` in consumer mode.

## Proposed Changes
1. Modify `.agents/skills/check-harness/SKILL.md`:
   - Out of scope section (line ~51): update link from `[`AGENTS.md`](../../../AGENTS.md)` to `[`shared/AGENTS.md`](../shared/AGENTS.md)`.
   - Phase 4 heading (line ~365): Rename heading from `### Phase 4 — Skills/rules not routed in `AGENTS.md`` to `### Phase 4 — Skills/rules not routed in the resolved hub`.
   - Phase 4 link (line ~367): Update link from `[`AGENTS.md`](../../../AGENTS.md)` to `[`shared/AGENTS.md`](../shared/AGENTS.md)` (consumer default) and clarify upstream root `AGENTS.md` only in upstream mode.

## Implementation Tasks
- Task 1: Update `.agents/skills/check-harness/SKILL.md` lines ~51, ~365, ~367 with resolved hub references.

## Verification
- Run `npm run tests -- --local`.
