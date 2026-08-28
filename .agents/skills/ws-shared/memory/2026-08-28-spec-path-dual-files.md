### [2026-08-28] Spec resolver must fail closed when prefixed and unprefixed files both exist

- **Layer**: Harness
- **Module**: ws-spec-organizer / resolve_spec_path
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs;test/test-spec-prefix-ordering.js
- **Scenario / Context**: When both `{slug}.spec.md` and `NNNN-{slug}.spec.md` exist, last-wins readdir made the spec of record filesystem-order dependent. Partial migrations then wrote the wrong file.
- **DO NOT**: Overwrite `existingSpecFile` on every match, or pick last readdir hit when both shapes exist.
- **INSTEAD DO**: Detect prefixed and unprefixed hits separately and throw `Ambiguous spec of record` so callers fail closed until one file remains.
