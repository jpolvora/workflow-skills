### [2026-08-27] Authoring fixtures must include DoR and Validation Notes

- **Layer:** harness
- **Module:** ws-spec-format / validate_spec.cjs
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-spec-format/scripts/validate_spec.cjs;test/test-spec-validation.js;test/test-validate-spec.js
- **Scenario / Context:** `--mode=authoring` now fails unless `## Definition of Ready (DoR)` has a non-placeholder table row and `## Validation & Observation Notes` has non-placeholder body. Compat still warns without failing. Existing authoring-pass fixtures that only had Out of Scope + Assumptions will fail.
- **DO NOT:** Treat leftover `--help` as a spec path. Treat header-only DoR tables or TBD-only Validation Notes as authoring PASS. Leave authoring fixtures without DoR/Notes after this change.
- **INSTEAD DO:** Print usage and exit 0 for `--help`/`-h`. Require DoR data rows plus non-placeholder Validation Notes in authoring mode. Extend authoring-pass fixtures (and any new spec) with both sections. Keep `--mode=compat` as the CLI default for historical specs.
