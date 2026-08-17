### [2026-08-15] update_state model config: no state_path parents chain
- **Layer**: `Infrastructure`
- **Module**: `ws-spec-to-pr* / update_state.py resolve_phase_model`
- **Severity**: `Medium`
- **Scenario / Context**: `resolve_phase_model` tried to locate the consumer hub via `state_path.parent.parent.parent / "ws-shared"/"config.json"`. For state files under `{plansDir}/{slug}/…` that lands on `.agents` (`.agents/ws-shared/config.json`, missing `skills`) — never resolves; silently fell back to "unknown" outside repo-root cwd.
- **DO NOT**: Derive the consumer `ws-shared` path from `state_path` relative parents chains in update_state.py; do not restore cwd-only probes for config defaults.
- **INSTEAD DO**: Use `ws-shared/scripts/resolve_consumer_root` (`resolve_repo_root` + `shared_dir`) like `validate_state.py` does; keep the cwd/--repo-root/global-root precedence uniform. Unit-proof model resolution with a temp consumer cwd.
