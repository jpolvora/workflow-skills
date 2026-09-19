### [2026-08-27] Review jury payload bridge and memory sanitizer trap preservation

- **Layer**: `harness`
- **Module**: `ws-code-review / ws-self-learning`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-code-review/scripts/write_review_round.cjs;.agents/skills/ws-self-learning/scripts/sanitize_memory.cjs`
- **Scenario / Context**: Step 6 review jury required individual juror JSON files with `{ findings: [{ id, severity, path, line }] }` but `write_review_round.cjs` only wrote markdown. `sanitize_memory.cjs` was filtering lines matching injection patterns, stripping legitimate `DO NOT` lines in anti-injection traps.
- **DO NOT**: Omit machine-readable JSON bridges when multi-reviewer union scripts require structured inputs. Strip entire lines containing injection phrases from formatted markdown memory traps.
- **INSTEAD DO**: Provide `--jury-out` in `write_review_round.cjs` to emit structured findings JSON for `merge_review_jury.cjs`. Reject injection-only files while preserving legitimate memory bodies intact.
