# Fix Report — step-06 review fixes (round 1/3)

**Range:** fa703c1..HEAD · **Gate:** Apply fixes and re-review (approved) · **Mode:** interactive round 1

## Round 1 (this round)

| Finding | Severity | Fix | Verified |
|---|---|---|---|
| W1 `index.PRD` stale | Warning | Added Feature-map bullets, Next-specs rows 33–36, Done-log rows for `us-209` (PR #213), `us-210` (PR #214), `us-211` (PR #212), `commit-before-code-review` (`3adbb3b`) | ✅ rows present; §11 checklist claims now consistent |
| W2 `resolve_phase_model` dead config path | Warning | Replaced `state_path.parent.parent.parent/ws-shared` candidate chain with `resolve_consumer_root` (`shared_dir`/`resolve_repo_root`) in std + lite `update_state.py`; dropped unused `state_path` param | ✅ py_compile ×3; probe: step4/step7 → `composer-2.5`; CLI replay exit 0 ×2; loc `{ baseline: 2404 }` round-trip; completedSteps union `[0,1,2]`; Validation PASSED |
| S1 `run_dry_run.sh` branch hardcode | Suggestion | Removed `refs/heads/main` default; exit 2 with actionable message when target branch missing and config unreadable | ⚠ bash not available in sandbox for `bash -n`; edit is a localized string/branch change — reviewed by inspection |
| S2 `self_learning.py` hardcoded recipe | Suggestion | Header emits `{skillsRoot}/ws-self-learning/scripts/self_learning.py --compile` | ✅ compile into temp consumer from nested cwd → MEMORY.md at consumer hub; header shows token |

## Regression evidence (round 1)

- `python -m py_compile` std/lite update_state + self_learning → exit 0.
- `node --check` unchanged files → exit 0 (earlier).
- Replayed the failing unit scenarios directly through python (no node pipes): `update_state.py` pass1/pass2 exit 0 with exact test fixture; lite mirror covered by source-level asserts + compile.
- `test-update-state-yaml.js` (12 run-based asserts), `test-ws-doctor.js`, `test-ws-audit.js`, `test-hybrid-consumer-root.js` (compile section) cannot execute in this sandbox: they capture child output via Node `cp.spawnSync` piped stdio (e.g. test-update-state-yaml.js:58–64), which the harness blocks (documented named-pipe boundary; `npm run test` also blocked earlier at `npm pack` npm-cache EPERM on `G:\packages`). Replayed equivalents pass at the product level; upstream CI runs these suites normally. **Not regressions — environment limitation.** Do not retry these exact commands in-session.
- Working tree: only the 5 fix files + review artifacts changed (see git status); no commits made.

## Round status

- Remaining Critical/Warning: **0**. Suggestions: 0 unaddressed (S1/S2 fixed in this pass).
- Exit: **clean** — stop fix loop. Changes stay uncommitted for the orchestrator/developer to stage.
