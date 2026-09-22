---
superseded: true
supersededBy: step-02-us-393.plan.refined.md
slug: us-393
step: 1
workflowId: us-393-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:07:09Z"
endedAt: "2026-09-22T08:12:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8]
---

# Implementation Plan — us-393

## 1. Goal

Harden the `ws-spec-multi` run-state queue so a transition updates the existing row for a spec instead of appending a duplicate row. The fix is documentation-contract plus one eval: the state writer is agent-owned (`STATE.md`), so the invariant and the fail-closed guard are specified in the skill's instruction files and covered by an eval case.

## 2. Root cause

`STATE.md` defined the queue table with a positional `#` column but never stated that rows are keyed by spec identity or that transitions mutate in place. `PROTOCOL.md` Phase 4 said only "Mark state item `status: in_progress`", which an agent can satisfy by appending a fresh row. The reported item count was derived from the mutable table, so a duplicate row silently inflated `shipped/total`, and the stale `pending` row became selectable work (resume re-dispatch hazard).

## 3. Change set (files)

| File | Change | ACs |
|------|--------|-----|
| `.agents/skills/ws-spec-multi/STATE.md` | Add `totalItems` frontmatter field; add § Queue invariants (one-row-per-spec, mutate-in-place, frozen count, fail-closed duplicate guard, `updatedAt` advance); extend Resume Policy with duplicate-guard + completed-with-pending invalidation | AC1, AC2, AC3, AC4, AC5, AC6, AC7 |
| `.agents/skills/ws-spec-multi/SKILL.md` | Add invariant 7 (keyed, idempotent queue writes) | AC1, AC2, AC3, AC7 |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 1 queue-integrity on load; Phase 2 freeze `totalItems` + stable `#`; Phase 4 keyed in-place transition + guard + `updatedAt`; Phase 5 keyed update; Phase 6 assert one terminal row per spec | AC1, AC2, AC3, AC4, AC5, AC6 |
| `.agents/skills/ws-spec-multi/evals/evals.json` | Add eval id 3 (duplicate-row scenario) | AC8 |

No script, config-schema, GUI, provider, or storage change. `list_pending_specs.cjs` is untouched (Phase 2 selection semantics are out of scope).

## 4. Approach

Documentation-only contract hardening on the agent-owned writer. No new state store, no script writer (explicitly deferred by the spec).

- Primary key: `specPath`, fallback `slug`; `#` is display-only and assigned once.
- Duplicate guard is fail-closed: no duplicate `#`, no duplicate `slug`/`specPath`; on conflict, do not write, surface the conflict.
- Item count frozen at `totalItems` from the Phase 2 selection.
- `updatedAt` advances per-row and in run frontmatter on every write.
- A `completed` run with any `pending`/`in_progress` row is corrupt and re-dispatches nothing.

## 5. Verification plan

- `node bin/validate-evals.cjs` (schema for the new eval case)
- `npm run test`
- `node test/test-harness-clean.js` (0 findings)
- `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs`
- `npm run generate-integrity` + `npm run verify-integrity`
- `npm run build-site:bump` (version bump once for this release PR)

## 6. Stack & Security Invariants Verification Plan

| Boundary | Check |
|----------|-------|
| Node-only runtime | No `.py` added; no script touched |
| Harness portability | Wording uses path tokens (`{plansDir}`, `{specPath}`) and no host product names |
| Doc/site sync | No user-facing CLI/config change; `FEATURES.md`/README unaffected (internal skill contract) |
| Integrity | Hashed skill content changed → regenerate + verify integrity in the same commit |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Duplicate-guard wording duplicated across skill files triggers harness duplicate check | Keep the canonical statement in `STATE.md`; SKILL/PROTOCOL reference it |
| Eval schema rejects the new case | Guarded by `bin/validate-evals.cjs` before commit |
