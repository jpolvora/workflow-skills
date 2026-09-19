### [2026-09-13] Benchmark comparison tables skip Generated-only rewrites

- **Layer**: Tests
- **Module**: ws-benchmarks / benchmarks_manager.cjs
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs`;`benchmarks/results/**`
- **Scenario / Context**: `--update-comparison` rewrote every `table-<version>.md` because each file embeds `**Generated:** {now}`, dirtying git even when scores were unchanged.
- **DO NOT**: `writeFileSync` all per-version tables on every comparison refresh, or treat a new Generated timestamp as a content change.
- **INSTEAD DO**: Compare table bodies with the Generated line stripped; write only when scores/rows changed; leave older version tables and their stamps untouched.
