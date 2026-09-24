### [2026-09-24] build_dispatch_context.cjs repeatable flag is --path, not --paths

- **Layer**: `infrastructure`
- **Module**: `ws-spec-to-pr / build_dispatch_context.cjs`
- **Severity**: `Low`
- **PathPattern**: `.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs`
- **Scenario / Context**: While orchestrating us-412-413 Step 7, the memory-slice flag was passed as `--paths a --paths b`. The parser only treats `--ac` and `--path` as repeatable array flags, so `--paths` bound the next token as a string and the run aborted with `ERROR: paths.map is not a function`.
- **DO NOT**: Pass `--paths` to `build_dispatch_context.cjs`, or assume its help text documents every repeatable flag.
- **INSTEAD DO**: Pass one `--path <file>` per file (and one `--ac <id>` per AC); on an `x.map is not a function` error check the flag name against `parseArgs` in the script.

### [2026-09-24] Never leave unknown files under {us-dir}/.runtime — update_state validates residue fail-closed

- **Layer**: `infrastructure`
- **Module**: `ws-shared / workflow_state.cjs validateRuntime`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs; .agents/plans/*/.runtime/*`
- **Scenario / Context**: During us-412-413 Step 8 the orchestrator wrote `.runtime/step-7-dispatch-manifest.json` (a `--manifest` side output of `build_dispatch_context.cjs`). The next `update_state.cjs dispatch` failed with `ERROR: unknown .runtime residue: step-7-dispatch-manifest.json` because `validateRuntime` only allows names matching `RUNTIME_NAMES` (`plan.index.json`, `step(-\d+)?-output.json`, `verification-manifest.json`, `*.cjs|*.patch|*.md`, …).
- **DO NOT**: Persist arbitrary `.json` (or any unmatched name) under `{us-dir}/.runtime/`; every `dispatch`/`finish`/`validate_state` re-checks residue fail-closed.
- **INSTEAD DO**: Keep dispatch manifests outside `.runtime/` (or omit `--manifest`), name step payloads `step-{N}-output.json`, and delete any stray non-matching file under `.runtime/` before calling `update_state.cjs`.
