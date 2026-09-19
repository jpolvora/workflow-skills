### [2026-09-18] Piped test commands mask the real exit code

- **Layer:** tests
- **Module:** npm run test verification
- **Severity:** Medium
- **PathPattern:** test/**;package.json
- **Scenario / Context:** `npm run test 2>&1 | tail -n 15` reported exit 0 (tail's status) while the suite had actually failed mid-chain; the failure only surfaced on a rerun with the npm exit captured. Same class: any `unofficial-runner | head/tail/grep` success claim.
- **DO NOT:** Treat a piped test command's exit code as the suite verdict, or report green from tail/grep output alone.
- **INSTEAD DO:** Capture the producer status explicitly (`npm run test > /tmp/x.log 2>&1; echo NPM_EXIT=$?`) and grep the log for fail markers; quote NPM_EXIT in the report.
