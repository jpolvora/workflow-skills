### [2026-08-22] CATALOG.md 24 KB context budget
- **Layer**: `Harness`
- **Module**: `CATALOG.md / test-context-budget.js`
- **Severity**: `Medium`
- **PathPattern**: `CATALOG.md, test/test-context-budget.js`
- **Scenario / Context**: A membership-count edit plus existing CRLF pushed LF-normalized `CATALOG.md` over 24000 B, so `npm run test` failed at `test-context-budget.js` after the rest of the suite was green.
- **DO NOT**: Grow CATALOG.md with long scope notes or duplicate `---` rules without measuring `utf8Size('CATALOG.md')` (CRLF stripped).
- **INSTEAD DO**: Keep the root catalog under 24000 B UTF-8 LF; prune the scope note or duplicate separators before `npm run tests:harness-efficiency`.
