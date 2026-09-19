# Plan Interview — us-352 (Step 2, runInterview=true)

Interview mode: worker self-audit against the plan (no user gate available in
batch context; decisions below follow the spec's plan-owned rows).

## Q1: Section home — `ws-goal-fix-pr` vs `ws-fix-pr` vs shared `fixPr` section?

Options considered:
1. `ws-goal-fix-pr.useSubAgents` (issue verbatim) — chosen.
2. `ws-fix-pr.useSubAgents` (batch owner) — rejected: contradicts the issue JSON
   the spec quotes as contract, and the goal loop (not the single batch) owns
   the per-iteration dispatch the issue complains about.
3. Shared `fixPr.useSubAgents` — rejected: invents a new naming convention the
   issue does not propose; the issue explicitly seeds per-skill sections.

Finding: option 1, with `ws-fix-pr` and `ws-ship-pr` reading the same key via
one resolver. One key, single default, no mode skew. Matches spec Notes row 3
(forward-compatible per-skill-section pattern).

## Q2: Does the resolver need tri-state (absent vs false vs true)?

No. Absent and `false` behave identically (inline). Strict `=== true` check
covers both; any non-boolean fails closed to inline. No `null`/unset
distinction needed — boolean mode switch per spec Assumptions row 4.

## Q3: Section 6 Stack & Security Invariants check (touched framework boundaries)

Touched boundaries: config schema (validation surface), GUI editor (desktop
script, ASCII-only constraint), skill prose (agent behavior contracts).
No network, auth, storage, or CI surface changes. Stack file
(`.ws/STACK.md`) defines a Node skill package — this change adds one pure
resolver function and prose; no new runtime dependency, no migration, no
secret handling. `validate_json_schema.cjs` continues to accept existing
configs (new key optional; root `additionalProperties: true`).

## Q4: Blast radius on existing tests

- `test-goal-fix-pr-orchestrator-dispatch.js`: asserts verbatim readings —
  plan edits no existing paragraph, only appends a new section. Verified by
  running the test post-edit.
- `test-powershell-config-editor.js`: parity test only covers
  plans/reviews/preview/core-defaults — new section row is additive; Test 9
  requires bool rows not bind object/array nodes (`useSubAgents` is boolean —
  clean). Verified by running post-edit.
- `test-harness-clean.js` / `test-doc-sync.js`: README bullet is prose-only;
  no catalog inventory change, no site rebuild needed.

## Verdict: APPROVED — proceed to Step 3 (sequential exec plan)

Refined plan: same as `step-01-us-352.plan.md` (no amendments; interview
confirms section home and additive-only edits).
