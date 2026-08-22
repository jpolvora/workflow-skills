### [2026-08-22] Authoring Assumptions table needs a data row
- **Layer**: `Harness`
- **Module**: `ws-spec-format / validate_spec.cjs`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-spec-format/scripts/validate_spec.cjs, test/test-spec-validation.js, .agents/skills/ws-spec-format/FORMAT.md`
- **Scenario / Context**: `--mode=authoring` already rejected an empty Out of Scope table but accepted a header-only Assumptions table
- **DO NOT**: Treat a heading plus header row as closure when Chosen default / Rationale rows are absent
- **INSTEAD DO**: Fail authoring (and warn in compat) when Assumptions has zero data rows; cover it in `test-spec-validation.js`
