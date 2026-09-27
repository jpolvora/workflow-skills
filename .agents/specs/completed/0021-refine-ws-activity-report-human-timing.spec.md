---
id: null
slug: refine-ws-activity-report-human-timing
title: "Refine ws-activity-report human vs agent duration for invoice accuracy"
source: local
specDate: 2026-08-12
status: completed
---

# Specification — Refine ws-activity-report human vs agent duration for invoice accuracy

## Description

`ws-activity-report` currently under-reports billable human time relative to how long the agent actually runs. The existing formula treats agent execution intervals as **Agent Wait** (time the human is idle waiting), and bills only the residual human bursts. That is wrong for this workflow: while the agent (and subagents) are running, the human is still working — supervising the run, reviewing diffs/output, answering gates, and directing the next prompt.

**Required model**

1. Measure **Agent Running Total** = duration of agent/subagent execution intervals in the delivery window (tools, turns, automated implementation).
2. Measure **Human Total** (billable) so that **Human Total ≥ Agent Running Total** for every reported plan segment with a positive agent run. Agent-running time is included in human work as supervision / concurrent review, not subtracted from it.
3. Human Total may exceed Agent Running Total by additional exclusive human activity (prompt authoring, editing specs/plans/code, gating decisions outside agent turns).
4. Idle / AFK gaps (>30m with no human or agent activity) remain non-billable and are reported separately.
5. Invoice line items and the Invoice & Payment Summary must use **Human Total**, not wall clock alone and not a human figure that is less than Agent Running Total when agent time is positive.

Update `scripts/infer_human_timing.py`, [`references/TIMING.md`](.agents/skills/ws-activity-report/references/TIMING.md), [`references/OUTPUT.md`](.agents/skills/ws-activity-report/references/OUTPUT.md), and [`SKILL.md`](.agents/skills/ws-activity-report/SKILL.md) so agents emit both durations in the entry form, mandatory technical table, and invoice summary.

## Acceptance Criteria

- AC1: For any plan segment with `agentRunningSeconds > 0`, the inferred `humanSeconds` (billable Human Total) is **greater than or equal to** `agentRunningSeconds`.
- AC2: Agent execution intervals are classified as concurrent human supervision/review work that **counts toward Human Total**, not as exclusive non-billable "wait" that reduces Human Total below agent run duration.
- AC3: Exclusive human activity outside agent turns (prompting, editing specs/plans/code, gating/deciding) still adds to Human Total on top of agent-running supervision time.
- AC4: Idle / AFK gaps longer than 30 minutes remain excluded from Human Total and from Agent Running Total, and continue to appear as a separate Idle Gap field.
- AC5: Each timesheet entry shows both **Human Total** (billable) and **Agent Running Total** with formatted durations.
- AC6: The mandatory technical table includes columns for **Human Total** and **Agent Running Total** (rename or replace the current **Agent Wait** column so the label matches the new semantics).
- AC7: The Invoice & Payment Summary totals and per-US invoice line items use **Human Total** as billable hours, and also report the summed **Agent Running Total** for transparency.
- AC8: `infer_human_timing.py` JSON output exposes both `humanSeconds` / `humanFormatted` and `agentRunningSeconds` / `agentRunningFormatted` (or equivalently named fields) that satisfy AC1–AC4; deprecate or stop emitting a billable-reducing `agentWaitSeconds` semantic that made human < agent.
- AC9: TIMING.md documents the invariant `Human Total ≥ Agent Running Total` (when agent running > 0) and the supervision-during-agent model; OUTPUT.md and SKILL.md match the new field names and invoice rules.
- AC10: Existing wall-clock start/end discovery (`bootstrap_start.py`, end = max(thread comment, delivery commit)) is unchanged; only the human/agent duration inference and report presentation are refined.

## Notes

- Out of scope: changing civil-day clipping, plan discovery, short-title rules, SCM auth, or inventing times when telemetry is missing beyond the documented gaps/fallbacks already in TIMING.md.
- Out of scope: automatic currency/rate calculation; invoice remains duration-based line items.
- Rationale: invoice hours must reflect real human supervision cost during agent runs; showing both totals lets the human verify Agent Running Total against session reality while billing Human Total.
- Touch points: `.agents/skills/ws-activity-report/` (`SKILL.md`, `references/TIMING.md`, `references/OUTPUT.md`, `scripts/infer_human_timing.py`, evals if present).
