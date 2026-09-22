---
slug: us-393
step: 2
workflowId: us-393-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:12:00Z"
endedAt: "2026-09-22T08:16:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8]
---

# Plan Interview — us-393

## Registry

| # | Question | Resolution | Impact |
|---|----------|------------|--------|
| 1 | Is the state writer a script we must change? | No — `STATE.md` is the agent-owned contract; no writer script exists. Fix is contract wording. | Scope stays docs + eval (matches spec Design Intent) |
| 2 | What is the row identity key? | `specPath`, fallback `slug`. `#` is positional and already collides. | AC1 keying |
| 3 | What happens on a would-be duplicate? | Fail closed: do not write, surface the conflict. Silent dedupe forbidden. | AC2 |
| 4 | Where does the item count come from? | Frozen `totalItems` written once at Phase 2. | AC3 |
| 5 | How is a phantom `pending` row on a `completed` run handled? | Treated as corrupt; surface and re-dispatch nothing. | AC5 |
| 6 | Does `updatedAt` need per-row and frontmatter? | Yes, both advance on every write. | AC6 |
| 7 | Does Phase 2 selection logic change? | No — selection semantics are correct; only the write path is hardened. | Out of scope |
| 8 | Is a script-owned writer introduced? | No — explicitly deferred. | Avoids scope creep |

## Refinements applied

- Added `totalItems` to the state frontmatter so the count has a single frozen source (stronger than prose "frozen").
- Placed the canonical invariant block in `STATE.md`; `SKILL.md` and `PROTOCOL.md` reference it to avoid duplicated wording.
- Extended Resume Policy with a completed-with-pending invalidation rule (AC5) instead of only a duplicate-index guard.

No open blockers.
