---
id: 103
slug: us-103
title: "check-harness Phase 4 heading still hardcodes root AGENTS.md (consumer hub drift)"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/103"
specDate: 2026-07-22
---

# Specification — check-harness Phase 4 heading still hardcodes root AGENTS.md (consumer hub drift)

**State:** open

## Description

## Summary

Follow-up to #101 (closed). Re-verified in consumer test repo **jskills** after `npx github:jpolvora/workflow-skills update` + full `check-harness` scan (2026-07-22).

**#101 fixes confirmed working:**
- `gabarito/README.md` — links to `shared/AGENTS.md` first; root `AGENTS.md` gated as upstream-only
- `08-ship-pr/PREPARE-CHECKLIST.md` — links to `shared/AGENTS.md#external-dependencies`
- `spec-to-pr/README.md` — project entry points at shared hub first
- `shared/AGENTS.md` — delivery checklist split into **Consumer Projects** vs **Upstream Maintainers**
- `configure-project/INTERVIEW.md` — harness-only heuristic suggests `check-workflows.py` when no app stack detected
- `check-workflows` deep validation: **PASS** (0 issues)
- Consumer harness: **0 broken hub links**, **0 unrouted skills**, **0 config placeholders** (post configure-project)

## Residual issue (this report)

`check-harness/SKILL.md` was **partially** updated for consumer hub resolution but still contains contradictory anchors:

| Location | Current text | Problem |
|----------|--------------|---------|
| Line ~51 (Out of scope) | `` [`AGENTS.md`](../../../AGENTS.md) `` | Implies root hub in consumer installs |
| Line ~365–367 (Phase 4 heading) | "Skills/rules not routed in `AGENTS.md`" + link to `` [`AGENTS.md`](../../../AGENTS.md) `` | Contradicts § Hub resolution and line ~142 |

Line ~142 correctly states:

> comparing against declared routing in the **resolved hub** (§ Hub resolution; `shared/AGENTS.md` in consumer mode)

But the Phase 4 section title and primary link still hardcode upstream root `AGENTS.md`, which can mislead agents executing Phase 4 in consumer repos.

## Proposed fix

1. Rename Phase 4 heading to **"Skills/rules not routed in the resolved hub"**.
2. Replace line ~367 link with `` [`shared/AGENTS.md`](../shared/AGENTS.md) `` (consumer default) and note root `AGENTS.md` only in upstream mode — mirror § Hub resolution table.
3. Update line ~51 out-of-scope routing link similarly (or "resolved hub per § Hub resolution").

## Severity

**Suggestion** — does not break workflows; `check-workflows` and pipeline FSM pass. Improves agent predictability when running `/check-harness` in consumer projects.

## Repro

```bash
# Consumer clone with workflows installed
rg -n 'Phase 4 — Skills/rules not routed in' .agents/skills/check-harness/SKILL.md
rg -n '\.\./\.\./\.\./AGENTS\.md' .agents/skills/check-harness/SKILL.md
```

**Test consumer:** jpolvora/jskills

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
