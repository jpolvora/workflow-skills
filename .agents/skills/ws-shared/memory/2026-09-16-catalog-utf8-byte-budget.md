### [2026-09-16] CATALOG.md has a hard normalized 24 KB budget

- **Layer:** harness
- **Module:** upstream docs / context budget
- **Severity:** Medium
- **PathPattern:** `CATALOG.md`;`test/test-context-budget.js`;`bin/build-site.js`
- **Scenario / Context:** Adding a release-proof pointer to the Before-ship table pushed `CATALOG.md` over the 24000-byte limit enforced by `test/test-context-budget.js` (`utf8Size` normalizes CRLF to LF). The committed file had only ~6 bytes of headroom, so any net addition fails until wording is reclaimed elsewhere.
- **DO NOT:** Add net bytes to `CATALOG.md` (or other budgeted docs) without measuring the normalized size first.
- **INSTEAD DO:** Measure with `Buffer.byteLength(text.replace(/\r\n?/g, '\n'))` before and after; keep additions compact and offset them by tightening adjacent redundant wording; run `node test/test-context-budget.js` before ship.
