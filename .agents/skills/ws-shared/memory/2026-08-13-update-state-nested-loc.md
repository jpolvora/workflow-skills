### [2026-08-13] update_state nested telemetry.loc str() repr
- **Layer**: Infrastructure
- **Module**: ws-spec-to-pr / update_state.py
- **Severity**: High
- **Scenario / Context**: serialize_yaml nested mappings (telemetry.loc) went through format_val → str(dict) producing {'baseline': N}; next parse kept a string; next serialize quoted it
- **DO NOT**: Call format_val() / str() on nested dicts in serialize_yaml; do not treat last-wins duplicate completedSteps keys as success
- **INSTEAD DO**: Use format_inline_dict for nested maps; parse {…} via parse_inline_dict; union unique ints for duplicate completedSteps (stderr warn). Cover with test/test-update-state-yaml.js (--step 2 distinguishing case).
