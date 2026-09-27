---
slug: us-440
step: 8
status: completed
workflowId: us-440-20260927T162130Z
acRefs: []
startedAt: "2026-09-27T16:21:30Z"
endedAt: "2026-09-27T16:44:37.750Z"
---
# Delivery Result — us-440

## Summary

Adopted token-centered skill loading at the remaining in-session body-load sites across six shipped skill bodies, completing the `{skillLoader}` adoption that spec 0136 introduced.

## Timing

| Metric | Value |
|--------|-------|
| Started | 2026-09-27T16:21:30Z |
| Ship phase | 2026-09-27T16:4x |
| Total wall-clock | ~25 min |

## Changes

### Converted (in-scope, 6 files)
| File | Sites |
|------|-------|
| `.agents/skills/ws-task-lifecycle/SKILL.md` | invoke `ws-spec-write`; invoke `ws-spec-index`; load `ws-senior-developer`; invoke `ws-changelog` then `ws-self-learning` |
| `.agents/skills/ws-spec-manager/SKILL.md` | subcommand→target mapping; § Dispatch & Delegate |
| `.agents/skills/ws-spec-write/SKILL.md` | delegate to `ws-spec-provider-local` |
| `.agents/skills/ws-code-review/SKILL.md` | write via `ws-self-learning`; run `ws-fable-judge` |
| `.agents/skills/ws-ship-pr/SKILL.md` | `ws-fable-judge` row; security via `ws-secrets-leak-review` |
| `.agents/skills/ws-goal-fix-pr/SKILL.md` | wrap `ws-fix-pr` in `ws-goal-loop`; contract reference; `ws-goal-loop` helper citation |

Each line carries the token **and** the link to the canonical skill-load procedure in `{skillsRoot}/ws-shared/runtime/host-capability-tokens.md`, matching the shipped `ws-spec-list/ACTIONS.md` shape. No procedure text was restated.

### Exemptions (unchanged, with reasons)
- **`dispatch-agent` orchestration** (`ws-spec-to-pr/STEP-DISPATCH.md`, `ws-spec-to-pr-lite/SKILL.md`): *subagent loads its own body; `{skillLoader}` is the wrong token.*
- **Script-level delegation** (`ws-configure-project` → `ws-spec-memo` `.cjs`; `ws-ship-pr` → `ws-secrets-leak-review` hook in `PREPARE-CHECKLIST.md`; `ws-goal-fix-pr` → `ws-goal-loop` helper script): *no body read.*

### Version + projections
- `package.json` `0.5.4` → `0.5.5` (canonical `ws-shared/version.json`), with `packageVersion` synced in `bin/skill-dependencies.json` + `.agents/skills/ws-shared/runtime/skill-dependencies.json`; site footer + `test/package.json` tarball ref synced by `build-site:bump`.
- `bin/skill-integrity.json` regenerated (58 skills, v0.5.5).

### Docs / hub sync
- `docs/index.html` + wiki pages rebuilt; `ws-spec-index` `index.PRD` row 149 → `[x]` + Done-log row; wiki `harness/diagnostics-and-benchmarks.md` updated.

### Deferred (optional per spec Notes)
- `check_skill_load.cjs` bare-`Load`/`invoke` extension (AC11/AC12): a detector would match ~103 candidate lines across ~60 shipped docs, so an in-patch allowlist is unbounded. Deferred to a follow-up spec; the conditional ACs are satisfied by not extending.

## Verification

| Command | Exit |
|---------|------|
| `check_skill_load.cjs` | 0 (157 docs) |
| `check_duplicates.cjs` | 0 |
| `test-harness-clean.js` | 0 (0 findings) |
| `npm run test` | 0 (138/138) |
| `npm run generate-integrity` / `verify-integrity` | 0 / 0 |
| 10/10 Phase 5a gates | 0 |
| Verify score | 10/10 |

## Commits

| SHA | Step | Message |
|-----|------|---------|
| `7ee4dd57` | 5 | `feat(us-440): adopt token-centered skill loading at inline body-load sites` |

## PR

See `prUrl` in workflow state (Step 8 ship phase).

## scoreAndRefine

Not executed (verify score 10/10 on first pass).
