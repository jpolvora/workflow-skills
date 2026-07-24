---
us: skill-install-checksums
fixDate: 2026-07-20
sourceReview: step-06-skill-install-checksums.review.md
---

# Step 6 fix report — skill-install-checksums

## Findings addressed

| ID | Severity | Status | Change |
|----|----------|--------|--------|
| W1 | Warning | Fixed | `postVerifyAndWriteLocal` writes `skill-integrity-local.json` only on verify OK or `--force-integrity`; fail-closed exit no longer blesses actual digests |
| W2 | Warning | Fixed | Removed absolute-path `memory` segment skips in `enumerateSkillFiles`, `copyDirSync`, `copyDirPreservingConfig` |
| S1 | Suggestion | Fixed | Simplified `printIntegrityMismatches` |

## Files touched

- `bin/cli.js`
- `bin/skill-integrity-lib.js`
- `test/test-install.js` (Phase 11: post-verify fail must not rewrite local record)

## Verification

| Check | Result |
|-------|--------|
| `node --check` on cli / lib | OK |
| `node bin/generate-skill-integrity.js --check` | OK (v0.0.63; digests unchanged) |
| `npm run tests -- --local` | PASS (incl. new Phase 11 assert) |

## Re-review

No Critical/Warning remaining in integrity scope after fixes.
