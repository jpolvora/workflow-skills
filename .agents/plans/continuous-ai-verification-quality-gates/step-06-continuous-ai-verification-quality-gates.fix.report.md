---
slug: continuous-ai-verification-quality-gates
round: 1
maxRounds: 3
fixDate: 2026-07-28
status: fixed
fixed: [C1, W1, W2, W3]
---

# Fix Report — Step 6 round 1/3

## Summary

Cleared review Critical C1 and Warnings W1–W3 for continuous-ai-verification-quality-gates.

## Fixes

### C1 — dry-run soft-pass for missing checkpoint tags
- `verify_checkpoint_tag` (standard + lite) treats missing/unreachable tags as **warnings** when `dryRun: true`; hard-fail otherwise.
- `validate_pre_advance` / lite `run_pre_advance_checks` thread `dryRun` into the tag check.
- `STEP-DISPATCH.md` notes pre-advance soft-pass when `dryRun: true`.
- Test: `testCheckpointDryRunSoftPass` (missing tag + present artifacts → exit 0 + soft-pass warning).

### W1 — typed `gate-bypass` JSONL + aggregate count
- Standard + lite `update_state.py`: when `--bypassed` and `--jsonl-out`, also append  
  `{type:"gate-bypass", gate:"quality-gates", reason:"skip-gates", timestamp, step}`.
- Aggregate: counts typed `gate-bypass` **and** step records with `bypassed:true`, deduped by `timestamp|step`.
- Test extended: typed event present + `gateBypassCount === 1`.

### W2 — no double-count of scores/verdicts
- Aggregate parser now reads nested `telemetry.steps` from state.md.
- When state already contributed scores/verdicts for a workflow dir, JSONL skips those fields (still ingests bypass/errors).
- Test: same score in state + JSONL → `averageVerificationScore` / verdict histogram count once.

### W3 — tests do not tag the real worktree
- Checkpoint tests use `mkdtemp` + `git init` and `GIT_DIR` / `GIT_WORK_TREE` so `uswf/*` tags never touch the package repo.

## Verification

| Check | Result |
|-------|--------|
| `python -m py_compile` on touched `.py` | OK |
| `node --check` on touched `.cjs` / `.js` | OK |
| `node test/test-quality-gates.js` | All quality-gates tests passed |

## Files touched

- `.agents/skills/ws-spec-to-pr/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py`
- `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
- `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`
- `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- `bin/generate-telemetry-aggregate.cjs`
- `test/test-quality-gates.js`
- `.agents/skills/ws-self-learning/scripts/self_learning.py` (SHARED_DIR → `ws-shared`)
- `.agents/plans/continuous-ai-verification-quality-gates/step-06-continuous-ai-verification-quality-gates.fix.report.md`

## Out of scope (suggestions)

- S1 — wire suite into `npm test` (not required this round)
- S2 — integrity regenerate (Step 8)
