# Step 1 Plan — spec-organizer-status-subfolders (0135)

- workflowId: us-0135-20260926T153000Z
- slug: spec-organizer-status-subfolders
- spec: .agents/specs/0135-spec-organizer-status-subfolders.spec.md
- flowMode: standard (classifier: 9 steps / 31 files est; executed inline per batch stay-on-develop override)
- modelsPreset: muse

## Scope

1. `config.schema.json` plans + `config.json.example` plans: `statusSubfolders` bool default false (AC1)
2. `Edit-WorkflowSkillsConfig.ps1` plans page: `statusSubfolders` row (Test 8 binds all plans props)
3. `auto_configure.cjs`: `wantFallback('plans.statusSubfolders')`
4. `resolve_spec_path.cjs`: subfolder search (AC2), `--status` + pending default for new (AC3), global prefix scan (AC4), ambiguity exit 2 (Neg 1)
5. `organize_specs.cjs`: `--by-status` categorize+move incl. context+assets (AC5, AC6), index `spec:` rewrite to relative subfolder paths (AC7), `--slug/--status` single transition (AC8 agent flow), dirty fail-closed (AC9)
6. `track_index.cjs`: subfolder-aware findSpecFile + alreadyTracked + relative-path bullet
7. `ws-spec-organizer/SKILL.md`: document statusSubfolders, `--by-status`, `--status`, `--slug/--status`
8. `ws-spec-index/REFERENCE.md`: AC8 sync-moves-to-completed rule for the agent sync procedure
9. `test/test-spec-organizer.js` (new) + register in `test-suites.json`

## Status mapping (organize --by-status)

frontmatter `status:` exact (completed|archived|pending) → synonyms (done/delivered/shipped/closed→completed; cancelled/superseded/retired→archived; draft/todo/in-progress/active→pending) → frontmatter `issueState:` (closed→completed; open→pending) → index.PRD (Done-log row or Feature-map `[x]`→completed; Archive-table row→archived; else pending).

## Safety

- Two-phase rename, git mv tracked / fs.renameSync untracked, mkdir target first.
- Dirty-overlap guard before any mutation (sources + targets + index.PRD).
- Target-exists collision fails closed. No auto-migration of the live board (flat stays flat; this repo keeps statusSubfolders false).
- This repo's own board is NOT reorganized by this change (opt-in only).

## Verify (focused)

- `node test/test-spec-organizer.js`
- `node test/test-powershell-config-editor.js` (plans parity for the new key)
- authoring validate of 0135 spec
- `resolve_spec_path --slug <existing> --json` returns flat path (back-compat); `--status` smoke on temp copy only
