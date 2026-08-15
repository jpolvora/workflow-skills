# Delivery Result — us-211

**Workflow:** us-211-20260815T171820Z (lite)  
**Branch:** feature/us-211 → main  
**Status:** PR created (stopBeforeFixPr)

## Summary

Fixed hybrid/global install consumer-root resolution: shared `resolve_consumer_root` helpers ensure scripts read/write `$PWD/.agents/skills/ws-shared` instead of global-hub paths derived from `__file__`.

## Verification

| Check | Result |
|-------|--------|
| `npm run test` | exit 0 |
| `npm run generate-integrity && npm run verify-integrity` | exit 0 |
| `npm run build-site:bump` | patch bump applied |

## Commits

- `1b1997c` feat(us-211): verified implementation

## PR

Created via `gh pr create` (head feature/us-211, base main).

## Notes

- Classifier recommended standard; workflow overrode to lite per batch dispatch.
- Fix-PR / merge deferred to master (`stopBeforeFixPr: true`).
