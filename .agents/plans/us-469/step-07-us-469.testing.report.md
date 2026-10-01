---
step: 7
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
acRefs: []
title: Testing report — ws-doctor path-error false-positive fix
startedAt: "2026-10-01T03:33:00Z"
endedAt: "2026-10-01T03:40:00Z"
---
# Testing report — us-469

**Test surface:** present (`test/**/*.js`; alias `backendTest` = `npm run test`).
**Mutation testing:** skipped (`defaults.skipMutationTesting: true`); regression sabotage supplied via
the Step 6b fault injections.

## Batteries

| Battery | Command | Result |
|---------|---------|--------|
| Focused unit/regression | `node test/test-ws-doctor.js` | all passed |
| Full suite | `npm run test` | 159/159 passed (`run-tests: all 159 entries passed`) |
| Integrity | `npm run verify-integrity` | `OK: bin/skill-integrity.json matches tree (v0.5.32)` |
| Scanner smoke | `node .agents/skills/ws-doctor/scripts/doctor.js --json` | `pathErrors: none`, exit 0 |

## New coverage (test/test-ws-doctor.js)

| Test | AC/NS | Assertion |
|------|-------|-----------|
| `testRootRelativeCitationResolvesAtProjectRoot` | AC1, AC7 | `.ws/config.json`, `.ws/STACK.md` not reported when present at project root |
| `testMarkdownLinkUsesHrefNotDisplayText` | AC2 | backticked display text skipped; href resolved |
| `testProseAndPlaceholdersSkipped` | AC3, NS3 | `2>/dev/null`, `~/x`, `{true/false}`, `path/to/…`, `IDE/agent` not reported |
| `testBraceFallbackToGlobalSkillsRoot` | AC4 | `{skillsRoot}` citation with `{globalSkillsRoot}` copy resolvable |
| `testOwnDirectoryCitationExpandsOnce` | AC5 | `.ws/` never expands to `.ws/.ws` |
| `testArchiveAndExampleTreesExcluded` | AC6 | `runs/pr-*` + `examples.md` excluded |
| `testBrokenRealPathStillReported` | NS1, NS2 | genuinely missing `.agents`/token paths still reported |

## Regression check

The existing ws-doctor smoke tests (report shape, `--json` single object, read-only, hybrid/global
resolution, strict skill-folder markdown links) all remain green — the strict `docs/faq.md`
file-relative behavior for markdown links is unchanged.

## Coverage

No coverage threshold configured for this change; the scanner branches added (root-relative prefixes,
`$PWD`, anchor strip, link-text skip, fenced ranges, prose guard, global fallback, archive exclusion)
are each exercised by at least one named test and one Step 6b fault injection.
