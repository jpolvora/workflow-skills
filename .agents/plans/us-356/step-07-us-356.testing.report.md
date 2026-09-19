# Testing Report — us-356

## Executed
- `node test/test-ws-monitor-us356.js` → ok (AC1–AC6 + stall signal).
- `node test/test-ws-monitor.js` → ok (no regressions).
- `node test/test-skill-frontmatter.js`, `node test/test-doc-sync.js` → ok.
- `node test/test-harness-clean.js` → only integrity-staleness finding (ship regenerates).

## Model/preset
current session model throughout (default preset). No browser testing (non-UI change). Mutation testing skipped per config (`skipMutationTesting: true`).
