### [2026-08-25] Retiring a skill must drop eval counts; doctor cites markdown link text
- **Layer**: `Harness`
- **Module**: `test-evals-schema / ws-doctor`
- **Severity**: `Medium`
- **PathPattern**: `test/test-evals-schema.js, .agents/skills/*/evals/evals.json, .agents/skills/ws-spec-to-pr/protocols/*.md`
- **Scenario / Context**: Removing `ws-patterns` deleted its `evals/evals.json`. `test-evals-schema.js` still expected `Validated 44 eval files`. Separately, `ws-doctor` reports `cited: docs/faq.md` from the markdown *label*, so a protocols file linking as `[docs/faq.md](../docs/faq.md)` fails `testLiveSpecToPrDocsFaqNotMissing`.
- **DO NOT**: Leave an absolute eval-file count in `test-evals-schema.js` after deleting a skill evals folder. Do not use backtick label `docs/faq.md` inside `protocols/` (doctor expands that label relative to the protocols directory).
- **INSTEAD DO**: Decrement the `Validated N eval files` assertion whenever an `evals/evals.json` is removed. From `protocols/`, use label `faq.md` (or other non-`docs/faq.md` text) with href `../docs/faq.md`.
