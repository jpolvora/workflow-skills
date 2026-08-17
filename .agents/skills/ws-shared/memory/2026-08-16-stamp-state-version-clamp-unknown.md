### [2026-08-16] stamp_state_version must not keep unknown highs
- **Layer**: `Infrastructure`
- **Module**: `ws-spec-to-pr* / update_state.py stamp_state_version`
- **Severity**: `High`
- **Scenario / Context**: `stamp_state_version` used `max(current, _STATE_VERSION)`. A frontmatter `stateVersion: 7` stayed 7. `update_state.py` writes the file first, then runs `validate_state.py`, which rejects unknown versions. The unsupported value remains on disk; every retry re-stamps 7, so recovery needs a manual edit.
- **DO NOT**: Stamp `stateVersion` with `max(current, schema)` (that preserves values above the supported schema).
- **INSTEAD DO**: Always emit `_STATE_VERSION`. Clamp unknown highs so post-write validation can succeed. Keep `validate_state` reject-loud for on-disk missing/older/unknown until a writer rewrite.
