---
slug: refine-ws-activity-report-human-timing
title: "Refine ws-activity-report human vs agent duration for invoice accuracy"
status: "approved"
---

## 0. Summary & Business Rules

Fix billable human time so **Human Total ≥ Agent Running Total**. Agent execution intervals count as concurrent human supervision (Reviewing/Deciding), not idle wait that shrinks invoice hours.

## 1. Definition of Ready & Scope

All AC1–AC10 from `step-00-*.spec.md`. Out of scope: bootstrap start/end discovery, civil-day clip, SCM auth.

## 2. Technical Design & Architecture

| File | Change |
|------|--------|
| `scripts/infer_human_timing.py` | Reclassify agent intervals; emit `agentRunningSeconds`; enforce human ≥ agent |
| `references/TIMING.md` | Document supervision invariant |
| `references/OUTPUT.md` | Human Total + Agent Running Total columns |
| `SKILL.md` | Align step 5–7 output field names |
| `test/test-infer-human-timing.js` | Assert AC1 invariant on synthetic timeline |

## 3. Step-by-Step Plan

1. Rewrite interval allocator: agent-active segments → `agentRunningSeconds` + Reviewing/Deciding (supervision).
2. Exclusive human segments → Editing / Prompting / Reviewing as today.
3. `humanSeconds = sum(breakdown)`; enforce `humanSeconds >= agentRunningSeconds` when agent > 0.
4. Update reference docs + SKILL.md labels (replace Agent Wait).
5. Add node test invoking script with temp plan dir fixture.

## 4. Permissions, Tenancy & i18n

N/A — harness skill script only.

## 5. Test Coverage

| AC | Test |
|----|------|
| AC1 | Script JSON: humanSeconds >= agentRunningSeconds when agent > 0 |
| AC8 | JSON exposes agentRunningSeconds, not billable-reducing agentWait |
| AC9 | TIMING/OUTPUT/SKILL label audit (manual + harness) |

## 6. Invariants (Do Not Violate)

Do not change `bootstrap_start.py` or wall-clock start/end rules (AC10).

## 7. Pre-PR Checklist

- [x] Layer boundaries respected.
- [x] Test covers AC1.
- [x] Docs aligned.

## 8. Open Questions

(none)
