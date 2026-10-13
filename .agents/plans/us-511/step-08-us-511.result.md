---
step: 8
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
shipStatus: pending
startedAt: "2026-10-13T04:25:00.000Z"
---
# Delivery Result — us-511

## Summary

Close the implementation gap between the canonical review-thread reader
(`ws-spec-provider-github/scripts/fetch_threads.cjs`) and its documented token contract:
resolve the GitHub token through `AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN`
→ `GH_TOKEN` → `gh auth token`, fail loudly with an actionable message when no source
yields a token, keep the credential secret, and keep the `ws-fix-pr` shim a shim.

## Product commit

- `dbd9a655397fe390e86ef2fc78454813e229c29b` — `fix(us-511): fall back to gh auth token in fetch_threads.cjs`
  - 8 files changed, 388 insertions(+), 16 deletions(-)

## Files

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | `resolveToken()` fallback + source + loud failure |
| `.agents/skills/ws-spec-provider-github/INTENTS.md` | `validate-auth` chain |
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` | token chain |
| `.agents/skills/ws-fix-pr/README.md` | auth cell |
| `test/test-fetch-threads-token-fallback.js` | new network-free module |
| `test/test-suites.json` | register module (local + remote) |
| `test/COVERAGE.md` | coverage note |
| `bin/skill-integrity.json` | regenerated |

## Verification

| Gate | Result |
|------|--------|
| `node test/test-fetch-threads-token-fallback.js` | exit 0 |
| `npm run test` | exit 0 — 166/166 |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| `npm run verify-integrity` | exit 0 (v0.5.46) |
| `node test/test-provider-parity.js` / `test-skills-runtime-resolution.js` | exit 0 |
| Fault injection (3 mutations) | each red, restored green |

## Review

`step-06-us-511.review.md` verdict **PASS** (no open findings);
`step-05b-us-511.fresh-verify.md` verdict **PASS** (fresh re-derivation + 3 injections).

## Release

- Version bump `0.5.45` → `0.5.46` (`build-site:bump`), site rebuilt, integrity regenerated.

## PR

- Branch: `develop` → **base:** `main`
- PR: _(recorded at ship; see state `shipStatus`/`prNumber`)_
