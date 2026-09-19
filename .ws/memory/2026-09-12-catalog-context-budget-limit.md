### [2026-09-12] Root CATALOG.md must stay under the 24000 B context budget

- **Layer**: `tests`
- **Module**: `CATALOG context budget`
- **Severity**: `Medium`
- **PathPattern**: `CATALOG.md; test/test-context-budget.js`
- **Scenario / Context**: A skill-capability description was lengthened in root `CATALOG.md` (e.g. adding `from-code genesis` to the `ws-wiki` rows). Normalized size moved from 23973 B to 24011 B, and CI `npm run test` failed at `test/test-context-budget.js:41` (`root CATALOG.md exceeds 24000 B`). `npm run verify-integrity` still passed because root `CATALOG.md` is not a hashed integrity input, so the regression only surfaced in the test suite.
- **DO NOT**: Add or expand root `CATALOG.md` prose without checking the CRLF-normalized byte size against the 24000 B cap; do not assume `npm run generate-integrity` covers CATALOG edits.
- **INSTEAD DO**: Keep CATALOG descriptions terse; after editing, verify `Buffer.byteLength(readFileSync('CATALOG.md','utf8').replace(/\r\n?/g,'\n'))` <= 24000 and run `node test/test-context-budget.js`. When trimming, preserve strings asserted by `test/test-wiki.js` (`first-time spec sweep`, `from-code genesis`, `Phase 2`+`verify`, `Phase 3`+`plan/apply`).
