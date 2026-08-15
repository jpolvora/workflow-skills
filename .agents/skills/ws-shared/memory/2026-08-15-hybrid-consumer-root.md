### [2026-08-15] Hybrid/global scripts must not resolve consumer ws-shared from __file__

- **Layer:** harness
- **Module:** ws-shared/scripts
- **Severity:** high
- **Scenario:** Global-only install (`$HOME/.agents/skills`) with consumer `ws-shared` under `$PWD`; scripts using `parents[4]` or sibling `ws-shared` next to `__file__` silently target the global hub.
- **Trap avoided:** `self_learning.py --compile` writing `$HOME/.agents/skills/ws-shared/MEMORY.md`; `validate_state` / `classify.cjs` reading global `dagThresholds` / `plans.dir`.
- **Solution:** Shared `resolve_consumer_root` (Python + JS): `--repo-root` → CWD hub probe → `parents[4]` only when script is not under `{globalSkillsRoot}`. Port all affected scripts; document skill-script expand rule in `tools.md`.
