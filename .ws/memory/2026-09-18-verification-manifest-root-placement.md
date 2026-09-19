### [2026-09-18] verification-manifest belongs at us-dir root, never .runtime

- **Layer:** infrastructure
- **Module:** ws-spec-to-pr / Step 8 close
- **Severity:** Medium
- **PathPattern:** .agents/plans/*/.runtime/*;.agents/plans/*/verification-manifest.json
- **Scenario / Context:** STEP-DISPATCH says to write `.runtime/verification-manifest.json`, but `validateRuntime` (RUNTIME_NAMES allowlist) rejects that name, so `finish` and `--pre-advance` fail with `unknown .runtime residue` after the manifest exists. Prior shipped runs keep `verification-manifest.json` at the us-dir root, where no allowlist applies.
- **DO NOT:** Write `verification-manifest.json` under `{us-dir}/.runtime/` (or any non-allowlisted name there) — every later finish/validate fails until it moves.
- **INSTEAD DO:** Write the manifest at `{us-dir}/verification-manifest.json` (us-347 precedent); pass that path as the manifest pointer to Steps 5/6/7 instead of the `.runtime/` path.
