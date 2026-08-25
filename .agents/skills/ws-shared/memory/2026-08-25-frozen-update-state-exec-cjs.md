### [2026-08-25] Frozen update_state.py execs Node dispatch/finish
- **Layer**: Infrastructure
- **Module**: ws-spec-to-pr* / update_state.py
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-to-pr/scripts/update_state.py, .agents/skills/ws-spec-to-pr-lite/scripts/update_state.py, test/test-update-state-yaml.js, test/test-quality-gates.js
- **Scenario / Context**: Python twins reimplemented `--step`/`--elapsed`/`--pre-advance` and drifted from `workflow_state.cjs`. Tests that spawned Python against this repo also wrote `plans/index.json` here.
- **DO NOT**: Reimplement dispatch/finish/bypass or `--pre-advance` in Python. Do not pass `--elapsed`. Do not accept a bare `--pre-advance` flag. Do not run update_state without `--repo-root` pointing at a temp consumer.
- **INSTEAD DO**: Keep `.py` as exec-wrappers of sibling `.cjs`. Canonical CLI is `dispatch` / `finish` / `bypass`. Seed a temp hub `config.json` and pass `--repo-root`. Reject `--elapsed` and require `--pre-advance N`.
