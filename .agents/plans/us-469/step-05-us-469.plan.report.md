---
step: 5
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
acRefs: []
title: Check-implementation report — ws-doctor path-error false positives
startedAt: "2026-10-01T03:00:00Z"
endedAt: "2026-10-01T03:22:00Z"
---
# Check-implementation report — us-469

**Spec of record:** `.agents/plans/us-469/step-00-us-469.spec.md`
**Plan of record:** `.agents/plans/us-469/step-01-us-469.plan.md`
**Verification score:** 10 / 10 (boundary `pre-step6`, `ac_ledger.cjs verify`)

## Score summary

| Dimension | Result |
|-----------|--------|
| ACs Implemented | 7 / 7 |
| Negative scenarios covered | 3 / 3 |
| Linked files (sha256) | 1 (`doctor.js`) |
| Mapped observed tests | `test/test-ws-doctor.js` (exit 0) |
| Configured alias `backendTest` | `npm run test` exit 0 (159/159) |
| Known defect | false |
| Missing evidence | false |

## Evidence

- **AC1/AC5/AC7** — `doctor.js:L475-L536` (root-relative + `$PWD` + anchor-strip + project-root-first prose fallback) and `doctor.js:L728-L745` (`isRootRelativeCandidate`). Test `testRootRelativeCitationResolvesAtProjectRoot`.
- **AC2** — `doctor.js:L994-L998` (backtick display text skipped when the enclosing link href is path-like). Test `testMarkdownLinkUsesHrefNotDisplayText`.
- **AC3** — `doctor.js:L649-L726` (`fencedRanges` + `isProseOrPlaceholder`). Test `testProseAndPlaceholdersSkipped`.
- **AC4** — `doctor.js:L537-L547` (`{globalSkillsRoot}` fallback). Test `testBraceFallbackToGlobalSkillsRoot`.
- **AC5** — `doctor.js:L728-L745` (own-directory root-first). Test `testOwnDirectoryCitationExpandsOnce`.
- **AC6** — `doctor.js:L579-L606` (`runs/pr-*` + `examples.md` exclusion). Test `testArchiveAndExampleTreesExcluded`.
- **NS1/NS2** — `testBrokenRealPathStillReported` (broken `.agents/skills/ws-missing/SKILL.md` and `{skillsRoot}/ws-missing/scripts/nope.cjs` still reported).
- **NS3** — `testProseAndPlaceholdersSkipped`.

## Observed signals (before → after)

| Signal | Before | After |
|--------|--------|-------|
| Path errors (healthy install) | 205 | 0 |
| Missing references | 0 | 0 |
| Missing cited scripts | 5 | 0 |

Real broken references remain reportable (NS1/NS2). The scanner stays read-only; report shape unchanged.

## Commands

- `node test/test-ws-doctor.js` → all passed
- `npm run test` → all 159 entries passed
- `node .agents/skills/ws-doctor/scripts/doctor.js --json` → `pathErrors: none`
