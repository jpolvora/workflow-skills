### [2026-09-19] Node CLIs must normalize dashed flags to camelCase option keys
- **Layer**: `harness`
- **Module**: `probe scripts`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/*/scripts/*.cjs`
- **Scenario / Context**: `probe_host_capabilities.cjs` accepted `--host-shape` / `--probe-log` but matched raw flag strings against camelCase option keys, so both flags were silently ignored: the probe fell back to the generic shape and the probe log was never written. The new `test-host-capabilities.js` caught it (native-tool scenario failed, missing log file).
- **DO NOT**: Match raw `--flag-name` strings against camelCase option keys, or silently ignore unmatched CLI flags and continue with defaults.
- **INSTEAD DO**: Normalize dashed segments to camelCase during arg parsing (or fail loudly on unknown flags); cover every documented flag with an assertion that the parsed value took effect (shape-specific resolved value plus created log file).
