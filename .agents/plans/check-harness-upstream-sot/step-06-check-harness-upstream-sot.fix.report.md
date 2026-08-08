---
slug: check-harness-upstream-sot
step: 6
title: "Fix report — review round 1/3 (W1)"
fixDate: 2026-08-08
review: step-06-check-harness-upstream-sot.review.md
mode: fix
round: 1
status: completed
warning_fixed: [W1]
---

# Fix report — check-harness-upstream-sot (round 1/3)

**Banner:** `[AUTO] Finished step 6 fix round 1/3`

## Scope

Fixed **W1 only** (Critical=0). Suggestions S1–S3 left untouched per orch instruction.

## Changes

| Finding | File | Change |
|---------|------|--------|
| W1 | `src/skills/ws-check-harness/PHASES.md` | Phase 2 **File exists**: upstream install-path literal → SoT-id equivalence under `src/skills/ws-<id>/SKILL.md`; consumer unchanged |
| W1 | `src/skills/ws-check-harness/PHASES.md` | Phase 2 resolution rule for hub `.agents/skills/...` literals: existence via SoT-id when Install mode upstream |
| W1 | `src/skills/ws-check-harness/PHASES.md` | Phase 4c `phantom_routes[]`: existence = skills scan root id; dogfood-literal lag not critical when SoT present |
| W1 | `src/skills/ws-check-harness/PHASES.md` | § 3 Dogfood lag: cross-ref Phase 2 File exists + Phase 4c |
| W1 | `src/skills/ws-check-harness/SKILL.md` | Detection notes: one sentence on upstream hub install-path SoT-id equivalence |

## AC alignment

- **AC3:** Hub↔disk / phantom existence checks use SoT folders under `src/skills/ws-*` when Install mode is upstream.
- **AC4:** Missing/divergent `.agents/skills/ws-*` dogfood does not inflate broken-link / phantom critical/warning counts; informational note allowed; sync not required.

## Verification

- Docs-only contract change (`skills-sot`); no app build/test surface.
- Consumer Install mode behavior explicitly preserved in Phase 2 File exists + resolution rows.
- No dogfood mirror edits; no `npm run sync-skills` required.

## Not fixed (out of scope this round)

- S1, S2, S3 (optional per review; orch: W1 only)
