---
slug: ws-spec-to-pr-distributed
step: 2
workflowId: ws-spec-to-pr-distributed
status: completed
startedAt: "2026-09-27T13:10:00.000Z"
endedAt: "2026-09-27T13:10:00.000Z"
acRefs: []
---
# Plan interview — ws-spec-to-pr-distributed

## 1. Scope audit

The plan bounds the change to the extraction of the distributed execution layer plus package, test, and doc sync. No protocol redesign (Out of Scope table in the spec matches). Section 3 tasks map 1:1 to AC1–AC17; §5 maps every AC/NS to a named check; §6 covers the touched boundaries (concurrency/child-process spawn, input validation, Node-only runtime, link integrity).

**Gap found (resolved below):** T05 says "record the shared `step_baton.cjs` edge via the distributed skill's dependency on the shared runtime (documented in the reference)". The dependency manifests track *skill ids*, not shared scripts, so the `step_baton.cjs` edge cannot be a manifest entry. Resolve by asserting the `require` path in the moved coordinator resolves to `{skillsRoot}/ws-shared/runtime/scripts/step_baton.cjs` and documenting the edge in the reference; the manifest edge is the new skill's registration only.

**Gap found (resolved below):** T01 referenced a `references/WORKER-TURN-RULES.md` copy. Duplicating canonical worker-turn text violates the single-source rule. Resolve by cross-linking the existing `../ws-spec-to-pr/WORKER-TURN-RULES.md` instead of copying.

**Gap found (resolved below):** `ws-check-workflows` currently simulates only `ws-spec-to-pr`, `ws-spec-to-pr-lite`, and `ws-spec-multi`. Adding a fourth simulation must not change the report contract for the existing three. Resolve by adding an isolated `simulateDistributedWorkflow()` that reads the distributed skill body for the FSM and reports under a new key.

## 2. AC / NS audit

| AC | Plan coverage | Verdict |
|----|---------------|---------|
| AC1 | T01, T05 | covered |
| AC2 | T02 | covered |
| AC3 | T04 | covered (byte-size assert) |
| AC4 | T03 | covered |
| AC5 | T05 | covered (reference-documented edge) |
| AC6 | T01 | covered |
| AC7 | T01, T02, T06 | covered |
| AC8 | T02, T06 | covered |
| AC9 | T04, T06 | covered |
| AC10 | T01, T08 | covered |
| AC11 | T06 | covered |
| AC12 | T09 | covered |
| AC13 | T07 | covered |
| AC14 | T08, T09 | covered |
| AC15 | T03, T08 | covered |
| AC16 | T05 | covered |
| AC17 | ship | covered |

NS1–NS6 each map to a named test row in §5.

## 3. Section 6 verification audit

- Concurrency/async safety: the moved coordinator keeps its claim/release/expiry logic; verification is the existing `test-step-coordinator.js` and `test-step-baton-claim.js` run against the new path. Adequate.
- Input validation: `step_baton.cjs` is unchanged; `test-step-baton-config.js` proves the named fail-fast codes. Adequate.
- Node-only runtime + link integrity: `test/test-harness-clean.js` and `ws-check-harness` cover both. Adequate.
- Integrity: `npm run verify-integrity`. Adequate.

No boundary is left without a named check.

## 4. Ambiguities resolved

1. **Manifest edge for a shared script** → document the `step_baton.cjs` `require` in the distributed reference; the manifest records the skill, not the script. (T05 wording refined.)
2. **Worker-turn rules duplication** → cross-link, do not copy. (T01 wording refined.)
3. **`ws-check-workflows` report contract** → additive simulation key; existing three simulations untouched. (T07 wording refined.)
4. **Byte-size assert for AC3** → capture the pre-edit size of `ws-spec-to-pr/SKILL.md` and assert the pointer version is strictly smaller; record both sizes in the Step 8 delivery result.
5. **Old-path references in historical specs** (`.agents/specs/completed/*`) remain as historical record; AC15 covers *live* references only.

## 5. Interview exit

`gap_registry` resolved (`assumed-default` + `confirmed` for items 1–5). No 2c escalation needed. Refined plan written to `step-02-ws-spec-to-pr-distributed.plan.refined.md`.
