---
id: null
slug: deepseek-harness-improvements
title: "Implement DeepSeek Harness suggestions to improve workflow-skills"
source: local
specDate: 2026-08-15
---

# Implement DeepSeek Harness suggestions to improve workflow-skills

## Description

Adopt the highest-value operational practices observed in the DeepSeek Harness (DSH) checkout into this package: decision records with mandatory alternatives, versioned/reject-old state, revision-guarded goal loops with fail-closed blocking, first-class background jobs with kill/collect, loop-hygiene guards, keyless transcript snapshots, an effective-config dump, provider parity tests, and single-home-of-fact doc checks — adapted to this package's architecture (portable SKILL.md skills, installer CLI, config hub, orchestrator FSM) without copying DSH's plugin runtime.

## Acceptance Criteria

- AC1: A decision-note tree (docs/decisions/) exists with proposed|implemented|rejected lifecycle folders, path-encoded classes, and a gate-enforced in-file format requiring ## Problem, ## Decision/## Proposal, ## Alternatives considered, ## Consequences.
- AC2: Root AGENTS.md states non-trivial changes update an owning decision note in the same PR, and ws-check-harness enforces note format, status/lifecycle agreement, and cross-note links.
- AC3: Archived decision notes are frozen (append-only manifest), and the gate rejects edits to archived notes.
- AC4: state.yaml files carry a monotonic stateVersion; validate_state.py rejects unknown/older versions with exit code 1 and a clear message; a regression test covers the reject path.
- AC5: update_state.py no longer corrupts nested dicts (regression test from the [2026-08-13] update_state trap passes) and unions duplicate completedSteps ints with a stderr warning instead of last-wins.
- AC6: A documented + checked invariant: every step artifact a later step reads is reproducible from state plus the committed diff (ws-check-harness or ws-audit phase).
- AC7: ws-goal-loop updates are revision-guarded: a stale revision conflicts loudly and never silently overwrites.
- AC8: A blocked goal verdict is only allowed after >=3 consecutive rounds with the same concrete reason, and resume re-arms the objective (evals cover both).
- AC9: Orchestrator resume mechanically verifies the feature tip has non-zero unique commits vs base before re-implementing (regression test from the stale-orch-resume trap).
- AC10: Dispatched subagents in ws-implement-tasks / ws-multi-spec are registered as background jobs with list/kill semantics; orchestrators kill stale jobs and only wait when dependent.
- AC11: A repeat-tool guard flags identical consecutive tool calls (same command + args) as a loop symptom and stops with a report.
- AC12: Per-step timeouts bound dispatches and fix-pr heartbeat loops; evals/simulation cover both guards.
- AC13: Keyless transcript-snapshot replay tests cover step artifacts (step-06 review, step-01 plan, delivery HTML) recorded from real example runs; fixtures are cross-platform (LF, no absolute paths), and the suite runs without an API key.
- AC14: ws-doctor gains --dump-config printing the effective resolved config tree (project vs global overrides, path tokens expanded, source cited per key); test/test-ws-doctor.js asserts layer precedence.
- AC15: One provider-parity scenario runs against github / azure-devops / local spec providers asserting identical step-00 registration output; CI runs it.
- AC16: ws-check-harness verifies single-home-of-fact for path conventions/tokens between root AGENTS.md, ws-shared/AGENTS.md, and tools.md (drift is a gate failure).

## Notes

- Priority phasing: P1 state integrity (AC4-AC6) + goal/resume guards (AC7-AC9); P2 decision notes + one-home docs (AC1-AC3, AC16); P3 jobs/hygiene (AC10-AC12); P4 verification/DX (AC13-AC15).
- Out of scope: porting DSH's Cordis plugin runtime, session-log infrastructure, TUI/Web UI, i18n (zh) counterparts, and compatibility shims for old state formats.
- Every AC must map to >=1 plan step (step-01) and >=1 section 5 test case.
