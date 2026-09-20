### [2026-09-20] Spec validator matches `- AC<n>:` bullets document-wide

- **Layer**: `Tests`
- **Module**: `spec-format`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-format/scripts/validate_spec.cjs, .agents/specs/*.spec.md`
- **Scenario / Context**: Authoring spec 0109, the `## Validation & Observation Notes` bullets were written as `- AC1: ...` to reference acceptance criteria. `validate_spec.cjs` collects AC rows with `/^- (AC([1-9][0-9]*)):\s*(.+)$/gm` over the whole document, so those bullets entered the AC sequence and produced `ac-sequence` errors (`Expected AC16, found AC1`) even though the `## Acceptance Criteria` list was sequential.
- **DO NOT**: start any non-AC bullet in a `*.spec.md` with `- AC<n>:` (for example in Validation, Notes, or Negative scenarios).
- **INSTEAD DO**: prefix the reference with context, e.g. `- State-write test (AC1) must fail if ...`, keeping the strict `- AC<n>:` shape exclusive to the `## Acceptance Criteria` section.
