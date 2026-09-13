### [2026-09-13] Assert every sibling row a multi-row docs change touches

- **Layer**: `harness`
- **Module**: `test-doc-sync / mirror-link guard`
- **Severity**: `Medium`
- **PathPattern**: `test/test-doc-sync.js; .agents/skills/ws-shared/autoload.md`
- **Scenario / Context**: A mirror sync changed 4 sibling link rows but the new regression guard asserted only 3; CI review posted a thread (score 6/10) showing a revert of the fourth row would stay green. Fixed in the fix-pr round by extending both loops.
- **DO NOT**: Ship a regression guard that covers a subset of the sibling rows changed in the same diff.
- **INSTEAD DO**: Count the changed sibling rows in the diff and assert each one (absence of the bare form plus existence of the target); red-prove at least one row by revert-then-run.
