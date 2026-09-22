### [2026-09-21] Host capability `--declare` requires capability tokens, not binding aliases

- **Layer**: `Domain`
- **Module**: `host-dispatch`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/probe_host_capabilities.cjs, .ws/host-capabilities.json, .agents/skills/ws-shared/runtime/host-tool-map.json`
- **Scenario / Context**: While enabling generic subagent dispatch for a Muse session, the planned command used `--declare subagentTool=subagent_spawn`. `parseDeclared` accepts only the seven capability tokens (`readFile`, `writeFile`, `editFile`, `shellExec`, `dispatchAgent`, `askQuestion`, `browserVerify`); the alias pair is silently dropped, so the binding falls back to the pre-map or minimal set. Separately, `--key muse::muse-spark-1.3-contributor` cannot infer a host shape because `muse` does not match `muse-spark-like` (neither equality, prefix, nor suffix), so an unknown-shape probe degrades `dispatchAgent` to `none` and the orchestrator silently executed every step as Tier 3 `inline:session` (0 subagents).
- **DO NOT**: Pass binding aliases (`subagentTool`, `askQuestionTool`) to `--declare`; assume the host-id segment of `--key` infers a pre-map shape when it does not equal the shape base name (`muse-spark`).
- **INSTEAD DO**: Declare capability tokens (`--declare dispatchAgent=subagent_spawn`) and pass `--host-shape muse-spark-like` explicitly when the host id does not match a shape name; then verify `.ws/host-capabilities.json` has `binding.subagentTool` set and `knownShape: true` for the session key.
