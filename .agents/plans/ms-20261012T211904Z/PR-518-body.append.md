## Summary

Closes the implementation gap between the canonical review-thread reader and its own documented token contract: `ws-spec-provider-github/scripts/fetch_threads.cjs` now resolves the GitHub token through **`AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` → `gh auth token`**, in that order. The CLI link is a strict last resort, the credential stays secret, the failure is loud and actionable, and the `ws-fix-pr` shim stays a shim.

Fixes #511.

## Problem

`resolveToken()` returned the first of three environment variables and nothing else, so a host with a healthy `gh auth status` and no exported token could not list review threads at all — even though `ws-spec-provider-github/SKILL.md` already documented the `gh auth token` fallback.

## Change

| Path | Change |
|------|--------|
| `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | `resolveToken()` gains the `gh auth token` fallback + selected-source; failure names `gh auth login` + the three variables; CLI source note on stderr |
| `.agents/skills/ws-spec-provider-github/INTENTS.md` | `validate-auth` documents the four-link chain |
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md`, `.agents/skills/ws-fix-pr/README.md` | token docs name the CLI fallback |
| `test/test-fetch-threads-token-fallback.js` | new network-free module (PATH `gh` stub + scrubbed env + `fetch` shim) |
| `test/test-suites.json`, `test/COVERAGE.md` | registration + coverage note |

Precedence, failure, security, and parity contract:

- An explicit environment token always wins; the subprocess is never spawned when any of the three variables is set.
- `gh auth token` captures stdout and discards stderr; the value is never printed, logged, or persisted.
- When no source yields a token the run exits non-zero **before** any API call, with a message naming `gh auth login` and the three variables — never the zero-thread success path.
- `ws-fix-pr/scripts/fetch_threads.cjs` is unchanged; it keeps forwarding stdio and the canonical exit status.
- The `--json` payload keys and the zero-thread message are unchanged.

## AC coverage

AC1–AC14 covered by `test/test-fetch-threads-token-fallback.js`; negative scenarios NS1–NS11 executed red-first. Fault injection (3 mutations) each turned the suite red.

## Verification

| Gate | Result |
|------|--------|
| `node test/test-fetch-threads-token-fallback.js` | exit 0 |
| `npm run test` | exit 0 — 166/166 entries |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| `npm run verify-integrity` | exit 0 (v0.5.46) |
| `node test/test-provider-parity.js`, `test/test-skills-runtime-resolution.js` | exit 0 |

## Release

Version `0.5.45` → `0.5.46` (site rebuilt, integrity regenerated). Node 22 CommonJS only; no new dependency; no Python.

### Foreign commits in range

Commits reachable from `9e4d0b0` but not produced by this batch (`6254938..9e4d0b0`):

- none detected
Recorded by `ws-spec-multi` run `ms-20261012T211904Z` (shared-head stay-on-develop) before merging PR #518.
