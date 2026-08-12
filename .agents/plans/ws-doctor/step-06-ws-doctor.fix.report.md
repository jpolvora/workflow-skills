# Code Review Fix Report — ws-doctor

**Date:** 2026-08-12  
**Mode:** autoMode  
**Max rounds:** 3

## Round 1 / 3

`review-fix | round=1/3 | fixed=W1,W2 (+S1 partial) | remaining=0 critical, 0 warning`

| ID | Change |
|----|--------|
| W1 | `asciiSafe` maps em/en dash, arrows, ellipsis to ASCII before `?` strip; `formatMarkdown` launcher lines use ` - ` |
| W2 | `SKILL.md` documents Python `ast.parse` (UTF-8, no `.pyc`) instead of `py_compile` |
| S1 | `isTrivialCitation` skips single-segment dir examples and `repos/...` API fragments |

**Touched:** `.agents/skills/ws-doctor/scripts/doctor.js`, `.agents/skills/ws-doctor/SKILL.md`, `bin/skill-integrity.json` (regen)

**Verify:** `node test/test-ws-doctor.js` ✅ · `npm run verify-integrity` ✅

## Exit

Clean after round 1. No Pause.
